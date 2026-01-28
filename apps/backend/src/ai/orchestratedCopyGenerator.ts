import type { CopyGeneratorProvider, CopyGenerationResult } from '../providers/contracts';
import { generateCopy } from '../services/ai/copyService';
import { buildClientKnowledgeBlock } from './knowledgePrompt';

function parseJsonArray(text: string) {
  const trimmed = text.trim().replace(/```json/gi, '```').replace(/```/g, '');
  try {
    return JSON.parse(trimmed) as any[];
  } catch {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as any[];
    }
    return [];
  }
}

export class OrchestratedCopyGenerator implements CopyGeneratorProvider {
  name = 'orchestrated_copy_generator';

  async health() {
    return { ok: true };
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

    try {
      const result = await generateCopy({
        prompt,
        taskType: 'variations',
        tier: 'creative',
        temperature: 0.8,
        maxTokens: 1500,
      });

      const candidates = parseJsonArray(result.output);
      return { candidates, raw: { text: result.output, model: result.model } };
    } catch (error: any) {
      return { candidates: [], raw: { error: error?.message ?? 'copy_generation_failed' } };
    }
  }
}
