/**
 * Decision Stack Audit Service
 *
 * Auditoria pós-geração do output de IA aplicando a fórmula de Valor Percebido:
 *
 *   Vp = (H_spec · H_loss) + H_anchor
 *
 * Onde:
 *   H_spec   = Especificidade (0–10)  — dados precisos vs adjetivos vazios
 *   H_loss   = Aversão à perda (0–10) — enquadramento de perda vs ganho
 *   H_anchor = Ancoragem (0–10)       — custo do problema antes da solução
 *
 * Executa também:
 *   - Veto Filter: detecta violações das regras absolutas (clichês de IA, voz passiva)
 *   - Pratfall Check: detecta vulnerabilidade controlada (autenticidade)
 *   - Pacing/Leading: verifica sequência problema → solução
 */

// ── Veto Dictionary ──────────────────────────────────────────────────────────

type VetoCategory = 'cliche_abertura' | 'adjetivo_vazio' | 'conclusao_obvia' | 'voz_passiva' | 'texto_imagem';

type VetoRule = {
  category: VetoCategory;
  label: string;
  patterns: RegExp[];
  severity: 'critical' | 'warning';
};

const VETO_RULES: VetoRule[] = [
  {
    category: 'cliche_abertura',
    label: 'Abertura clichê',
    severity: 'critical',
    patterns: [
      /\bno mundo de hoje\b/gi,
      /\bem um cenário de (constantes\s+)?mudanças\b/gi,
      /\bdescubra como\b/gi,
      /\bem tempos como esses\b/gi,
      /\ba cada dia que passa\b/gi,
      /\bno contexto atual\b/gi,
      /\bvivemos em um mundo\b/gi,
      /\bna era (digital|moderna|atual)\b/gi,
    ],
  },
  {
    category: 'adjetivo_vazio',
    label: 'Adjetivo qualitativo sem prova',
    severity: 'warning',
    patterns: [
      /\b(incrível|incrivel)\b(?![^.]*\d)/gi,
      /\b(revolucionário|revolucionario)\b(?![^.]*\d)/gi,
      /\b(inovador)\b(?![^.]*\d)/gi,
      /\b(excepcional)\b(?![^.]*\d)/gi,
      /\b(transformador)\b(?![^.]*\d)/gi,
    ],
  },
  {
    category: 'conclusao_obvia',
    label: 'Conclusão óbvia',
    severity: 'critical',
    patterns: [
      /\b(concluindo|concluindo\.\.\.)\b/gi,
      /\b(em resumo[,.])\b/gi,
      /\b(como pudemos ver)\b/gi,
      /\b(portanto[,.]\s*é (claro|evidente))\b/gi,
    ],
  },
  {
    category: 'voz_passiva',
    label: 'Voz passiva',
    severity: 'warning',
    patterns: [
      /\b(foi|foram|é|são|será|serão)\s+\w+(ado|ados|ada|adas|ido|idos|ida|idas)\b/gi,
      /\b(está|estão)\s+sendo\s+\w+(ado|ados|ida|idas)\b/gi,
    ],
  },
];

// ── Loss-Aversion Lexicon (Português) ────────────────────────────────────────

const LOSS_KEYWORDS = [
  'perder', 'perdendo', 'perdeu', 'perde',
  'custo', 'custos', 'custar', 'custa',
  'risco', 'riscos', 'arriscado',
  'ameaça', 'ameaças', 'ameaçado',
  'prejuízo', 'prejuizos', 'prejuizo',
  'desperdiçar', 'desperdício', 'desperdicio',
  'deixar de', 'abrindo mão', 'abrir mão',
  'continuar sem', 'seguir sem',
  'cada semana sem', 'cada dia sem', 'cada mês sem',
  'o que está em risco', 'o que você perde',
  'não agir', 'não decidir', 'não implementar',
  'ficar para trás', 'ficar atrás',
];

// ── Specificity Patterns ──────────────────────────────────────────────────────

// Match numbers with decimal/thousands separators, percentages, monetary values
const SPECIFICITY_PATTERN =
  /\b(\d{1,3}([.,]\d{3})*([.,]\d+)?%?|\d+[.,]\d+%?|R\$\s*\d+|\d+x\s*(mais|menos|maior|menor|aumento|redução)|de\s+\d+\s+(dias|meses|horas|semanas)|em\s+\d+\s+(dias|meses|semanas))\b/gi;

// Anchor (problem-first) signal words — must appear before solution keywords in the text
const ANCHOR_PROBLEM_SIGNALS = [
  'problema', 'desafio', 'custo', 'perda', 'risco', 'dificuldade',
  'gargalo', 'obstáculo', 'obstaculo', 'consequência', 'consequencia',
  'impacto', 'dor', 'frustração', 'frustracao', 'ineficiência', 'ineficiencia',
  'está custando', 'está perdendo', 'cada semana sem',
];

const ANCHOR_SOLUTION_SIGNALS = [
  'solução', 'solucao', 'resolve', 'elimina', 'reduz', 'aumenta',
  'melhora', 'otimiza', 'implementar', 'adotar', 'contratar',
  'apresentamos', 'oferecemos', 'nosso produto', 'nossa plataforma',
  'clique', 'acesse', 'fale com', 'agende',
];

// ── Pratfall Effect Detection ─────────────────────────────────────────────────

const PRATFALL_PATTERNS = [
  /\b(aprendemos da forma difícil|aprendemos com o erro|erramos|desafio que enfrentamos|no começo não era assim|primeira tentativa falhou)\b/gi,
  /\b(vulnerabilidade|admitimos|reconhecemos|não foi fácil|levou tempo)\b/gi,
];

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * H_spec — Especificidade (0–10).
 * Counts specific numeric expressions / sentence count.
 * High specificity = higher credibility.
 */
function scoreSpecificity(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const matches = text.match(SPECIFICITY_PATTERN) || [];
  const ratio = matches.length / Math.max(sentences.length, 1);
  // 1 numeric per 3 sentences → score 5; 1 per sentence → score 10
  return Math.min(10, Math.round(ratio * 10 * 3));
}

/**
 * H_loss — Aversão à perda (0–10).
 * Counts loss-framing keywords relative to word count.
 */
function scoreLossAversion(text: string): number {
  const words = text.toLowerCase();
  let hits = 0;
  for (const kw of LOSS_KEYWORDS) {
    if (words.includes(kw)) hits++;
  }
  // 1 keyword → 3 pts; 3+ keywords → 10
  return Math.min(10, Math.round(hits * 3.3));
}

/**
 * H_anchor — Ancoragem (0 or 10).
 * Returns 10 if at least one problem signal appears in the first 40% of text
 * and at least one solution signal appears after.
 */
function scoreAnchoring(text: string): number {
  const lower = text.toLowerCase();
  const cutoff = Math.floor(lower.length * 0.4);
  const firstPart = lower.slice(0, cutoff);
  const remainder = lower.slice(cutoff);

  const hasProblemFirst = ANCHOR_PROBLEM_SIGNALS.some((s) => firstPart.includes(s));
  const hasSolutionLater = ANCHOR_SOLUTION_SIGNALS.some((s) => remainder.includes(s));

  return hasProblemFirst && hasSolutionLater ? 10 : 0;
}

// ── Veto Scan ─────────────────────────────────────────────────────────────────

export type VetoViolation = {
  category: VetoCategory;
  label: string;
  severity: 'critical' | 'warning';
  matches: string[];
};

function scanVetos(text: string): VetoViolation[] {
  const violations: VetoViolation[] = [];
  for (const rule of VETO_RULES) {
    const matches: string[] = [];
    for (const pattern of rule.patterns) {
      const found = text.match(pattern) || [];
      matches.push(...found.map((m) => m.trim()));
    }
    if (matches.length > 0) {
      violations.push({
        category: rule.category,
        label: rule.label,
        severity: rule.severity,
        matches: [...new Set(matches)].slice(0, 5),
      });
    }
  }
  return violations;
}

// ── Pacing / Leading Validation ───────────────────────────────────────────────

function hasPacingLeading(text: string): boolean {
  const lower = text.toLowerCase();
  // Simple heuristic: text mentions a pain/reality in first half before presenting solution
  const firstHalf = lower.slice(0, Math.floor(lower.length / 2));
  return ANCHOR_PROBLEM_SIGNALS.some((s) => firstHalf.includes(s));
}

// ── Pratfall Effect Detection ─────────────────────────────────────────────────

function hasPratfallEffect(text: string): boolean {
  return PRATFALL_PATTERNS.some((p) => p.test(text));
}

// ── Main Audit ────────────────────────────────────────────────────────────────

export type DecisionStackAudit = {
  vp: number;                      // Perceived Value score: (Hspec · Hloss) + Hanchor
  components: {
    h_spec: number;                // Especificidade (0–10)
    h_loss: number;                // Aversão à perda (0–10)
    h_anchor: number;              // Ancoragem (0 or 10)
  };
  passed: boolean;                 // vp >= threshold (default 15)
  veto_violations: VetoViolation[];
  critical_violations: number;
  has_pacing_leading: boolean;
  has_pratfall_effect: boolean;
  recommendations: string[];
};

const VP_THRESHOLD = 15; // Minimum acceptable Vp for persuasive copy

export function auditDecisionStack(text: string): DecisionStackAudit {
  const h_spec = scoreSpecificity(text);
  const h_loss = scoreLossAversion(text);
  const h_anchor = scoreAnchoring(text);

  const vp = Math.round((h_spec * h_loss) + h_anchor);

  const veto_violations = scanVetos(text);
  const critical_violations = veto_violations.filter((v) => v.severity === 'critical').length;

  const has_pacing_leading = hasPacingLeading(text);
  const has_pratfall_effect = hasPratfallEffect(text);

  const passed = vp >= VP_THRESHOLD && critical_violations === 0;

  // Build actionable recommendations
  const recommendations: string[] = [];

  if (h_spec < 4) {
    recommendations.push('Adicione dados precisos — números, percentuais ou prazos específicos (ex: "13,4%" em vez de "muito")');
  }
  if (h_loss < 3) {
    recommendations.push('Reforce o enquadramento de perda — mostre o custo do não-agir antes de apresentar a solução');
  }
  if (h_anchor === 0) {
    recommendations.push('Aplique ancoragem — apresente o problema ou custo de inércia no primeiro parágrafo, antes da solução');
  }
  if (!has_pacing_leading) {
    recommendations.push('Aplique Pacing & Leading — valide a realidade do leitor (pain) antes de propor a mudança');
  }
  for (const v of veto_violations) {
    if (v.severity === 'critical') {
      recommendations.push(`VETO CRÍTICO [${v.label}]: remover "${v.matches[0]}" e variações`);
    }
  }

  return {
    vp,
    components: { h_spec, h_loss, h_anchor },
    passed,
    veto_violations,
    critical_violations,
    has_pacing_leading,
    has_pratfall_effect,
    recommendations,
  };
}

/**
 * Builds a targeted correction prompt when the Decision Stack audit fails.
 * Focuses on the specific deficiencies detected.
 */
export function buildDecisionStackCorrectionPrompt(audit: DecisionStackAudit): string {
  if (audit.passed) return '';

  const lines: string[] = [
    '\n\n[AUDITORIA DE STACK DE DECISÃO — CORREÇÃO NECESSÁRIA]',
    `Vp calculado: ${audit.vp} (mínimo: ${VP_THRESHOLD}) | Violações críticas: ${audit.critical_violations}`,
    '',
    'Aplicar TODAS as correções abaixo mantendo o sentido e CTA originais:',
  ];

  for (const rec of audit.recommendations) {
    lines.push(`• ${rec}`);
  }

  lines.push('', 'Reescreva o texto aplicando as correções acima:');

  return lines.join('\n');
}
