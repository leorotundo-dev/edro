import { env } from '../env';
import { generateCopy, type CopyProvider } from '../services/ai/copyService';
import type { ClientKnowledge } from '../providers/contracts';
import { buildClientKnowledgeBlock } from '../ai/knowledgePrompt';
import type { AnalyzedMention, RawMention, Sentiment, SentimentAnalysisResult } from './types';

const PROVIDER_ORDER: CopyProvider[] = ['claude', 'gemini', 'openai'];

const POSITIVE_WORDS = [
  'bom',
  'boa',
  'otimo',
  'otima',
  'excelente',
  'incrivel',
  'perfeito',
  'perfeita',
  'adoro',
  'amei',
  'maravilhoso',
  'top',
  'recomendo',
  'feliz',
];

const NEGATIVE_WORDS = [
  'ruim',
  'pessimo',
  'horrivel',
  'odeio',
  'triste',
  'lixo',
  'problema',
  'reclamacao',
  'nao recomendo',
  'terrivel',
  'frustrante',
  'decepcionante',
];

function buildPrompt(text: string, knowledge?: ClientKnowledge | null) {
  const knowledgeBlock = buildClientKnowledgeBlock(knowledge);
  const lines = [
    'Voce e um analisador de sentimento especializado em redes sociais brasileiras.',
    'Retorne APENAS JSON valido, sem markdown, seguindo o schema:',
    '{',
    '  "sentiment": "positive|negative|neutral",',
    '  "score": 0,',
    '  "keywords": ["palavra"],',
    '  "confidence": 0.0',
    '}',
    '',
    'Regras:',
    '- score 0-100 (0 muito negativo, 50 neutro, 100 muito positivo).',
    '- keywords: ate 5 palavras-chave relevantes.',
    '- confidence 0-1.',
  ];

  if (knowledgeBlock) {
    lines.push(
      '',
      'CONTEXTO DO CLIENTE (use para identificar termos relevantes e calibrar o sentimento):',
      knowledgeBlock,
      'Se o texto mencionar termos do cliente, inclua-os nas keywords.'
    );
  }

  lines.push(
    '',
    'TEXTO:',
    text,
  );

  return lines.join('\n');
}

function normalizeSentiment(value: any): Sentiment {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'positive') return 'positive';
  if (normalized === 'negative') return 'negative';
  return 'neutral';
}

function parseJsonFromText(text: string): any {
  const trimmed = text.trim().replace(/```json/gi, '```').replace(/```/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('invalid_json');
  }
}

function extractKeywordsFallback(text: string): string[] {
  const commonWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'sob',
    'e', 'ou', 'mas', 'que', 'se', 'eh', 'e', 'foi', 'ser', 'estar',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u00c0-\u017f]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word));

  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function fallbackAnalysis(text: string): SentimentAnalysisResult {
  const normalized = text.toLowerCase();
  const positive = POSITIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const negative = NEGATIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const delta = positive - negative;
  const score = Math.max(0, Math.min(100, 50 + delta * 10));
  const sentiment: Sentiment = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';

  return {
    sentiment,
    score,
    keywords: extractKeywordsFallback(text),
    confidence: 0.2,
  };
}

function availableProviders(): CopyProvider[] {
  const keys = {
    openai: !!env.OPENAI_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    claude: !!env.CLAUDE_API_KEY,
  };

  return PROVIDER_ORDER.filter((provider) => keys[provider]);
}

export class SentimentAnalyzer {
  async analyzeMention(
    mention: RawMention,
    context?: { knowledge?: ClientKnowledge | null }
  ): Promise<AnalyzedMention> {
    const analysis = await this.analyzeSentiment(mention.content, context?.knowledge);
    return {
      ...mention,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.score,
      keywords: analysis.keywords,
    };
  }

  async analyzeBatch(
    mentions: RawMention[],
    context?: { knowledge?: ClientKnowledge | null }
  ): Promise<AnalyzedMention[]> {
    const analyzed: AnalyzedMention[] = [];
    const batchSize = 10;
    for (let i = 0; i < mentions.length; i += batchSize) {
      const batch = mentions.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((mention) => this.analyzeMention(mention, context)));
      analyzed.push(...results);
    }
    return analyzed;
  }

  private async analyzeSentiment(
    text: string,
    knowledge?: ClientKnowledge | null
  ): Promise<SentimentAnalysisResult> {
    const providers = availableProviders();
    const prompt = buildPrompt(text, knowledge);

    for (const provider of providers) {
      try {
        const result = await generateCopy({
          prompt,
          forceProvider: provider,
          taskType: 'validation',
          temperature: 0.2,
          maxTokens: 400,
        });

        const parsed = parseJsonFromText(result.output);
        return {
          sentiment: normalizeSentiment(parsed.sentiment),
          score: Math.max(0, Math.min(100, Number(parsed.score ?? 50))),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5).map(String) : [],
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
        };
      } catch (error) {
        continue;
      }
    }

    return fallbackAnalysis(text);
  }
}
