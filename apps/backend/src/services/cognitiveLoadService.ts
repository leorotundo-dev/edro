/**
 * Cognitive Load Analysis Service
 *
 * Implements the formula:
 *   Lc = (W̄s · Ds · σt) / Φws
 *
 * Where:
 *   W̄s  = Sentence Weight     — avg words per sentence
 *   Ds   = Semantic Density    — technical terms ratio
 *   σt   = Tonal Stress        — passive voice + subordination complexity
 *   Φws  = White Space Factor  — scannability / breathing room
 *
 * Platform thresholds:
 *   TikTok / Reels  : Lc < 1.0
 *   Instagram       : 1.0 – 1.8
 *   LinkedIn        : 1.8 – 3.5
 *   Relatórios / RI : > 3.5
 */

// ── Platform Thresholds ──────────────────────────────────────────────────────

type PlatformThreshold = { min: number; max: number; label: string; targetWs: number; targetDs: number };

const PLATFORM_THRESHOLDS: Record<string, PlatformThreshold> = {
  tiktok:    { min: 0,   max: 1.0, label: 'TikTok / Reels',  targetWs: 6,  targetDs: 0.06 },
  reels:     { min: 0,   max: 1.0, label: 'TikTok / Reels',  targetWs: 6,  targetDs: 0.06 },
  instagram: { min: 1.0, max: 1.8, label: 'Instagram',        targetWs: 11, targetDs: 0.12 },
  facebook:  { min: 1.0, max: 2.0, label: 'Facebook',         targetWs: 13, targetDs: 0.13 },
  whatsapp:  { min: 0.8, max: 1.6, label: 'WhatsApp',         targetWs: 10, targetDs: 0.10 },
  youtube:   { min: 1.5, max: 3.0, label: 'YouTube',          targetWs: 16, targetDs: 0.18 },
  linkedin:  { min: 1.8, max: 3.5, label: 'LinkedIn',         targetWs: 18, targetDs: 0.20 },
  twitter:   { min: 0.5, max: 1.2, label: 'Twitter / X',      targetWs: 8,  targetDs: 0.08 },
  relatorio: { min: 3.5, max: 10,  label: 'Relatórios / RI',  targetWs: 22, targetDs: 0.35 },
};

const DEFAULT_THRESHOLD: PlatformThreshold = { min: 0.8, max: 3.5, label: 'Geral', targetWs: 14, targetDs: 0.15 };

export function getThreshold(platform: string | null | undefined): PlatformThreshold {
  if (!platform) return DEFAULT_THRESHOLD;
  const key = platform.toLowerCase().replace(/[^a-z]/g, '');
  return PLATFORM_THRESHOLDS[key] || DEFAULT_THRESHOLD;
}

// ── Component Calculations ────────────────────────────────────────────────────

/**
 * W̄s — Average words per sentence.
 * The brain retains 7–9 chunks; >15 words/sentence degrades retention.
 */
function calcSentenceWeight(text: string): number {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && /\w/.test(s));

  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0);
  return total / sentences.length;
}

/**
 * Ds — Semantic Density.
 * Ratio of technical/specific words to total words.
 * Indicators: long words (>8 chars), numbers, abbreviations (ALL CAPS), hyphens.
 */
function calcSemanticDensity(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const technical = words.filter((w) => {
    const clean = w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '');
    return (
      clean.length > 8 ||            // Long words
      /\d/.test(w) ||                // Contains numbers
      /^[A-ZÀÁÂÃÄÅ]{2,}$/.test(clean) || // Abbreviations (KPI, ROI, EBITDA)
      /-/.test(w) ||                 // Hyphenated compounds
      /\//.test(w)                   // Fractions / ratios
    );
  });

  return technical.length / words.length;
}

/**
 * σt — Tonal Stress.
 * Penalizes passive voice (processed 30% slower) and complex subordinations.
 * Starts at 1.0; passive voice and conjunctions push it above 1.0.
 */
function calcTonalStress(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const sentenceCount = Math.max(sentences.length, 1);

  // Portuguese passive voice patterns
  const passivePatterns = [
    /\b(foi|foram|é|são|será|serão|sendo|sido|está|estão)\s+\w+(ado|ados|ada|adas|ido|idos|ida|idas)\b/gi,
    /\b(esteve|estiveram|estará|estarão)\s+sendo\b/gi,
  ];
  let passiveCount = 0;
  for (const p of passivePatterns) {
    passiveCount += (text.match(p) || []).length;
  }

  // Complex subordinating conjunctions (formal / bureaucratic)
  const formalConjunctions =
    /\b(entretanto|todavia|contudo|outrossim|dessarte|conquanto|malgrado|porquanto|não obstante|a despeito|em virtude|em razão|tendo em vista)\b/gi;
  const conjCount = (text.match(formalConjunctions) || []).length;

  // Comma density (proxy for clause depth)
  const commas = (text.match(/,/g) || []).length;
  const commaRatio = commas / sentenceCount;

  const stress =
    1.0 +
    (passiveCount * 0.35) / sentenceCount +
    (conjCount * 0.25) / sentenceCount +
    Math.max(0, (commaRatio - 1.5) * 0.08);

  return Math.min(Math.max(stress, 1.0), 3.0);
}

/**
 * Φws — White Space Factor / Scannability.
 * More line breaks → higher Φ → lower Lc (better readability).
 * Short average line length also contributes.
 */
function calcWhiteSpaceFactor(text: string): number {
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const empty = lines.filter((l) => l.trim().length === 0);

  if (nonEmpty.length === 0) return 1.0;

  const lineBreakRatio = empty.length / nonEmpty.length;
  const avgLen = nonEmpty.reduce((s, l) => s + l.length, 0) / nonEmpty.length;
  // Shorter lines → more scannable → bonus
  const lengthBonus = Math.max(0, (100 - avgLen) / 100) * 0.4;

  return Math.max(0.5, 1.0 + lineBreakRatio * 0.9 + lengthBonus);
}

// ── Main Analysis ─────────────────────────────────────────────────────────────

export type CognitiveLoadComponents = {
  ws: number;   // avg words per sentence
  ds: number;   // semantic density (0–1)
  sigma: number; // tonal stress (≥1.0)
  phi: number;  // white space factor (≥0.5)
};

export type CognitiveLoadAnalysis = {
  lc: number;
  components: CognitiveLoadComponents;
  platform: string;
  threshold: { min: number; max: number; label: string };
  passed: boolean;
  status: 'ok' | 'too_high' | 'too_low';
  diagnosis: string[];
};

export function analyzeCognitiveLoad(
  text: string,
  platform: string | null | undefined
): CognitiveLoadAnalysis {
  const ws = calcSentenceWeight(text);
  const ds = calcSemanticDensity(text);
  const sigma = calcTonalStress(text);
  const phi = calcWhiteSpaceFactor(text);

  const lc = phi > 0 ? Math.round(((ws * ds * sigma) / phi) * 100) / 100 : 0;

  const threshold = getThreshold(platform);
  const passed = lc >= threshold.min && lc <= threshold.max;
  const status: CognitiveLoadAnalysis['status'] =
    lc > threshold.max ? 'too_high' : lc < threshold.min ? 'too_low' : 'ok';

  // Diagnostic messages to guide correction
  const diagnosis: string[] = [];
  if (status === 'too_high') {
    if (ws > 15) diagnosis.push(`Frases longas (${ws.toFixed(1)} palavras/frase, meta: <${threshold.targetWs})`);
    if (ds > threshold.targetDs + 0.05) diagnosis.push(`Densidade técnica alta (${(ds * 100).toFixed(0)}%, meta: <${(threshold.targetDs * 100).toFixed(0)}%)`);
    if (sigma > 1.3) diagnosis.push(`Estresse tonal elevado — reduzir voz passiva e subordinações`);
    if (phi < 1.2) diagnosis.push(`Baixa escaneabilidade — adicionar quebras de linha`);
  } else if (status === 'too_low') {
    if (ws < 6) diagnosis.push(`Frases muito curtas (${ws.toFixed(1)} palavras/frase) — pode perder coesão`);
    if (ds < 0.04) diagnosis.push(`Densidade técnica muito baixa — adicionar especificidade`);
  }

  return {
    lc,
    components: { ws, ds, sigma, phi },
    platform: threshold.label,
    threshold: { min: threshold.min, max: threshold.max, label: threshold.label },
    passed,
    status,
    diagnosis,
  };
}

// ── Self-Correction Prompt ────────────────────────────────────────────────────

/**
 * Builds an AI correction prompt when Lc is outside the platform threshold.
 * Injected as a final revision instruction before the copy is returned.
 */
export function buildCorrectionPrompt(analysis: CognitiveLoadAnalysis): string {
  if (analysis.passed) return '';

  const { lc, threshold, status, diagnosis, components } = analysis;

  if (status === 'too_high') {
    return `
\n\n[AUDITORIA DE CARGA COGNITIVA — CORREÇÃO OBRIGATÓRIA]
Lc calculada: ${lc} | Limite para ${threshold.label}: ${threshold.min}–${threshold.max}
Status: ACIMA DO LIMITE — reescrita necessária.

Problemas detectados:
${diagnosis.map((d) => `• ${d}`).join('\n')}

Aplicar as seguintes correções mantendo sentido e CTA:
1. Quebrar frases longas — máximo ${threshold.targetWs} palavras por sentença
2. Substituir termos técnicos por linguagem acessível
3. Converter voz passiva → voz ativa (ex: "foi realizado" → "realizamos")
4. Adicionar quebras de linha duplas entre blocos de ideia
5. Simplificar subordinações — preferir frases diretas

Reescreva o texto abaixo aplicando TODAS as correções acima:
`.trim();
  }

  if (status === 'too_low') {
    return `
\n\n[AUDITORIA DE CARGA COGNITIVA — AJUSTE RECOMENDADO]
Lc calculada: ${lc} | Mínimo para ${threshold.label}: ${threshold.min}
Status: ABAIXO DO LIMITE — texto pode estar superficial demais para este canal.

Sugestões (aplicar com moderação):
• Adicionar dados ou estatísticas específicas
• Desenvolver um pouco mais o argumento central
• Incluir terminologia relevante ao setor

Reescreva mantendo o tom e aumentando levemente a profundidade:
`.trim();
  }

  return '';
}

/**
 * Extract plain text from a copy output (which may be JSON or plain string).
 */
export function extractText(output: any): string {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return output.map(extractText).join('\n\n');
  if (output && typeof output === 'object') {
    // Common fields in copy output objects
    const textFields = ['text', 'content', 'copy', 'body', 'output', 'message'];
    for (const f of textFields) {
      if (typeof output[f] === 'string' && output[f].length > 20) return output[f];
    }
    return JSON.stringify(output);
  }
  return String(output ?? '');
}
