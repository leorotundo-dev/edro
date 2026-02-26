/**
 * PolicyChecker — Fase 4: Governança Ética
 *
 * Avalia copy gerada contra políticas éticas antes da entrega.
 * Fluxo:
 *   1. EmotionTagger (Gemini Flash) → classifica valência + arousal + temas sensíveis
 *   2. PolicyChecker (regras determinísticas + IA) → aplica políticas, retorna status
 *
 * Status possíveis:
 *   approved  → nenhuma política violada
 *   flagged   → uma ou mais políticas sinalizadas — copy é salva mas marcada
 *   blocked   → violação grave — copy não deve ser entregue sem revisão humana
 */

import * as GeminiService from './geminiService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmotionResult {
  emotional_valence: 'positive' | 'neutral' | 'negative';
  arousal_level: 'low' | 'medium' | 'high';
  sensitive_topics: string[];
}

export interface PolicyResult {
  status: 'approved' | 'flagged' | 'blocked';
  policies_evaluated: string[];
  policies_triggered: string[];
  rationale: string;
  emotion: EmotionResult;
}

interface Policy {
  id: string;
  name: string;
  action: 'flag_for_review' | 'flag_for_revision' | 'block';
  check: (text: string, emotion: EmotionResult) => boolean;
  guidance: string;
}

// ── Policies ─────────────────────────────────────────────────────────────────

const POLICIES: Policy[] = [
  {
    id: 'policy_001',
    name: 'Evitar exploração de vulnerabilidades financeiras',
    action: 'flag_for_review',
    check: (text, emotion) => {
      const terms = ['dívida', 'divida', 'falência', 'falencia', 'desemprego', 'endividado',
                     'negativado', 'inadimplente', 'falido', 'quebrado'];
      const hasTopic = terms.some((t) => text.toLowerCase().includes(t));
      return hasTopic && emotion.arousal_level === 'high' && emotion.emotional_valence === 'negative';
    },
    guidance: 'Para temas financeiros sensíveis com tom negativo e alta intensidade emocional, '
            + 'ofereça sempre uma perspectiva de saída/ação prática. Evite linguagem de desespero.',
  },
  {
    id: 'policy_002',
    name: 'Limitar urgência extrema',
    action: 'flag_for_revision',
    check: (text) => {
      const terms = [
        'últimas horas', 'ultima hora', 'agora ou nunca', 'hoje é o último dia',
        'expira hoje', 'não perca mais tempo', 'sua última chance',
        'corra agora', 'acabe com isso hoje', 'não deixe para amanhã',
      ];
      return terms.some((t) => text.toLowerCase().includes(t));
    },
    guidance: 'Urgência extrema sem justificativa concreta gera fadiga e desconfiança. '
            + 'Verifique se o prazo é real; se sim, contextualize. Se não, substitua por relevância.',
  },
  {
    id: 'policy_003',
    name: 'Proibir combinação medo + culpa',
    action: 'flag_for_revision',
    check: (text) => {
      const fearTerms  = ['medo de', 'tem medo', 'grave risco', 'em perigo', 'ameaça'];
      const guiltTerms = ['sua culpa', 'você falhou', 'por não ter feito', 'se você tivesse',
                          'negligência', 'não se preocupou', 'foi negligente'];
      const hasFear  = fearTerms.some((t)  => text.toLowerCase().includes(t));
      const hasGuilt = guiltTerms.some((t) => text.toLowerCase().includes(t));
      return hasFear && hasGuilt;
    },
    guidance: 'Combinação de medo e culpabilização é manipulativa. '
            + 'Reescrever com foco em empoderamento: mostrar o caminho, não o fracasso.',
  },
  {
    id: 'policy_004',
    name: 'Detectar clichês de IA',
    action: 'flag_for_revision',
    check: (text) => {
      const cliches = [
        'mergulhe fundo', 'mergulhe mais fundo', 'game changer', 'game-changer',
        'disruptivo', 'inovação disruptiva', 'revolucionar o mercado', 'alavancar resultados',
        'sinergia', 'ecossistema', 'jornada de transformação', 'no mundo dinâmico',
        'no cenário atual', 'mais do que nunca', 'é hora de',
      ];
      return cliches.some((t) => text.toLowerCase().includes(t));
    },
    guidance: 'Clichês de IA reduzem credibilidade. '
            + 'Substituir por linguagem específica, concreta e própria do segmento do cliente.',
  },
  {
    id: 'policy_005',
    name: 'Bloquear promessas irreais de resultado',
    action: 'block',
    check: (text) => {
      const promises = [
        'garantia de sucesso', 'resultado garantido', '100% de eficácia',
        'nunca falha', 'funciona sempre', 'sem risco nenhum', 'zero risco',
        'dinheiro de volta garantido', 'duplicar seu faturamento em',
      ];
      return promises.some((t) => text.toLowerCase().includes(t));
    },
    guidance: 'Promessas de resultado garantido criam passivo jurídico e destroem confiança. '
            + 'Substituir por prova social real (cases, depoimentos, dados) com linguagem honesta.',
  },
];

// ── EmotionTagger ─────────────────────────────────────────────────────────────

function parseEmotionFromText(text: string): EmotionResult {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as EmotionResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end   = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as EmotionResult;
    }
    // Fallback — treat as neutral/low if parsing fails
    return { emotional_valence: 'neutral', arousal_level: 'low', sensitive_topics: [] };
  }
}

async function classifyEmotion(text: string): Promise<EmotionResult> {
  const prompt = `Você é um classificador emocional de conteúdo de marketing. Analise o texto abaixo e retorne APENAS JSON válido, sem markdown.

Texto:
"""
${text.slice(0, 1200)}
"""

Retorne exatamente este JSON:
{
  "emotional_valence": "positive|neutral|negative",
  "arousal_level": "low|medium|high",
  "sensitive_topics": []
}

Regras:
- emotional_valence: "negative" se o tom gera medo, culpa, ansiedade ou desespero; "positive" se gera esperança, orgulho, conquista; "neutral" caso contrário
- arousal_level: "high" se a intensidade emocional é muito forte (urgência extrema, alarme, euforia); "low" se é calmo/informativo; "medium" no meio
- sensitive_topics: lista de tópicos sensíveis identificados no texto, ex: ["dívida", "desemprego", "saúde"]. Array vazio se nenhum.
- Retorne APENAS o JSON`;

  const result = await GeminiService.generateCompletion({
    prompt,
    temperature: 0.1,
    maxTokens: 200,
  });

  return parseEmotionFromText(result.text);
}

// ── PolicyChecker ─────────────────────────────────────────────────────────────

function applyPolicies(
  text: string,
  emotion: EmotionResult
): { status: 'approved' | 'flagged' | 'blocked'; triggered: Policy[]; evaluated: string[] } {
  const triggered: Policy[] = [];
  const evaluated = POLICIES.map((p) => p.id);

  for (const policy of POLICIES) {
    try {
      if (policy.check(text, emotion)) {
        triggered.push(policy);
      }
    } catch {
      /* policy check must never crash the pipeline */
    }
  }

  const hasBlock   = triggered.some((p) => p.action === 'block');
  const hasFlag    = triggered.length > 0;
  const status     = hasBlock ? 'blocked' : hasFlag ? 'flagged' : 'approved';

  return { status, triggered, evaluated };
}

function buildRationale(triggered: Policy[], emotion: EmotionResult): string {
  if (triggered.length === 0) {
    return `Conteúdo aprovado. Valência: ${emotion.emotional_valence}, intensidade: ${emotion.arousal_level}.`;
  }

  const lines = triggered.map((p) => `[${p.id}] ${p.name}: ${p.guidance}`);
  return lines.join('\n');
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runPolicyCheck(text: string): Promise<PolicyResult> {
  // 1. Emotion classification (non-blocking on failure)
  let emotion: EmotionResult = { emotional_valence: 'neutral', arousal_level: 'low', sensitive_topics: [] };
  try {
    emotion = await classifyEmotion(text);
  } catch {
    /* emotion tagger failure is non-blocking; policies run with neutral defaults */
  }

  // 2. Apply deterministic policy rules
  const { status, triggered, evaluated } = applyPolicies(text, emotion);

  return {
    status,
    policies_evaluated: evaluated,
    policies_triggered: triggered.map((p) => p.id),
    rationale: buildRationale(triggered, emotion),
    emotion,
  };
}
