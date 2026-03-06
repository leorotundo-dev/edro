import { generateCompletionWithVision } from './claudeService';

export interface CritiqueResult {
  pass: boolean;
  score: number;
  issues: string[];
  additionalNegative?: string;
}

const CRITIC_SYSTEM = `You are an expert art director and image quality evaluator for advertising agencies.
Your job is to evaluate AI-generated images for commercial use in ad campaigns.
You must respond with a valid JSON object — no prose, no markdown, just JSON.`;

function buildCritiquePrompt(gatilho?: string, aspectRatio?: string): string {
  return `Evaluate this AI-generated image for use as an advertising background.

ASPECT RATIO: ${aspectRatio || '1:1'}
PSYCHOLOGICAL TRIGGER: ${gatilho || 'General'}

Respond with ONLY a JSON object:
{
  "score": <number 0–10>,
  "pass": <true if score >= 7>,
  "issues": [<list of problems found, empty array if none>],
  "additionalNegative": "<extra comma-separated terms to add to negative prompt for a retry, empty string if no retry needed>"
}

MANDATORY FAILURE CRITERIA (any one = immediate fail, score ≤ 4):
1. Lower 20% of the image is NOT dark (luminance > 25%) — this zone must be near-black for text overlay
2. Visible text, letters, words, watermarks, logos, or typography anywhere in the image
3. Severe blur, heavy noise, or major rendering artifacts

QUALITY CRITERIA (affect score, not automatic fail):
4. Upper 60% has a clear, focused subject with good detail
5. Middle 20% shows natural vignette / depth transition toward the darker lower zone
6. No CGI-plastic look, distorted anatomy, or uncanny valley faces
7. Color palette and emotional temperature match the trigger: ${gatilho || 'General'}
8. Overall cinematic quality suitable for professional advertising

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
}): Promise<CritiqueResult> {
  const prompt = buildCritiquePrompt(params.gatilho, params.aspectRatio);

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
  };
}
