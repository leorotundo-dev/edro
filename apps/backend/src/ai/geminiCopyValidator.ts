import type { CopyValidatorProvider, CopyValidationResult } from '../providers/contracts';

export class GeminiCopyValidator implements CopyValidatorProvider {
  name = 'gemini_copy_validator';

  async health() {
    return { ok: !!process.env.GEMINI_API_KEY };
  }

  async validate(params: any): Promise<CopyValidationResult> {
    const { client, knowledge, platform, format, candidates } = params;

    const prompt = `
Voce e um revisor e organizador de copy.
TAREFA:
1) Validar se as copies respeitam boas praticas de ${platform}/${format}.
2) Detectar problemas (clareza, promessas, tom, tamanho, compliance).
3) Escolher a melhor e devolver JSON normalizado.

CLIENTE: ${client.name}
TOM: ${knowledge?.tone?.description ?? 'equilibrado'}
PROIBICOES: ${(knowledge?.compliance?.forbidden_claims ?? []).join('; ')}

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

    const endpoint = process.env.GEMINI_ENDPOINT;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        approved: false,
        score: 0,
        issues: [
          { code: 'GEMINI_NOT_CONFIGURED', message: 'GEMINI_API_KEY ausente.', severity: 'high' },
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

    let raw = '';
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ prompt }),
      });
      raw = await response.text();
    } else {
      const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
      const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
          }),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini error: ${response.status} ${errText}`);
      }
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      raw = parts.map((part: any) => part.text || '').join('').trim();
    }

    let out: any;
    try {
      out = JSON.parse(raw);
    } catch {
      out = null;
    }

    if (!out) {
      return {
        approved: false,
        score: 0,
        issues: [
          {
            code: 'INVALID_JSON',
            message: 'Gemini nao retornou JSON valido.',
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

    return out as CopyValidationResult;
  }
}
