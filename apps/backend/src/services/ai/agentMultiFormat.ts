/**
 * Agent Multi-Format — JARVIS Multi-Format Asset Generator
 *
 * Given a briefing/campaign concept + behavioral context,
 * generates assets in multiple formats:
 *   - radio_spot       : 30-second radio script (PT, timing cues, voice direction)
 *   - film_brief_30s   : 30-second film brief (scene, VO, CTA, mood)
 *   - email_marketing  : complete email (subject, preview, header, body, CTA)
 *   - print_ad         : print ad copy (headline, subheadline, body, tagline, CTA, image direction)
 *   - social_post      : social post (hook, body, CTA)
 *
 * Each format uses the behavioral context (persona + trigger + micro_behavior) from the briefing.
 * Each format is filed back to KB after generation.
 */

import { orchestrate } from './copyOrchestrator';
import { fileOutputToKb } from '../jarvisKbFilingService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportedFormat =
  | 'radio_spot'
  | 'film_brief_30s'
  | 'email_marketing'
  | 'print_ad'
  | 'social_post';

export interface MultiFormatParams {
  tenantId: string;
  clientId: string;
  /** Core concept or briefing description */
  concept: string;
  /** Target persona name/description */
  persona?: string;
  /** Campaign phase: historia | prova | convite */
  campaign_phase?: string;
  /** AMD/micro-behavior target (ex: salvar, clicar, pedir_proposta) */
  micro_behavior?: string;
  /** Behavioral triggers to apply */
  triggers?: string[];
  /** Client name */
  client_name?: string;
  /** Client segment */
  client_segment?: string;
  /** Which formats to generate */
  formats: SupportedFormat[];
}

export interface RadioSpotAsset {
  format: 'radio_spot';
  duration_seconds: 30;
  script: string;
  voice_direction: string;
  sound_design_notes: string;
}

export interface FilmBrief30sAsset {
  format: 'film_brief_30s';
  duration_seconds: 30;
  scene_description: string;
  voice_over: string;
  cta: string;
  mood: string;
  visual_references: string;
}

export interface EmailMarketingAsset {
  format: 'email_marketing';
  subject: string;
  preview_text: string;
  header: string;
  body_sections: Array<{ heading?: string; content: string }>;
  cta_button_text: string;
  cta_url_placeholder: string;
}

export interface PrintAdAsset {
  format: 'print_ad';
  headline: string;
  subheadline: string;
  body_copy: string;
  tagline: string;
  cta: string;
  image_direction: string;
}

export interface SocialPostAsset {
  format: 'social_post';
  platform: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}

export type GeneratedAsset =
  | RadioSpotAsset
  | FilmBrief30sAsset
  | EmailMarketingAsset
  | PrintAdAsset
  | SocialPostAsset;

export interface MultiFormatResult {
  assets: Partial<Record<SupportedFormat, GeneratedAsset>>;
  errors: Partial<Record<SupportedFormat, string>>;
  filed_to_kb: boolean;
}

// ── Format prompts ────────────────────────────────────────────────────────────

function buildBehavioralContext(params: MultiFormatParams): string {
  const lines: string[] = [];
  if (params.client_name) lines.push(`Cliente: ${params.client_name}`);
  if (params.client_segment) lines.push(`Segmento: ${params.client_segment}`);
  if (params.persona) lines.push(`Persona-alvo: ${params.persona}`);
  if (params.campaign_phase) lines.push(`Fase da campanha: ${params.campaign_phase}`);
  if (params.micro_behavior) lines.push(`AMD (ação desejada): ${params.micro_behavior}`);
  if (params.triggers?.length) lines.push(`Gatilhos comportamentais: ${params.triggers.join(', ')}`);
  lines.push(`Conceito: ${params.concept}`);
  return lines.join('\n');
}

function buildRadioPrompt(params: MultiFormatParams): string {
  const ctx = buildBehavioralContext(params);
  return `Você é um redator especialista em rádio publicitário brasileiro.

${ctx}

Crie um spot de rádio de 30 segundos em Português do Brasil.

Regras:
- 30 segundos = aproximadamente 75-80 palavras na locução
- Inclua marcações de tempo: [0s], [5s], [10s], [20s], [25s]
- Voz ativa, frase curta, ritmo natural
- O gatilho comportamental deve aparecer nos primeiros 5 segundos
- CTA claro e memorável nos últimos 5 segundos

Responda APENAS em JSON válido (sem markdown):
{
  "script": "Script completo com marcações de tempo [0s]...",
  "voice_direction": "Instrução para o locutor (tom, ritmo, ênfases)",
  "sound_design_notes": "Música de fundo, efeitos sonoros recomendados"
}`;
}

function buildFilmBriefPrompt(params: MultiFormatParams): string {
  const ctx = buildBehavioralContext(params);
  return `Você é um diretor criativo especialista em filmes publicitários de 30 segundos.

${ctx}

Crie um film brief de 30 segundos.

Estrutura:
- 0-5s: Abertura / hook visual
- 5-20s: Desenvolvimento / problema + solução
- 20-25s: Proof point
- 25-30s: CTA + logo/produto

Responda APENAS em JSON válido (sem markdown):
{
  "scene_description": "Descrição detalhada das cenas com timecodes",
  "voice_over": "Texto completo do voice-over",
  "cta": "Call-to-action final",
  "mood": "Tom emocional do filme (ex: inspirador, urgente, caloroso)",
  "visual_references": "Referências visuais, paleta, estilo de filmagem"
}`;
}

function buildEmailPrompt(params: MultiFormatParams): string {
  const ctx = buildBehavioralContext(params);
  return `Você é um especialista em email marketing comportamental.

${ctx}

Crie um email de marketing completo em Português do Brasil.

Regras:
- Assunto: máx 50 caracteres, com gatilho nos primeiros 3 palavras
- Preview text: 80-100 caracteres que complementem o assunto
- Estrutura de corpo: intro (problema/gancho) + desenvolvimento + prova/benefício + CTA
- CTA único e específico

Responda APENAS em JSON válido (sem markdown):
{
  "subject": "Assunto do email",
  "preview_text": "Texto de preview",
  "header": "Título/headline principal do email",
  "body_sections": [
    {"heading": "Seção 1 (opcional)", "content": "Texto da seção"},
    {"content": "Segunda seção sem heading"},
    {"heading": "Prova/Benefício", "content": "Texto"}
  ],
  "cta_button_text": "Texto do botão CTA",
  "cta_url_placeholder": "[URL_DA_OFERTA]"
}`;
}

function buildPrintAdPrompt(params: MultiFormatParams): string {
  const ctx = buildBehavioralContext(params);
  return `Você é um redator publicitário especialista em mídia impressa e OOH (out-of-home).

${ctx}

Crie o copy para um anúncio impresso.

Hierarquia visual:
1. Headline: o mais importante, deve parar o leitor
2. Subheadline: expande o headline
3. Body copy: argumento principal (máx 3 parágrafos curtos)
4. Tagline: assinatura memorável
5. CTA: ação específica
6. Image direction: o que a imagem deve comunicar

Responda APENAS em JSON válido (sem markdown):
{
  "headline": "Headline principal (máx 8 palavras, impacto máximo)",
  "subheadline": "Subheadline expansivo (1-2 linhas)",
  "body_copy": "Corpo do texto em 2-3 parágrafos curtos",
  "tagline": "Tagline/assinatura da marca",
  "cta": "Call-to-action específico",
  "image_direction": "Descrição do que a imagem deve mostrar/comunicar"
}`;
}

function buildSocialPostPrompt(params: MultiFormatParams): string {
  const ctx = buildBehavioralContext(params);
  return `Você é um especialista em conteúdo para redes sociais com foco em gatilhos comportamentais.

${ctx}

Crie um post para redes sociais (adequado para LinkedIn ou Instagram).

Regras:
- Hook: primeira linha deve parar o scroll (máx 10 palavras)
- Corpo: desenvolvimento em parágrafos curtos (máx 3-4 linhas cada)
- CTA: ação específica alinhada ao AMD

Responda APENAS em JSON válido (sem markdown):
{
  "platform": "linkedin ou instagram",
  "hook": "Primeira linha do post",
  "body": "Corpo completo do post",
  "cta": "Call-to-action final",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;
}

// ── Generator dispatcher ──────────────────────────────────────────────────────

async function generateSingleFormat(
  format: SupportedFormat,
  params: MultiFormatParams
): Promise<GeneratedAsset> {
  const promptBuilders: Record<SupportedFormat, (p: MultiFormatParams) => string> = {
    radio_spot: buildRadioPrompt,
    film_brief_30s: buildFilmBriefPrompt,
    email_marketing: buildEmailPrompt,
    print_ad: buildPrintAdPrompt,
    social_post: buildSocialPostPrompt,
  };

  const prompt = promptBuilders[format](params);

  const result = await orchestrate('institutional_copy', {
    prompt,
    temperature: 0.75,
    maxTokens: 1500,
  }, { tenant_id: params.tenantId, feature: `multi_format_${format}` });

  const output = result.output.trim();
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');

  let parsed: any;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? output.slice(start, end + 1) : output);
  } catch {
    throw new Error(`Invalid JSON response from AI for format ${format}`);
  }

  // Shape and type the result
  switch (format) {
    case 'radio_spot':
      return {
        format: 'radio_spot',
        duration_seconds: 30,
        script: parsed.script ?? '',
        voice_direction: parsed.voice_direction ?? '',
        sound_design_notes: parsed.sound_design_notes ?? '',
      };
    case 'film_brief_30s':
      return {
        format: 'film_brief_30s',
        duration_seconds: 30,
        scene_description: parsed.scene_description ?? '',
        voice_over: parsed.voice_over ?? '',
        cta: parsed.cta ?? '',
        mood: parsed.mood ?? '',
        visual_references: parsed.visual_references ?? '',
      };
    case 'email_marketing':
      return {
        format: 'email_marketing',
        subject: parsed.subject ?? '',
        preview_text: parsed.preview_text ?? '',
        header: parsed.header ?? '',
        body_sections: Array.isArray(parsed.body_sections) ? parsed.body_sections : [{ content: parsed.body ?? '' }],
        cta_button_text: parsed.cta_button_text ?? parsed.cta ?? '',
        cta_url_placeholder: parsed.cta_url_placeholder ?? '[URL]',
      };
    case 'print_ad':
      return {
        format: 'print_ad',
        headline: parsed.headline ?? '',
        subheadline: parsed.subheadline ?? '',
        body_copy: parsed.body_copy ?? '',
        tagline: parsed.tagline ?? '',
        cta: parsed.cta ?? '',
        image_direction: parsed.image_direction ?? '',
      };
    case 'social_post':
      return {
        format: 'social_post',
        platform: parsed.platform ?? 'instagram',
        hook: parsed.hook ?? '',
        body: parsed.body ?? '',
        cta: parsed.cta ?? '',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      };
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate multi-format advertising assets from a concept + behavioral context.
 * Files all generated assets back to JARVIS KB as hypothesis-level entries.
 */
export async function generateMultiFormatAssets(
  params: MultiFormatParams
): Promise<MultiFormatResult> {
  const assets: Partial<Record<SupportedFormat, GeneratedAsset>> = {};
  const errors: Partial<Record<SupportedFormat, string>> = {};

  // Generate each requested format (sequential to avoid rate limits)
  for (const format of params.formats) {
    try {
      const asset = await generateSingleFormat(format, params);
      assets[format] = asset;
    } catch (err: any) {
      errors[format] = err.message || 'Generation failed';
      console.error(`[agentMultiFormat] Failed to generate ${format}:`, err.message);
    }

    // Brief pause between formats
    await new Promise(r => setTimeout(r, 500));
  }

  // File generated assets back to KB
  let filed_to_kb = false;
  if (Object.keys(assets).length > 0) {
    try {
      const assetSummary = Object.entries(assets)
        .map(([fmt, asset]) => {
          const a = asset as any;
          const preview = a.headline ?? a.subject ?? a.hook ?? a.script ?? a.scene_description ?? '';
          return `${fmt}: "${preview.slice(0, 100)}"`;
        })
        .join('\n');

      await fileOutputToKb(
        params.tenantId,
        params.clientId,
        assetSummary,
        'copy',
        {
          persona: params.persona,
          triggers: params.triggers,
          micro_behavior: params.micro_behavior,
          phase: params.campaign_phase,
          metadata: {
            formats_generated: params.formats,
            concept: params.concept.slice(0, 200),
          },
        }
      );
      filed_to_kb = true;
    } catch (err) {
      console.warn('[agentMultiFormat] KB filing failed (non-critical):', err);
    }
  }

  return { assets, errors, filed_to_kb };
}
