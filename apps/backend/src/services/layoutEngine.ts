/**
 * Layout Engine — generates structured composition layouts (layers) for ad creatives.
 *
 * Takes copy + art direction + format → returns positioned layers ready for rendering.
 * The key innovation: image prompts include spatial directives so the AI generates
 * backgrounds that "know" where text will be overlaid.
 */
import { generateCompletion } from './ai/claudeService';

// ── Types ────────────────────────────────────────────────────────────────────

export type LayoutLayer = {
  id: string;
  type: 'image' | 'text' | 'logo' | 'shape' | 'cta_button';
  // Position as fractions (0-1) of canvas dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;

  // Content
  content?: string;        // text content for text/cta layers
  imagePrompt?: string;    // AI prompt for image layers
  imageUrl?: string;       // URL if already generated

  // Styling
  style: {
    fontFamily?: string;
    fontSize?: number;       // px at 1080px canvas width
    fontWeight?: number;
    color?: string;          // hex
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
    letterSpacing?: number;
    borderRadius?: number;
    padding?: number;
    textTransform?: 'none' | 'uppercase' | 'lowercase';
    textShadow?: string;
  };
};

export type GeneratedLayout = {
  width: number;           // px
  height: number;          // px
  backgroundColor: string; // hex
  layers: LayoutLayer[];
  imagePrompt: string;     // final prompt for background image (layout-aware)
  spatialDirective: string; // where clean space is needed
  compositionType: string;  // text-top | text-bottom | text-overlay | split | minimal
};

export type LayoutInput = {
  copy: {
    headline: string;
    body?: string;
    cta: string;
  };
  artDirection: {
    color_palette?: string[];
    primary_color?: string;
    accent_color?: string;
    typography?: {
      headline_style?: string;
      body_style?: string;
      cta_style?: string;
    };
    photo_directive?: string;
    composition_type?: string;
    mood?: string;
  };
  format: string;          // 1:1, 9:16, 16:9, 4:5, etc.
  logoUrl?: string;
  platform?: string;
};

// ── Format dimensions ────────────────────────────────────────────────────────

const FORMAT_SIZES: Record<string, { width: number; height: number }> = {
  '1:1':   { width: 1080, height: 1080 },
  '4:5':   { width: 1080, height: 1350 },
  '9:16':  { width: 1080, height: 1920 },
  '16:9':  { width: 1920, height: 1080 },
  '4:3':   { width: 1080, height: 810 },
  '3:4':   { width: 810, height: 1080 },
};

function resolveSize(format: string): { width: number; height: number } {
  return FORMAT_SIZES[format] ?? FORMAT_SIZES['1:1'];
}

// ── Main function ────────────────────────────────────────────────────────────

export async function generateLayout(input: LayoutInput): Promise<GeneratedLayout> {
  const { width, height } = resolveSize(input.format);
  const isVertical = height > width;
  const isWide = width > height;
  const headlineLen = input.copy.headline.length;
  const hasBody = !!input.copy.body && input.copy.body.length > 0;

  const palette = input.artDirection.color_palette ?? ['#ffffff', '#000000'];
  const primary = input.artDirection.primary_color ?? palette[0] ?? '#000000';
  const accent = input.artDirection.accent_color ?? palette[1] ?? '#E85219';

  const res = await generateCompletion({
    systemPrompt: `Você é um designer gráfico sênior especializado em layouts para peças publicitárias digitais. Você cria composições que são esteticamente sofisticadas e funcionais.

REGRAS DE COMPOSIÇÃO:
1. Hierarquia visual clara: headline > image > CTA > body
2. Espaço negativo é essencial — não encha tudo
3. CTA deve ter contraste alto e ser facilmente clicável
4. Logo sempre visível mas discreto (canto, não central)
5. Texto sobre imagem precisa de contraste (overlay escuro, ou área limpa)
6. Formatos verticais (9:16): textos maiores, elementos empilhados
7. Formatos wide (16:9): layout lateral, texto de um lado imagem do outro
8. Feed (1:1): equilíbrio entre imagem e texto`,

    prompt: `Crie um layout para esta peça publicitária.

COPY:
- Headline: "${input.copy.headline}" (${headlineLen} caracteres)
${hasBody ? `- Body: "${input.copy.body}"` : '- Body: (sem body copy)'}
- CTA: "${input.copy.cta}"

DIREÇÃO DE ARTE:
- Paleta: ${palette.join(', ')}
- Cor primária: ${primary}
- Cor de destaque: ${accent}
- Mood: ${input.artDirection.mood ?? 'profissional'}
- Composição sugerida: ${input.artDirection.composition_type ?? 'auto'}
${input.artDirection.typography ? `- Tipografia headline: ${input.artDirection.typography.headline_style ?? 'bold sans-serif'}` : ''}

FORMATO: ${input.format} (${width}×${height}px)
PLATAFORMA: ${input.platform ?? 'Instagram'}
TEM LOGO: ${input.logoUrl ? 'sim' : 'não'}

Retorne SOMENTE JSON válido com este formato:
{
  "compositionType": "text-top|text-bottom|text-overlay|split-left|split-right|minimal|hero-center",
  "backgroundColor": "#hex",
  "spatialDirective": "frase descrevendo onde a imagem deve ter espaço limpo, ex: leave clean area in bottom 35% for text",
  "layers": [
    {
      "id": "bg_image",
      "type": "image",
      "x": 0, "y": 0, "width": 1, "height": 1,
      "zIndex": 0,
      "style": {}
    },
    {
      "id": "overlay",
      "type": "shape",
      "x": 0, "y": 0.65, "width": 1, "height": 0.35,
      "zIndex": 1,
      "style": { "backgroundColor": "rgba(0,0,0,0.5)" }
    },
    {
      "id": "headline",
      "type": "text",
      "content": "${input.copy.headline}",
      "x": 0.05, "y": 0.68, "width": 0.9, "height": 0.12,
      "zIndex": 2,
      "style": { "fontFamily": "Inter", "fontSize": 42, "fontWeight": 800, "color": "#ffffff", "textAlign": "left" }
    }
  ]
}

IMPORTANTE:
- Posições x, y, width, height são frações 0-1 do canvas
- fontSize em px para canvas de ${width}px de largura
- Inclua layers para: bg_image, headline, cta${hasBody ? ', body' : ''}${input.logoUrl ? ', logo' : ''}
- Overlay é opcional (use se texto fica sobre imagem complexa)
- Adapte o layout ao formato: ${isVertical ? 'VERTICAL — empilhe elementos' : isWide ? 'WIDE — use layout lateral' : 'QUADRADO — equilíbrio'}`,

    temperature: 0.4,
    maxTokens: 1500,
  });

  try {
    const text = res.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in layout response');
    const parsed = JSON.parse(jsonMatch[0]);

    // Inject logo layer if we have a URL and layout didn't include one
    const hasLogo = parsed.layers?.some((l: any) => l.type === 'logo');
    if (input.logoUrl && !hasLogo) {
      parsed.layers.push({
        id: 'logo',
        type: 'logo',
        x: 0.04,
        y: 0.04,
        width: 0.12,
        height: 0.08,
        zIndex: 10,
        imageUrl: input.logoUrl,
        style: {},
      });
    }

    // Build image prompt with spatial awareness
    const photoDirective = input.artDirection.photo_directive ?? 'professional photography, high quality';
    const imagePrompt = `${photoDirective}, ${parsed.spatialDirective || 'balanced composition with clean areas for text overlay'}, no text in image, no watermark, ${input.artDirection.mood ?? 'professional'} mood`;

    return {
      width,
      height,
      backgroundColor: parsed.backgroundColor ?? primary,
      layers: parsed.layers ?? [],
      imagePrompt,
      spatialDirective: parsed.spatialDirective ?? '',
      compositionType: parsed.compositionType ?? 'text-overlay',
    };
  } catch {
    // Fallback: simple text-bottom layout
    return buildFallbackLayout(input, width, height, primary, accent);
  }
}

// ── Fallback layout ──────────────────────────────────────────────────────────

function buildFallbackLayout(
  input: LayoutInput,
  width: number,
  height: number,
  primary: string,
  accent: string,
): GeneratedLayout {
  const layers: LayoutLayer[] = [
    {
      id: 'bg_image', type: 'image',
      x: 0, y: 0, width: 1, height: 0.65,
      zIndex: 0, style: {},
    },
    {
      id: 'text_bg', type: 'shape',
      x: 0, y: 0.65, width: 1, height: 0.35,
      zIndex: 1, style: { backgroundColor: primary },
    },
    {
      id: 'headline', type: 'text',
      content: input.copy.headline,
      x: 0.06, y: 0.67, width: 0.88, height: 0.12,
      zIndex: 2,
      style: {
        fontFamily: 'Inter', fontSize: 36, fontWeight: 800,
        color: '#ffffff', textAlign: 'left', lineHeight: 1.1,
      },
    },
    {
      id: 'cta', type: 'cta_button',
      content: input.copy.cta,
      x: 0.06, y: 0.88, width: 0.4, height: 0.06,
      zIndex: 2,
      style: {
        fontFamily: 'Inter', fontSize: 16, fontWeight: 700,
        color: '#ffffff', backgroundColor: accent,
        textAlign: 'center', borderRadius: 24, padding: 12,
      },
    },
  ];

  if (input.copy.body) {
    layers.push({
      id: 'body', type: 'text',
      content: input.copy.body,
      x: 0.06, y: 0.78, width: 0.88, height: 0.08,
      zIndex: 2,
      style: {
        fontFamily: 'Inter', fontSize: 16, fontWeight: 400,
        color: '#ffffffcc', textAlign: 'left', lineHeight: 1.4,
      },
    });
  }

  if (input.logoUrl) {
    layers.push({
      id: 'logo', type: 'logo',
      x: 0.04, y: 0.04, width: 0.12, height: 0.08,
      zIndex: 10, imageUrl: input.logoUrl, style: {},
    });
  }

  const photoDirective = input.artDirection.photo_directive ?? 'professional photography';
  return {
    width, height,
    backgroundColor: primary,
    layers,
    imagePrompt: `${photoDirective}, clean composition, subject in upper half, no text, no watermark`,
    spatialDirective: 'leave bottom 35% clean for text overlay',
    compositionType: 'text-bottom',
  };
}
