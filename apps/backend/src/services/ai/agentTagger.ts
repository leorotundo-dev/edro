import * as GeminiService from './geminiService';

export interface BehavioralTags {
  semantic_topics: string[];
  emotional_tone: string;
  dark_social_potential: 'low' | 'medium' | 'high';
  complexity_level: 'simple' | 'moderate' | 'complex';
}

function parseTagsFromText(text: string): BehavioralTags {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as BehavioralTags;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as BehavioralTags;
    }
    throw new Error('AgentTagger: resposta JSON inválida');
  }
}

/**
 * Classifica uma copy gerada com metadata comportamental.
 * Usa Gemini Flash (rápido, barato) — não bloqueia a entrega.
 *
 * Retorna:
 * - semantic_topics: 2–5 tópicos semânticos principais (pt-BR)
 * - emotional_tone: tom emocional dominante
 * - dark_social_potential: potencial de compartilhamento privado (low/medium/high)
 * - complexity_level: nível de complexidade cognitiva (simple/moderate/complex)
 */
export async function tagCopy(
  text: string,
  platform?: string | null
): Promise<BehavioralTags> {
  const platformCtx = platform ? `\nPlataforma: ${platform}` : '';

  const prompt = `Você é um classificador comportamental de conteúdo. Analise a copy abaixo e retorne APENAS JSON válido, sem markdown.${platformCtx}

Copy:
"""
${text.slice(0, 1500)}
"""

Retorne exatamente este JSON:
{
  "semantic_topics": ["topico1", "topico2"],
  "emotional_tone": "curiosidade|autoridade|urgencia|esperanca|alerta|empatia|orgulho|confianca|outro",
  "dark_social_potential": "low|medium|high",
  "complexity_level": "simple|moderate|complex"
}

Regras:
- semantic_topics: 2 a 5 tópicos em português, específicos ao conteúdo
- emotional_tone: escolha o tom dominante da lista acima
- dark_social_potential: "high" se contém frase/dado standalone citável sem contexto; "medium" se é relevante mas depende de contexto; "low" caso contrário
- complexity_level: "simple" (<8 palavras/frase, conceito único); "complex" (múltiplos conceitos técnicos, >15 palavras/frase); "moderate" no meio
- Retorne APENAS o JSON, zero texto adicional`;

  const result = await GeminiService.generateCompletion({
    prompt,
    temperature: 0.1,
    maxTokens: 300,
  });

  return parseTagsFromText(result.text);
}
