import { generateCompletion } from './claudeService';
import { VISUAL_DNA_BASE } from '../adCreativeService';

export type Gatilho =
  | 'G01' // Aversão à Perda
  | 'G02' // Especificidade
  | 'G03' // Zeigarnik
  | 'G04' // Ancoragem
  | 'G05' // Prova Social
  | 'G06' // Pratfall
  | 'G07'; // Dark Social

export interface BrandInput {
  name?: string;
  primaryColor?: string;
  segment?: string;
}

export interface BrandTokens {
  typography?: string;
  imageStyle?: string;
  moodWords?: string[];
  avoidElements?: string[];
  referenceStyles?: string[];
}

export interface OrchestrateParams {
  copy: string;
  gatilho?: Gatilho;
  brand?: BrandInput;
  format?: string;
  platform?: string;
  /** Formatted string of top learning rules for this client (from LearningEngine) */
  learningContext?: string;
  /** Structured brand design tokens from client profile */
  brandTokens?: BrandTokens | null;
}

export interface ArtDirectorLayout {
  eyebrow: string;
  headline: string;
  accentWord: string;
  accentColor: string;
  cta: string;
  body: string;
  overlayStrength: number;
}

export interface ArtDirectorImgPrompt {
  positive: string;
  negative: string;
  aspectRatio: string;
}

export interface OrchestrateResult {
  imgPrompt: ArtDirectorImgPrompt;
  layout: ArtDirectorLayout;
}

// ── Composition zones (always appended) ────────────────────────────────────
const COMPOSITION_ZONES = `Composition zones: upper 60% sharp scene with subject in focus, middle 20% natural vignette and depth blur transition, lower 20% very dark near-black (luminance < 10%) reserved for text overlay. No text, no watermarks, no logos, no typography anywhere in the image.`;

// ── 7 Gatilho visual directives ────────────────────────────────────────────
const GATILHO_DIRECTIVES: Record<string, string> = {
  G01: `GATILHO: Aversão à Perda. Visual temperature: tension, urgency, high contrast.
Directive: Split composition — one side shows loss/risk (deep red or desaturated), the other shows gain/safety (electric blue or gold). Dramatic diagonal divide. Lower 20% must be very dark for text. Cinematic wide shot.`,

  G02: `GATILHO: Especificidade / Credibilidade. Visual temperature: precision, scale, authority.
Directive: Aerial or institutional perspective with strong depth. Grid, data, or dimensional reference that implies exactness. Environmental: clean corporate or industrial space. Lower 20% near-black. Commercial photography, high-detail.`,

  G03: `GATILHO: Zeigarnik (loop aberto). Visual temperature: mystery, incompleteness, anticipation.
Directive: Partial reveal — subject partially emerging from darkness or cut by frame edge. Single spotlight in a dark scene, leaving surroundings unknown. Strong shadow depth. Lower 20% dissolves into black naturally.`,

  G04: `GATILHO: Ancoragem / Contraste de Valor. Visual temperature: impact, shock, premium.
Directive: Hero object in tight close-up studio shot. Dark or black seamless background, dramatic key light from side or above. Object with high perceived value fills the frame. Lower 20% deep shadow naturally.`,

  G05: `GATILHO: Prova Social / Pertencimento. Visual temperature: warmth, authenticity, human connection.
Directive: Real person in natural candid moment. Soft diffused natural light, warm color temperature. Documentary feel, no heavy post-processing. Genuine facial expression or body language. Lower 20% slightly underexposed naturally.`,

  G06: `GATILHO: Pratfall Effect (honestidade vulnerável). Visual temperature: honesty, trust, neutrality.
Directive: Neutral documentary lighting, slightly imperfect framing that feels authentic. Scene shows a real unposed moment — not too perfect, not too rough. Color palette balanced and honest. Lower 20% naturally dark.`,

  G07: `GATILHO: Dark Social / Impacto Tipográfico. Visual temperature: minimal, atmospheric, dark.
Directive: Near-black background with subtle deep texture (concrete, matte surface, low-light environment). One single strong element or texture occupies upper 60%. Minimal palette: black, very dark grey, optional single accent. Lower 20% near black seamless. Pure atmosphere, no people required.`,
};

// ── System prompt ────────────────────────────────────────────────────────────
const ORCHESTRATOR_SYSTEM = `You are a senior art director and copywriter at a leading Brazilian advertising agency.
You orchestrate both the visual composition AND the text layout of advertising creatives.
You must respond with a valid JSON object matching the exact schema given — no prose, no markdown, just JSON.`;

function buildUserPrompt(params: OrchestrateParams): string {
  const { copy, gatilho, brand, format, platform, learningContext, brandTokens } = params;
  const brandName = brand?.name || '';
  const brandColor = brand?.primaryColor || '#F5C518';
  const segment = brand?.segment || '';
  const aspectRatio = format?.includes('9:16') ? '9:16'
    : format?.includes('4:5') ? '4:5'
    : format?.includes('16:9') ? '16:9'
    : '1:1';

  const gatilhoDirective = gatilho ? GATILHO_DIRECTIVES[gatilho] || '' : '';
  const gatilhoLabel = gatilho ? `${gatilho}` : 'General';

  return `You are creating a complete ad creative for the following brief:

COPY / CAPTION:
"${copy}"

BRAND: ${brandName || '(not specified)'}${segment ? ` | SEGMENT: ${segment}` : ''}
BRAND PRIMARY COLOR: ${brandColor}
FORMAT: ${format || 'Feed 1:1'} | ASPECT RATIO: ${aspectRatio}
PLATFORM: ${platform || 'Instagram'}
PSYCHOLOGICAL TRIGGER: ${gatilhoLabel}

${gatilhoDirective}
${learningContext ? `\nHISTORICAL PERFORMANCE INSIGHTS FOR THIS CLIENT (validated data):\n${learningContext}\n\nUse these patterns to inform your layout decisions — prefer triggers, AMDs, and emotional angles that have empirically performed well for this brand.\n` : ''}
${brandTokens ? `\nBRAND DESIGN TOKENS (apply rigorously to both image and text decisions):
- Typography: ${brandTokens.typography || 'not defined'}
- Image Style: ${brandTokens.imageStyle || 'not defined'}
- Mood Words: ${(brandTokens.moodWords || []).join(', ') || 'not defined'}
- Avoid Elements: ${(brandTokens.avoidElements || []).join(', ') || 'none'}
- Reference Styles: ${(brandTokens.referenceStyles || []).join(', ') || 'none'}
` : ''}
YOUR JOB — produce a JSON object with two top-level keys: "imgPrompt" and "layout".

"imgPrompt" is the background image generation prompt:
- "positive": cinematic scene description in English, max 200 words. ${COMPOSITION_ZONES} Absolutely no text in the image.
- "negative": comma-separated negative prompt to protect the text zone and quality: "text, words, letters, watermarks, logos, typography, blurry lower third, bright lower 20%, light background at bottom, washed out shadows, CGI plastic, distorted anatomy"
- "aspectRatio": "${aspectRatio}"

"layout" is the text layer decisions:
- "eyebrow": short teaser text above headline (2–5 words, ALL CAPS, interrogation or statement that creates tension matching the trigger). In Portuguese.
- "headline": the main visual message (4–10 words). Can be sentence-case or ALL CAPS depending on trigger. Should be the most impactful line from the copy or a rewrite of it. In Portuguese.
- "accentWord": one word or short phrase from the headline that gets visual emphasis (color highlight). Pick the word with highest emotional charge.
- "accentColor": hex color for the accent word. Use brand color ${brandColor} if it reads well, or choose a complementary accent (gold #F5C518 for tension/anchor, electric blue #00B4FF for credibility, red #FF2D2D for urgency).
- "cta": call-to-action button text (2–5 words). In Portuguese. Action-oriented.
- "body": supporting proof point or social proof text (1 short sentence, max 12 words). In Portuguese. Can be empty string if not needed.
- "overlayStrength": number 0.0–1.0 — how strong the bottom overlay gradient should be. Higher for darker images (0.6–0.8), lower for already-dark scenes (0.4–0.6).

Respond with ONLY the JSON object, no markdown code blocks, no extra text.

EXAMPLE SCHEMA:
{
  "imgPrompt": {
    "positive": "...",
    "negative": "text, words, letters...",
    "aspectRatio": "4:5"
  },
  "layout": {
    "eyebrow": "CANSADO DE PERDER MARGEM?",
    "headline": "Garimpa veículo e fica com margem pequena?",
    "accentWord": "margem pequena",
    "accentColor": "#F5C518",
    "cta": "Descubra o leilão",
    "body": "Mais de 2.000 compradores já aumentaram sua margem.",
    "overlayStrength": 0.72
  }
}`;
}

/**
 * Orchestrates a complete ad creative decision:
 * - imgPrompt: background image prompt with composition zones (calibrated per gatilho)
 * - layout: text layer decisions (eyebrow, headline, accentWord, accentColor, cta, body)
 *
 * Single Claude call. ~2-4s.
 */
export async function orchestrateCreative(params: OrchestrateParams): Promise<OrchestrateResult> {
  const userPrompt = buildUserPrompt(params);
  const aspectRatio = params.format?.includes('9:16') ? '9:16'
    : params.format?.includes('4:5') ? '4:5'
    : params.format?.includes('16:9') ? '16:9'
    : '1:1';

  const result = await generateCompletion({
    prompt: userPrompt,
    systemPrompt: ORCHESTRATOR_SYSTEM,
    temperature: 0.75,
    maxTokens: 1200,
  });

  let raw = result.text.trim();

  // Strip markdown code block if Claude wrapped it
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`artDirectorOrchestrator: Claude returned invalid JSON — ${raw.slice(0, 200)}`);
  }

  // Inject VISUAL_DNA_BASE into the positive prompt before returning
  const positiveWithDna = `${VISUAL_DNA_BASE}\n${parsed.imgPrompt?.positive || ''}`;

  return {
    imgPrompt: {
      positive: positiveWithDna,
      negative: parsed.imgPrompt?.negative || 'text, words, letters, watermarks, logos, typography, blurry lower third, bright lower 20%',
      aspectRatio: parsed.imgPrompt?.aspectRatio || aspectRatio,
    },
    layout: {
      eyebrow: parsed.layout?.eyebrow || '',
      headline: parsed.layout?.headline || '',
      accentWord: parsed.layout?.accentWord || '',
      accentColor: parsed.layout?.accentColor || params.brand?.primaryColor || '#F5C518',
      cta: parsed.layout?.cta || '',
      body: parsed.layout?.body || '',
      overlayStrength: typeof parsed.layout?.overlayStrength === 'number'
        ? Math.max(0, Math.min(1, parsed.layout.overlayStrength))
        : 0.65,
    },
  };
}
