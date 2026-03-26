import { generateCompletionWithVision } from './claudeService';
import {
  buildArtDirectionCritiqueBlock,
  resolveArtDirectionKnowledge,
} from './artDirectionKnowledge';
import { buildArtDirectionMemoryContext } from './artDirectionMemoryService';

export interface CritiqueResult {
  pass: boolean;
  score: number;
  issues: string[];
  additionalNegative?: string;
  dimensions?: Array<{ label: string; score: number; note?: string }>;
  recommendations?: string[];
  summary?: string;
}

const CRITIC_SYSTEM = `You are an expert art director and image quality evaluator for advertising agencies.
Your job is to evaluate AI-generated images for commercial use in ad campaigns.
You must respond with a valid JSON object — no prose, no markdown, just JSON.`;

function buildCritiquePrompt(params: {
  gatilho?: string;
  aspectRatio?: string;
  copy?: string;
  platform?: string;
  format?: string;
  brandName?: string;
  segment?: string;
  brandTokens?: Record<string, any> | null;
  memoryCritiqueBlock?: string;
}): string {
  const knowledge = resolveArtDirectionKnowledge({
    copy: params.copy,
    platform: params.platform,
    format: params.format ?? params.aspectRatio,
    trigger: params.gatilho,
    brandTokens: params.brandTokens,
    segment: params.segment,
  });
  return `Evaluate this AI-generated image for use as an advertising background.

ASPECT RATIO: ${params.aspectRatio || '1:1'}
PLATFORM: ${params.platform || 'General'}
PSYCHOLOGICAL TRIGGER: ${params.gatilho || 'General'}
COPY / MESSAGE: ${params.copy?.slice(0, 220) || 'Not provided'}
BRAND: ${params.brandName || 'Not provided'}${params.segment ? ` | SEGMENT: ${params.segment}` : ''}

${buildArtDirectionCritiqueBlock(knowledge)}
${params.memoryCritiqueBlock ? `\nMEMÓRIA EXTERNA DE CRÍTICA:\n${params.memoryCritiqueBlock}\n` : ''}

Respond with ONLY a JSON object:
{
  "score": <number 0–10>,
  "pass": <true if score >= 7>,
  "issues": [<list of problems found, empty array if none>],
  "additionalNegative": "<extra comma-separated terms to add to negative prompt for a retry, empty string if no retry needed>",
  "dimensions": [
    { "label": "Hierarchy", "score": <0-10>, "note": "<short note>" },
    { "label": "Brand Alignment", "score": <0-10>, "note": "<short note>" },
    { "label": "Accessibility", "score": <0-10>, "note": "<short note>" },
    { "label": "Channel Fit", "score": <0-10>, "note": "<short note>" }
  ],
  "recommendations": ["<practical fix 1>", "<practical fix 2>"],
  "summary": "<1 sentence with the art direction verdict>"
}

MANDATORY FAILURE CRITERIA (any one = immediate fail, score ≤ 4):
1. Lower 20% of the image is NOT dark (luminance > 25%) — this zone must be near-black for text overlay
2. Visible text, letters, words, watermarks, logos, or typography anywhere in the image
3. Severe blur, heavy noise, or major rendering artifacts

QUALITY CRITERIA (affect score, not automatic fail):
4. Upper 60% has a clear, focused subject with good detail
5. Middle 20% shows natural vignette / depth transition toward the darker lower zone
6. No CGI-plastic look, distorted anatomy, or uncanny valley faces
7. Color palette and emotional temperature match the trigger: ${params.gatilho || 'General'}
8. Overall cinematic quality suitable for professional advertising
9. Hierarchy, contrast, and empty space support future text overlay without conflict
10. The piece feels appropriate for the stated channel and format, not generic

If issues found, the "additionalNegative" field should contain specific terms that would help fix them in a regeneration (e.g. "bright lower third, text overlay visible, watermark, blurry"). If no issues, leave it as empty string.`;
}

/**
 * Critiques a generated image using Claude Vision.
 * Returns pass/fail + score + issues + optional additional negative prompt terms.
 * This is best-effort — callers should catch errors and proceed without critique.
 */
export async function critiqueGeneratedImage(params: {
  imageUrl: string;
  gatilho?: string;
  aspectRatio?: string;
  copy?: string;
  platform?: string;
  format?: string;
  brandName?: string;
  segment?: string;
  brandTokens?: Record<string, any> | null;
  tenantId?: string;
  clientId?: string | null;
}): Promise<CritiqueResult> {
  const memory = await buildArtDirectionMemoryContext({
    tenantId: params.tenantId,
    clientId: params.clientId,
    platform: params.platform,
    segment: params.segment,
    conceptLimit: 4,
    referenceLimit: 4,
    trendLimit: 4,
  });
  const prompt = buildCritiquePrompt({
    ...params,
    memoryCritiqueBlock: memory.critiqueBlock,
  });

  const result = await generateCompletionWithVision({
    prompt,
    imageUrl: params.imageUrl,
    systemPrompt: CRITIC_SYSTEM,
    temperature: 0.2,
    maxTokens: 400,
  });

  let raw = result.text.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If Claude returned invalid JSON, default to pass to avoid blocking the flow
    return { pass: true, score: 7, issues: [], additionalNegative: '' };
  }

  return {
    pass: Boolean(parsed.pass),
    score: typeof parsed.score === 'number' ? Math.max(0, Math.min(10, parsed.score)) : 5,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    additionalNegative: typeof parsed.additionalNegative === 'string' ? parsed.additionalNegative : '',
    dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}
