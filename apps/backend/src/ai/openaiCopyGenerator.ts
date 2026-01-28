import OpenAI from 'openai';
import type { CopyGeneratorProvider, CopyGenerationResult } from '../providers/contracts';
import { buildClientKnowledgeBlock } from './knowledgePrompt';

export class OpenAICopyGenerator implements CopyGeneratorProvider {
  name = 'openai_copy_generator';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async health() {
    return { ok: !!process.env.OPENAI_API_KEY };
  }

  async generateCopies(params: any): Promise<CopyGenerationResult> {
    const { client, knowledge, platform, format, objective, theme, max_variations, context_pack } = params;
    const knowledgeBlock = buildClientKnowledgeBlock(knowledge);
    const forbiddenClaims = knowledge?.compliance?.forbidden_claims ?? [];
    const mustMentions = knowledge?.must_mentions ?? [];
    const approvedTerms = knowledge?.approved_terms ?? [];

    const systemPrompt = `Voce e um redator publicitario senior de social media. Gere copies especificas para ${platform}/${format}.`;
    const prompt = `
CLIENTE: ${client.name}
SEGMENTO: ${client.segment_primary}
OBJETIVO: ${objective}
TEMA: ${theme}
TOM: ${knowledge?.tone?.description ?? 'equilibrado'}

${knowledgeBlock ? `${knowledgeBlock}\n` : ''}

FONTES (use quando fizer sentido, nao invente):
${context_pack || 'Sem fontes adicionais.'}

REGRAS:
- Gere ${max_variations} variacoes.
- Cada variacao deve ter: headline, body, cta.
- Linguagem adequada a plataforma.
- Evite promessas enganosas. Seja claro.
${mustMentions.length ? `- Inclua: ${mustMentions.join(', ')}.` : ''}
${approvedTerms.length ? `- Priorize termos aprovados: ${approvedTerms.join(', ')}.` : ''}
${forbiddenClaims.length ? `- Evite claims proibidos: ${forbiddenClaims.join('; ')}.` : ''}

SAIDA: JSON array no formato:
[{ "format":"...", "headline":"...", "body":"...", "cta":"...", "tags":["..."] }]
`;

    const res = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    });

    const text = res.choices[0]?.message?.content ?? '[]';
    let candidates: any[] = [];
    try {
      candidates = JSON.parse(text);
    } catch {
      candidates = [];
    }

    return { candidates, raw: { text } };
  }
}
