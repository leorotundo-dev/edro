/**
 * Visual Style Analyzer — extracts visual patterns from a client's Instagram posts
 * using Claude Vision. Results cached in client_visual_style (expires every 14 days).
 */
import { query } from '../db';
import { generateCompletionWithVision } from './ai/claudeService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClientVisualStyle {
  dominant_colors: string[];
  color_harmony: string;
  photo_style: string;
  composition: string;
  mood: string;
  typography_style: string;
  text_placement: string;
  style_summary: string;
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Analyze a client's Instagram posts visually and cache the result.
 * Skips if a non-expired cache exists.
 */
export async function analyzeClientVisualStyle(
  tenantId: string,
  clientId: string,
  force = false,
): Promise<ClientVisualStyle | null> {
  // Check cache
  if (!force) {
    const cached = await loadCachedStyle(clientId);
    if (cached) return cached;
  }

  // Fetch top Instagram images by engagement
  const images = await fetchClientInstagramImages(tenantId, clientId, 12);
  if (images.length < 3) {
    // Not enough visual data to analyze
    return null;
  }

  // Analyze in batches of 4 (Claude Vision handles one image per call)
  const batchSize = 4;
  const analyses: string[] = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchAnalysis = await analyzeBatch(batch);
    if (batchAnalysis) analyses.push(batchAnalysis);
  }

  if (!analyses.length) return null;

  // Synthesize all batch analyses into final style
  const style = await synthesizeStyle(analyses, images.length);
  if (!style) return null;

  // Persist
  await upsertVisualStyle(tenantId, clientId, 'instagram', style, images);

  return style;
}

export interface CachedVisualStyle extends ClientVisualStyle {
  sample_count: number;
  sample_urls: string[];
  expires_at: string;
  analyzed_at: string;
}

/**
 * Load cached visual style (non-expired).
 */
export async function loadCachedStyle(
  clientId: string,
  source = 'instagram',
): Promise<CachedVisualStyle | null> {
  const res = await query<CachedVisualStyle>(
    `SELECT dominant_colors, color_harmony, photo_style, composition, mood,
            typography_style, text_placement, style_summary,
            sample_count, sample_urls, expires_at, analyzed_at
     FROM client_visual_style
     WHERE client_id = $1 AND source = $2 AND expires_at > now()
     LIMIT 1`,
    [clientId, source],
  );
  return res.rows[0] ?? null;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function fetchClientInstagramImages(
  tenantId: string,
  clientId: string,
  limit: number,
): Promise<string[]> {
  const res = await query<{ media_url: string }>(
    `SELECT media_url FROM social_listening_mentions
     WHERE tenant_id = $1 AND client_id = $2
       AND media_url IS NOT NULL AND media_url != ''
       AND platform = 'instagram'
     ORDER BY (engagement_likes + engagement_comments + engagement_shares) DESC
     LIMIT $3`,
    [tenantId, clientId, limit],
  );
  return res.rows.map(r => r.media_url);
}

async function analyzeBatch(imageUrls: string[]): Promise<string | null> {
  // Analyze each image individually (Claude Vision takes one image per call)
  const results: string[] = [];

  for (const url of imageUrls) {
    try {
      const res = await generateCompletionWithVision({
        imageUrl: url,
        prompt: `Analise esta imagem de um post de Instagram de uma marca/empresa.
Extraia em formato conciso:
- Cores dominantes (3-5 hex codes estimados)
- Estilo fotográfico (lifestyle/product/editorial/flat_lay/candid/studio)
- Composição (centered/rule_of_thirds/asymmetric/minimal/busy)
- Mood (warm/cool/vibrant/muted/dark/bright)
- Uso de tipografia (modern_sans/classic_serif/bold_display/handwritten/none)
- Posicionamento de texto (overlay/separate/minimal_text/heavy_text/no_text)

Responda em formato estruturado curto, sem markdown.`,
        temperature: 0.2,
        maxTokens: 300,
      });
      results.push(res.text);
    } catch {
      // Skip failed image analysis
    }
  }

  return results.length ? results.join('\n---\n') : null;
}

async function synthesizeStyle(
  batchAnalyses: string[],
  sampleCount: number,
): Promise<ClientVisualStyle | null> {
  const { generateCompletion } = await import('./ai/claudeService');

  const res = await generateCompletion({
    systemPrompt: `Você é um analista de identidade visual. Sintetize as análises visuais de posts do Instagram de um cliente em um perfil visual unificado. Retorne SOMENTE JSON válido.`,
    prompt: `Abaixo estão análises visuais de ${sampleCount} posts do Instagram deste cliente:

${batchAnalyses.join('\n\n===\n\n')}

Sintetize em um único perfil visual JSON:
{
  "dominant_colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "color_harmony": "complementary|analogous|monochromatic|triadic",
  "photo_style": "lifestyle|product|editorial|flat_lay|candid|studio",
  "composition": "centered|rule_of_thirds|asymmetric|minimal|busy",
  "mood": "warm|cool|vibrant|muted|dark|bright",
  "typography_style": "modern_sans|classic_serif|bold_display|handwritten|none",
  "text_placement": "overlay|separate|minimal_text|heavy_text",
  "style_summary": "Descrição de ~200 palavras do estilo visual deste cliente, descrevendo padrões consistentes, preferências estéticas e identidade visual observada nos posts. Escreva em português, tom profissional de diretor de arte."
}

Escolha o valor mais frequente/representativo para cada campo. O style_summary deve ser uma narrativa coesa.`,
    temperature: 0.3,
    maxTokens: 1200,
  });

  try {
    const text = res.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ClientVisualStyle;
    if (!parsed.style_summary || !parsed.dominant_colors) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function upsertVisualStyle(
  tenantId: string,
  clientId: string,
  source: string,
  style: ClientVisualStyle,
  sampleUrls: string[],
): Promise<void> {
  await query(
    `INSERT INTO client_visual_style
       (tenant_id, client_id, source, dominant_colors, color_harmony, photo_style,
        composition, mood, typography_style, text_placement, sample_urls, sample_count,
        style_summary, analyzed_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now() + INTERVAL '14 days')
     ON CONFLICT (client_id, source) DO UPDATE SET
       dominant_colors = EXCLUDED.dominant_colors,
       color_harmony = EXCLUDED.color_harmony,
       photo_style = EXCLUDED.photo_style,
       composition = EXCLUDED.composition,
       mood = EXCLUDED.mood,
       typography_style = EXCLUDED.typography_style,
       text_placement = EXCLUDED.text_placement,
       sample_urls = EXCLUDED.sample_urls,
       sample_count = EXCLUDED.sample_count,
       style_summary = EXCLUDED.style_summary,
       analyzed_at = now(),
       expires_at = now() + INTERVAL '14 days'`,
    [
      tenantId, clientId, source,
      style.dominant_colors, style.color_harmony, style.photo_style,
      style.composition, style.mood, style.typography_style, style.text_placement,
      sampleUrls, sampleUrls.length, style.style_summary,
    ],
  );
}
