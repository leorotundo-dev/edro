import { generateCompletion } from './claudeService';
import { VISUAL_DNA_BASE } from '../adCreativeService';
import {
  buildArtDirectionKnowledgeBlock,
  resolveArtDirectionKnowledge,
} from './artDirectionKnowledge';
import { buildArtDirectionMemoryContext } from './artDirectionMemoryService';

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
  tenantId?: string;
  clientId?: string | null;
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
  designRationale?: string;
}

export interface ArtDirectorImgPrompt {
  positive: string;
  negative: string;
  aspectRatio: string;
}

export interface OrchestrateResult {
  imgPrompt: ArtDirectorImgPrompt;
  layout: ArtDirectorLayout;
  visualStrategy?: {
    intent: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    informationDensity: 'low' | 'medium' | 'high';
    referenceMovements: string[];
    strategySummary: string;
    trendSignals?: string[];
    referenceExamples?: Array<{ title: string; sourceUrl: string }>;
  };
}

// ── Format-specific art direction rules ─────────────────────────────────────
// Each entry defines constraints that override or extend the base composition.
// Keys are normalized lowercase tokens derived from platform + format strings.

type FormatRule = {
  aspectRatio: string;
  compositionZones: string;
  layoutConstraints: string;
  imgConstraints: string;
  negativeExtra: string;
};

const FORMAT_RULES: Record<string, FormatRule> = {
  // ── Instagram Feed 1:1 ──────────────────────────────────────────────────
  'instagram_feed_1:1': {
    aspectRatio: '1:1',
    compositionZones: 'Square frame (1:1). Upper 60%: sharp scene, subject centered or on rule-of-thirds intersection. Middle 20%: natural depth transition. Lower 20%: very dark near-black (luminance <10%) reserved for text overlay.',
    layoutConstraints: 'Square composition — balanced, stable. Eyebrow: max 4 words. Headline: max 6 words. Lower dark zone handles text well. CTA always present.',
    imgConstraints: 'Square crop must feel intentional. Subject should be centered or on a golden ratio point. Avoid dead space at left/right edges.',
    negativeExtra: 'letterboxing, horizontal bands, wide panorama feel',
  },

  // ── Instagram Feed 4:5 ──────────────────────────────────────────────────
  'instagram_feed_4:5': {
    aspectRatio: '4:5',
    compositionZones: 'Portrait frame (4:5). This is the highest-visibility format on Instagram mobile feed — takes up maximum screen real estate. Upper 65%: sharp subject, vertically elongated framing allows tall subjects. Lower 20%: near-black for text.',
    layoutConstraints: 'Portrait format — use verticality. Eyebrow: max 5 words. Headline: max 8 words (portrait gives more text room). Body line optional. CTA present.',
    imgConstraints: 'Vertical orientation. Subject can be full-body or environment portrait. Do NOT crop important elements at top — the format bleeds to full screen.',
    negativeExtra: 'horizontal wide shots cropped awkwardly, dead bottom space with light colors',
  },

  // ── Instagram Story 9:16 ────────────────────────────────────────────────
  'instagram_story_9:16': {
    aspectRatio: '9:16',
    compositionZones: 'Full-screen vertical (9:16). CRITICAL SAFE ZONES: top 12% hidden by Stories UI (time, battery, avatar, X button) — keep completely clean. Bottom 20% hidden by reply bar and swipe-up area — keep completely clean. Active composition area: 12% to 80% vertically. Subject: center-mass of active area. Lower edge of active area (70-80%) should be dark for text placement.',
    layoutConstraints: 'Vertical storytelling format. Eyebrow placement: top of text zone (around 68-70% from top). Headline: bold, max 6 words, must be readable at phone size. CTA: pill-style near bottom of safe zone. Overlay covers lower 30% of ACTIVE area only.',
    imgConstraints: 'Vertical immersive scene. Subject should face slightly toward viewer or be in action. Environment fills the full vertical frame. Avoid placing key elements in top 12% or bottom 20% (UI chrome zones).',
    negativeExtra: 'horizontal composition, subject cut at weird points by chrome, light areas at very top or very bottom',
  },

  // ── Instagram Reels 9:16 ────────────────────────────────────────────────
  'instagram_reels_9:16': {
    aspectRatio: '9:16',
    compositionZones: 'Full-screen vertical (9:16). Reels UI: top 8% has status bar, bottom 35% has engagement bar (likes, comments, share, audio). Active safe zone: 8% to 65%. Subject must be fully visible in safe zone. Lower 65-80% dark for text.',
    layoutConstraints: 'High-energy Reels format. Shorter text, punchier. Eyebrow: max 3 words. Headline: max 5 words — must hit instantly. CTA: very short, action verb. Overlay at bottom of safe zone (65-80% height range).',
    imgConstraints: 'Dynamic, energetic composition. Motion blur or action-freeze aesthetic. High contrast. Subject in dynamic pose or peak-action moment. Must feel scroll-stopping in 0.5 seconds.',
    negativeExtra: 'static boring composition, dull lighting, subject at very bottom, key elements near edges',
  },

  // ── Instagram Carrossel ──────────────────────────────────────────────────
  'instagram_carrossel_1:1': {
    aspectRatio: '1:1',
    compositionZones: 'Carousel slide (1:1). Slide 1 is the hook — must create curiosity gap or tension. Composition: consistent visual anchor (same position for subject or color accent across slides). Lower 20%: dark for text.',
    layoutConstraints: 'Carousel hook logic: eyebrow creates the open loop (Zeigarnik). Headline is the tension point. Body reveals the hook. CTA on last slide only — for mid slides, use an implied "swipe" invitation. Max 6 words headline.',
    imgConstraints: 'Consistent visual style across slides — same color temperature, same lens feel. Slide 1: widest shot (context). Slide 2+: zoom-in details or data.',
    negativeExtra: 'inconsistent color grading, radically different compositions between slides',
  },

  // ── Facebook Feed ───────────────────────────────────────────────────────
  'facebook_feed_1:1': {
    aspectRatio: '1:1',
    compositionZones: 'Facebook feed (1:1). No UI chrome within image. Full use of frame. Lower 20% dark near-black for text overlay. Subject in upper 65%.',
    layoutConstraints: 'Facebook audience tends older, prefers clarity. Eyebrow: context-setting, max 5 words. Headline: direct benefit, max 8 words. Body: optional proof point. CTA: explicit action.',
    imgConstraints: 'Warmer, more accessible aesthetic vs Instagram. Real people and environments perform better than abstract. Clear subject, clean background.',
    negativeExtra: 'overly stylized or cold aesthetic, pure abstract without human element',
  },

  // ── LinkedIn Feed / Post ─────────────────────────────────────────────────
  'linkedin_feed_1.91:1': {
    aspectRatio: '1.91:1',
    compositionZones: 'LinkedIn post image (1.91:1 wide). Professional context — image appears in feed with preview. Subject should be in left or center. Right side can have clean space for text overlay.',
    layoutConstraints: 'Professional tone mandatory. No aggressive urgency or emotional manipulation triggers. Eyebrow: authority signal or data point. Headline: business outcome, max 8 words. Body: credibility marker. CTA: subtle, professional.',
    imgConstraints: 'Corporate, clean, high-production aesthetic. Office environments, professional settings, data visualization, institutional photography. Avoid extreme close-ups of faces. Solid or blurred backgrounds work well.',
    negativeExtra: 'casual lifestyle, party scenes, overly casual people, bright neon colors, playful illustration style',
  },

  // ── YouTube Thumbnail 16:9 ──────────────────────────────────────────────
  'youtube_thumbnail_16:9': {
    aspectRatio: '16:9',
    compositionZones: 'YouTube thumbnail (16:9). Subject typically right-half of frame. Left half available for text overlay. Or: dramatic center-frame with text at top or bottom. Thumbnail must read clearly at 120px × 68px.',
    layoutConstraints: 'YouTube thumbnails need EXTREME contrast and clarity at tiny sizes. Eyebrow: none needed. Headline: max 5 words, very large implied font. NO body text — thumbnail too small. CTA: not in image (below video). Overlay only if it adds clarity.',
    imgConstraints: 'High saturation, punchy contrast, clear focal point. Person with exaggerated facial expression, or strong object close-up, or dramatic scene. Must feel clickable at small scale.',
    negativeExtra: 'soft muted colors, complex scenes with many elements, text-heavy compositions, subtle expressions',
  },

  // ── OOH / Outdoor / Busdoor ─────────────────────────────────────────────
  'ooh_outdoor_3:1': {
    aspectRatio: '3:1',
    compositionZones: 'Out-of-home billboard (3:1 wide). Viewed from 3–50m at speed. Text must be readable at extreme distance. Keep composition ULTRA-SIMPLE: maximum 2 visual elements.',
    layoutConstraints: 'OOH rules: max 7 words total. NO body text — driver/pedestrian has 3 seconds. Headline must work WITHOUT eyebrow. Headline: ultra-bold, max 5 words. CTA: max 3 words, URL or brand only. Overlays cover full lower 30% with maximum opacity.',
    imgConstraints: 'Extreme simplicity — one hero subject, minimal background noise. Giant scale feels (aerial, wide establishing). Maximum contrast between subject and background. Bold silhouettes. Avoid fine detail that disappears at distance.',
    negativeExtra: 'complex busy scenes, fine texture details, multiple focal points, gradient backgrounds that reduce readability',
  },

  // ── Google Display / Banner ─────────────────────────────────────────────
  'google_display_1.91:1': {
    aspectRatio: '1.91:1',
    compositionZones: 'Digital display banner (1.91:1). Product or service hero in center-right. Text zone on left. Clean and professional — this is performance ad territory.',
    layoutConstraints: 'Performance ad — clarity over creativity. Eyebrow: price, offer, or benefit hook. Headline: direct, factual, max 6 words. CTA: strong action verb + noun. No body text needed.',
    imgConstraints: 'Product-focused or benefit-focused imagery. Clean, high-key lighting. White or neutral background acceptable. Product at prominent scale.',
    negativeExtra: 'dark moody scenes, abstract compositions without clear product/subject, overly artistic treatment',
  },
};

/**
 * Resolves format-specific rules from platform + format strings.
 * Falls back to a generic baseline if no specific rule matches.
 */
function resolveFormatRules(platform?: string, format?: string): FormatRule {
  const p = (platform || '').toLowerCase();
  const f = (format || '').toLowerCase();

  // Story/Reels detection
  if (f.includes('story') || f.includes('storie') || f.includes('9:16') || f.includes('9 16')) {
    if (f.includes('reel') || f.includes('short')) return FORMAT_RULES['instagram_reels_9:16'];
    return FORMAT_RULES['instagram_story_9:16'];
  }
  if (f.includes('reel') || f.includes('short')) return FORMAT_RULES['instagram_reels_9:16'];

  // Carrossel
  if (f.includes('carros') || f.includes('carousel')) return FORMAT_RULES['instagram_carrossel_1:1'];

  // YouTube
  if (p.includes('youtube') || p.includes('you tube') || f.includes('youtube') || f.includes('thumbnail')) return FORMAT_RULES['youtube_thumbnail_16:9'];

  // OOH
  if (p.includes('ooh') || p.includes('outdoor') || p.includes('busdoor') || f.includes('outdoor') || f.includes('busdoor') || f.includes('ooh') || f.includes('3:1')) return FORMAT_RULES['ooh_outdoor_3:1'];

  // LinkedIn
  if (p.includes('linkedin') || f.includes('linkedin')) return FORMAT_RULES['linkedin_feed_1.91:1'];

  // Google Display
  if (p.includes('google') || p.includes('display') || f.includes('display') || f.includes('banner')) return FORMAT_RULES['google_display_1.91:1'];

  // Facebook
  if (p.includes('facebook') || p.includes('fb') || p.includes('meta')) return FORMAT_RULES['facebook_feed_1:1'];

  // Instagram 4:5
  if (f.includes('4:5') || f.includes('4 5') || f.includes('portrait')) return FORMAT_RULES['instagram_feed_4:5'];

  // Default: Instagram Feed 1:1
  return FORMAT_RULES['instagram_feed_1:1'];
}

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

function buildUserPrompt(
  params: OrchestrateParams,
  memoryBlock?: string,
): string {
  const { copy, gatilho, brand, format, platform, learningContext, brandTokens } = params;
  const brandName = brand?.name || '';
  const brandColor = brand?.primaryColor || '#F5C518';
  const segment = brand?.segment || '';

  // Resolve format-specific art direction rules
  const rule = resolveFormatRules(platform, format);
  const aspectRatio = rule.aspectRatio;

  const gatilhoDirective = gatilho ? GATILHO_DIRECTIVES[gatilho] || '' : '';
  const gatilhoLabel = gatilho ? `${gatilho}` : 'General';
  const knowledge = resolveArtDirectionKnowledge({
    copy,
    platform,
    format,
    trigger: gatilho,
    brandTokens,
    segment,
  });

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
${buildArtDirectionKnowledgeBlock(knowledge)}
${memoryBlock ? `\nART DIRECTION MEMORY (use as external repertoire and trend context):\n${memoryBlock}\n` : ''}
FORMAT-SPECIFIC ART DIRECTION RULES (MANDATORY — apply strictly):
COMPOSITION ZONES: ${rule.compositionZones}
IMAGE CONSTRAINTS: ${rule.imgConstraints}
LAYOUT CONSTRAINTS: ${rule.layoutConstraints}

YOUR JOB — produce a JSON object with two top-level keys: "imgPrompt" and "layout".

"imgPrompt" is the background image generation prompt:
- "positive": cinematic scene description in English, max 200 words. Follow the COMPOSITION ZONES and IMAGE CONSTRAINTS above strictly. Absolutely no text, no watermarks, no logos, no typography anywhere in the image.
- "negative": comma-separated negative prompt to protect the text zone and quality: "text, words, letters, watermarks, logos, typography, blurry lower third, bright lower 20%, light background at bottom, washed out shadows, CGI plastic, distorted anatomy, ${rule.negativeExtra}"
- "aspectRatio": "${aspectRatio}"

"layout" is the text layer decisions — follow LAYOUT CONSTRAINTS above:
- "eyebrow": short teaser text above headline (2–5 words, ALL CAPS, interrogation or statement that creates tension matching the trigger). In Portuguese.
- "headline": the main visual message (4–10 words). Can be sentence-case or ALL CAPS depending on trigger. Should be the most impactful line from the copy or a rewrite of it. In Portuguese.
- "accentWord": one word or short phrase from the headline that gets visual emphasis (color highlight). Pick the word with highest emotional charge.
- "accentColor": hex color for the accent word. Use brand color ${brandColor} if it reads well, or choose a complementary accent (gold #F5C518 for tension/anchor, electric blue #00B4FF for credibility, red #FF2D2D for urgency).
- "cta": call-to-action button text (2–5 words). In Portuguese. Action-oriented.
- "body": supporting proof point or social proof text (1 short sentence, max 12 words). In Portuguese. Can be empty string if not needed.
- "overlayStrength": number 0.0–1.0 — how strong the bottom overlay gradient should be. Higher for darker images (0.6–0.8), lower for already-dark scenes (0.4–0.6).
- "designRationale": explain in one short sentence why the visual hierarchy fits the copy and the channel. In Portuguese.

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
    "overlayStrength": 0.72,
    "designRationale": "A headline curta e o contraste alto priorizam leitura instantânea no feed."
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
  const memory = await buildArtDirectionMemoryContext({
    tenantId: params.tenantId,
    clientId: params.clientId,
    platform: params.platform,
    segment: params.brand?.segment,
    conceptLimit: 4,
    referenceLimit: 4,
    trendLimit: 4,
  });
  const userPrompt = buildUserPrompt(params, memory.promptBlock);
  const rule = resolveFormatRules(params.platform, params.format);
  const aspectRatio = rule.aspectRatio;
  const knowledge = resolveArtDirectionKnowledge({
    copy: params.copy,
    platform: params.platform,
    format: params.format,
    trigger: params.gatilho,
    brandTokens: params.brandTokens,
    segment: params.brand?.segment,
  });

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
      designRationale: parsed.layout?.designRationale || knowledge.strategySummary,
    },
    visualStrategy: {
      intent: knowledge.visualIntent,
      urgencyLevel: knowledge.urgencyLevel,
      informationDensity: knowledge.informationDensity,
      referenceMovements: knowledge.referenceMovements,
      strategySummary: knowledge.strategySummary,
      trendSignals: memory.trends.map((item) => item.tag),
      referenceExamples: memory.references.map((item) => ({ title: item.title, sourceUrl: item.source_url })),
    },
  };
}
