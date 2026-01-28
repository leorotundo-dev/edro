import type { CopyValidationResult, CopyValidatorProvider } from '../providers/contracts';
import { generateCopy } from '../services/ai/copyService';
import { buildClientKnowledgeBlock } from './knowledgePrompt';

function parseJsonFromText(text: string) {
  const trimmed = text.trim().replace(/```json/gi, '```').replace(/```/g, '');
  try {
    return JSON.parse(trimmed) as any;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as any;
    }
    return null;
  }
}

export class OrchestratedCopyValidator implements CopyValidatorProvider {
  name = 'orchestrated_copy_validator';

  async health() {
    return { ok: true };
  }

  async validate(params: any): Promise<CopyValidationResult> {
    const { client, knowledge, platform, format, candidates } = params;
    const knowledgeBlock = buildClientKnowledgeBlock(knowledge);
    const forbiddenClaims = knowledge?.compliance?.forbidden_claims ?? [];
    const mustMentions = knowledge?.must_mentions ?? [];

    const prompt = `
Voce e um revisor e organizador de copy.
TAREFA:
1) Validar se as copies respeitam boas praticas de ${platform}/${format}.
2) Detectar problemas (clareza, promessas, tom, tamanho, compliance).
3) Escolher a melhor e devolver JSON normalizado.

CLIENTE: ${client.name}
TOM: ${knowledge?.tone?.description ?? 'equilibrado'}
PROIBICOES: ${forbiddenClaims.join('; ')}
${mustMentions.length ? `MENCÕES OBRIGATÓRIAS: ${mustMentions.join(', ')}` : ''}
${knowledgeBlock ? `\n${knowledgeBlock}\n` : ''}

ENTRADA CANDIDATOS:
${JSON.stringify(candidates, null, 2)}

SAIDA (JSON):
{
  "approved": true/false,
  "score": 0-100,
  "issues":[{"code":"...","message":"...","severity":"low|medium|high"}],
  "best":{"format":"...","headline":"...","body":"...","cta":"...","tags":[]},
  "normalized_payload": { "platform":"...", "format":"...", "best":..., "alternatives":[...] }
}
`;

    try {
      const result = await generateCopy({
        prompt,
        taskType: 'validation',
        tier: 'fast',
        temperature: 0.2,
        maxTokens: 1500,
      });

      const parsed = parseJsonFromText(result.output);
      if (!parsed) {
        return {
          approved: false,
          score: 0,
          issues: [
            {
              code: 'INVALID_JSON',
              message: 'Validador nao retornou JSON valido.',
              severity: 'high',
            },
          ],
          best: candidates?.[0] ?? { format, headline: '', body: '', cta: '' },
          normalized_payload: {
            platform,
            format,
            best: candidates?.[0] ?? null,
            alternatives: candidates ?? [],
          },
        };
      }

      return parsed as CopyValidationResult;
    } catch (error: any) {
      return {
        approved: false,
        score: 0,
        issues: [
          { code: 'VALIDATION_FAILED', message: error?.message ?? 'Falha ao validar copy.', severity: 'high' },
        ],
        best: candidates?.[0] ?? { format, headline: '', body: '', cta: '' },
        normalized_payload: {
          platform,
          format,
          best: candidates?.[0] ?? null,
          alternatives: candidates ?? [],
        },
      };
    }
  }
}
