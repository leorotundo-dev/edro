import {
  buildArtDirectionCanonicalCritiqueBlock,
  buildArtDirectionCanonicalDoctrineBlock,
} from './artDirectionCanonicalFramework';

export type ArtDirectionKnowledgeParams = {
  copy?: string | null;
  platform?: string | null;
  format?: string | null;
  trigger?: string | null;
  briefing?: { title?: string; payload?: any } | null;
  brandTokens?: Record<string, any> | null;
  segment?: string | null;
};

export type ArtDirectionKnowledgeContext = {
  urgencyLevel: 'low' | 'medium' | 'high';
  informationDensity: 'low' | 'medium' | 'high';
  visualIntent: string;
  referenceMovements: string[];
  designPrinciples: string[];
  layoutHeuristics: string[];
  accessibilityRules: string[];
  typographyGuidance: string[];
  imageDirectives: string[];
  critiqueFocus: string[];
  strategySummary: string;
};

const URGENCY_PATTERNS = [
  /\b(agora|hoje|ultim[oa]s?|últim[oa]s?|corra|so hoje|só hoje|imperdivel|imperdível|urgente|acabando|prazo)\b/i,
  /!{1,}/,
  /\b(\d+%\s*off|\d+x sem juros|desconto|oferta|promo[cç][aã]o)\b/i,
];

const PREMIUM_PATTERNS = [
  /\b(premium|sofisticad[oa]|alto padr[aã]o|lux[oa]|exclusiv[oa]|elegante)\b/i,
];

const COMMUNITY_PATTERNS = [
  /\b(comunidade|juntos|clientes|depoimentos|quem usa|pessoas|time|equipe)\b/i,
];

const AUTHORITY_PATTERNS = [
  /\b(anos|resultados|dados|n[uú]meros|especialista|autoridade|certifica[cç][aã]o|comprovado)\b/i,
];

const GENZ_PATTERNS = [
  /\b(trend|viral|tiktok|meme|drops|hype|street|collab|collage|colagem)\b/i,
];

function uniq(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (!out.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
      out.push(normalized);
    }
  }
  return out;
}

function inferUrgency(text: string): 'low' | 'medium' | 'high' {
  const hits = URGENCY_PATTERNS.filter((pattern) => pattern.test(text)).length;
  if (hits >= 2) return 'high';
  if (hits === 1) return 'medium';
  return 'low';
}

function inferInformationDensity(text: string): 'low' | 'medium' | 'high' {
  const length = text.length;
  const separators = (text.match(/[,:;•\-]/g) || []).length;
  const numericSignals = (text.match(/\d+/g) || []).length;
  if (length > 220 || separators >= 4 || numericSignals >= 3) return 'high';
  if (length > 90 || separators >= 2 || numericSignals >= 1) return 'medium';
  return 'low';
}

function inferVisualIntent(text: string, segment: string, platform: string): string {
  if (PREMIUM_PATTERNS.some((pattern) => pattern.test(text))) return 'editorial_premium';
  if (AUTHORITY_PATTERNS.some((pattern) => pattern.test(text)) || /(infra|industrial|saas|finan|tech|jur[ií]d)/i.test(segment)) {
    return 'authority_structured';
  }
  if (COMMUNITY_PATTERNS.some((pattern) => pattern.test(text))) return 'social_proof_human';
  if (GENZ_PATTERNS.some((pattern) => pattern.test(text))) return 'culture_driven_expressive';
  if (/linkedin/i.test(platform)) return 'authority_structured';
  return 'performance_conversion';
}

function formatHints(platform: string, format: string): string[] {
  const hints = ['definir um único foco principal antes dos elementos secundários'];
  const raw = `${platform} ${format}`.toLowerCase();
  if (raw.includes('9:16') || raw.includes('story') || raw.includes('reels')) {
    hints.push('proteger safe zones superior e inferior para UI nativa da plataforma');
    hints.push('headline curta e leitura instantânea em mobile');
  } else if (raw.includes('16:9') || raw.includes('banner') || raw.includes('youtube')) {
    hints.push('separar claramente zona de assunto e zona de texto em composição lateral');
  } else if (raw.includes('linkedin')) {
    hints.push('usar respiro e composição mais institucional, evitando ruído visual');
  } else {
    hints.push('equilibrar massa visual e espaço limpo para overlay sem sacrificar o sujeito');
  }
  if (raw.includes('carrossel')) {
    hints.push('manter consistência entre slides, variando enquadramento sem perder a coesão');
  }
  return hints;
}

export function resolveArtDirectionKnowledge(params: ArtDirectionKnowledgeParams): ArtDirectionKnowledgeContext {
  const copy = `${params.copy ?? ''} ${params.briefing?.title ?? ''} ${params.briefing?.payload?.objective ?? ''}`.trim();
  const normalizedCopy = copy.toLowerCase();
  const platform = params.platform ?? 'Instagram';
  const format = params.format ?? 'Feed 1:1';
  const segment = params.segment ?? '';
  const urgencyLevel = inferUrgency(normalizedCopy);
  const informationDensity = inferInformationDensity(normalizedCopy);
  const visualIntent = inferVisualIntent(normalizedCopy, segment, platform);
  const brandTokens = params.brandTokens ?? {};

  const referenceMovements = uniq([
    visualIntent === 'authority_structured' ? 'Design Suíço' : '',
    visualIntent === 'authority_structured' ? 'Editorial corporativo contemporâneo' : '',
    visualIntent === 'editorial_premium' ? 'Minimalismo editorial premium' : '',
    visualIntent === 'editorial_premium' ? 'Mid-century modern controlado' : '',
    visualIntent === 'culture_driven_expressive' ? 'Colagem contemporânea' : '',
    visualIntent === 'culture_driven_expressive' ? 'Pós-modernismo controlado' : '',
    visualIntent === 'performance_conversion' && urgencyLevel !== 'low' ? 'Pôster publicitário de varejo' : '',
    visualIntent === 'performance_conversion' ? 'Tipografia internacional aplicada à performance' : '',
    visualIntent === 'social_proof_human' ? 'Fotografia documental publicitária' : '',
    ...(Array.isArray(brandTokens.referenceStyles) ? brandTokens.referenceStyles : []),
  ]);

  const designPrinciples = uniq([
    'hierarquia visual explícita com um focal point dominante',
    informationDensity === 'high' ? 'reduzir ruído e agrupar informações por proximidade e contraste' : 'usar proximidade e contraste para leitura imediata',
    urgencyLevel === 'high' ? 'priorizar impacto no primeiro olhar com contraste alto e ritmo visual rápido' : '',
    visualIntent === 'authority_structured' ? 'usar grid rígido e alinhamentos consistentes para transmitir confiança' : '',
    visualIntent === 'editorial_premium' ? 'valorizar respiro, refinamento material e ritmo editorial' : '',
    visualIntent === 'social_proof_human' ? 'preservar naturalidade humana e autenticidade da cena' : '',
  ]);

  const layoutHeuristics = uniq([
    ...formatHints(platform, format),
    informationDensity === 'high' ? 'separar headline, prova e CTA em níveis claros de leitura' : 'evitar competição entre headline e CTA',
    urgencyLevel === 'high' ? 'usar headline curta, contrastada e ancorada perto da área de conversão' : '',
    visualIntent === 'editorial_premium' ? 'evitar excesso de selos e ornamentos que barateiem a percepção' : '',
  ]);

  const accessibilityRules = uniq([
    'garantir contraste mínimo AA entre texto e fundo',
    'evitar texto sobre áreas muito detalhadas ou com luminância instável',
    'não depender apenas da cor para comunicar prioridade',
    informationDensity === 'high' ? 'preferir tipografia de alta legibilidade e blocos curtos' : '',
  ]);

  const typographyGuidance = uniq([
    visualIntent === 'authority_structured' ? 'sans-serif limpa, estável e corporativa' : '',
    visualIntent === 'editorial_premium' ? 'serifada elegante ou sans refinada com alto controle de espaço' : '',
    visualIntent === 'performance_conversion' ? 'sans-serif bold ou condensed com leitura instantânea' : '',
    visualIntent === 'culture_driven_expressive' ? 'tipografia expressiva com controle para não sacrificar legibilidade' : '',
    informationDensity === 'high' ? 'hierarquia tipográfica rigorosa entre headline, apoio e CTA' : '',
  ]);

  const imageDirectives = uniq([
    urgencyLevel === 'high' ? 'cenas com contraste energético, gesto forte e leitura instantânea' : '',
    visualIntent === 'authority_structured' ? 'ambiente limpo, profissional e com profundidade controlada' : '',
    visualIntent === 'editorial_premium' ? 'composição mais limpa, textura rica e iluminação sofisticada' : '',
    visualIntent === 'social_proof_human' ? 'presença humana autêntica, sem pose artificial excessiva' : '',
    visualIntent === 'culture_driven_expressive' ? 'camadas visuais mais ousadas, mas com foco claro e intenção controlada' : '',
  ]);

  const critiqueFocus = uniq([
    'clareza da hierarquia e legibilidade em tamanho real de mídia',
    'aderência à marca e coerência com estilo/mood',
    'adequação ao canal e ao formato',
    'contraste e acessibilidade para overlay',
    urgencyLevel === 'high' ? 'capacidade de parar o scroll sem parecer poluído' : '',
    informationDensity === 'high' ? 'organização da informação e ausência de competição entre blocos' : '',
  ]);

  const strategySummary = uniq([
    visualIntent === 'authority_structured' ? 'traduzir a copy em uma direção mais clara, confiável e estruturada' : '',
    visualIntent === 'editorial_premium' ? 'elevar a percepção de valor com sofisticação e respiro visual' : '',
    visualIntent === 'social_proof_human' ? 'conectar mensagem e prova social com humanidade e autenticidade' : '',
    visualIntent === 'culture_driven_expressive' ? 'buscar linguagem visual mais atual e culturalmente carregada sem perder foco' : '',
    visualIntent === 'performance_conversion' ? 'maximizar leitura, contraste e intenção de conversão' : '',
  ]).join('; ');

  return {
    urgencyLevel,
    informationDensity,
    visualIntent,
    referenceMovements,
    designPrinciples,
    layoutHeuristics,
    accessibilityRules,
    typographyGuidance,
    imageDirectives,
    critiqueFocus,
    strategySummary,
  };
}

export function buildArtDirectionKnowledgeBlock(context: ArtDirectionKnowledgeContext): string {
  return `${buildArtDirectionCanonicalDoctrineBlock()}

MOTOR DE DIREÇÃO DE ARTE (aplique como heurísticas operacionais):
- Intenção visual: ${context.visualIntent}
- Urgência: ${context.urgencyLevel}
- Densidade de informação: ${context.informationDensity}
- Repertório de referência: ${context.referenceMovements.join(', ') || 'nenhum específico'}
- Princípios obrigatórios: ${context.designPrinciples.join('; ')}
- Heurísticas de layout: ${context.layoutHeuristics.join('; ')}
- Regras de acessibilidade: ${context.accessibilityRules.join('; ')}
- Direção tipográfica: ${context.typographyGuidance.join('; ')}
- Direção de imagem: ${context.imageDirectives.join('; ')}
- Focos de crítica: ${context.critiqueFocus.join('; ')}
- Estratégia resumida: ${context.strategySummary}`;
}

export function buildArtDirectionCritiqueBlock(context: ArtDirectionKnowledgeContext): string {
  return `${buildArtDirectionCanonicalCritiqueBlock()}

CRITIQUE FRAMEWORK:
- Julgue a peça com base em: ${context.critiqueFocus.join('; ')}
- Considere estas regras de acessibilidade: ${context.accessibilityRules.join('; ')}
- A hierarquia precisa refletir: ${context.designPrinciples.join('; ')}
- O layout deve respeitar: ${context.layoutHeuristics.join('; ')}
- A direção visual esperada é: ${context.strategySummary}`;
}
