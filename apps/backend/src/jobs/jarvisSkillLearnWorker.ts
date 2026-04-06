/**
 * Jarvis Skill Learn Worker — Aprendizado Autônomo
 *
 * JARVIS sabe onde buscar conhecimento. Roda semanalmente (self-throttled).
 * Para cada categoria de conhecimento, busca fontes autoritativas,
 * extrai insights de craft e arquiva no KB permanente.
 *
 * Categorias:
 *   - publicidade_br     → Meio & Mensagem, Propmark, Cannes Lions Brasil
 *   - publicidade_global → AdAge, The Drum, Campaign, D&AD, Clio
 *   - plataformas        → Meta, Instagram, LinkedIn, TikTok novidades
 *   - design_arte        → Behance, Awwwards, It's Nice That, Communication Arts
 *   - tendencias_visuais → Pantone, Pinterest Predicts, tendências estéticas
 *   - comportamento      → Neuromarketing, behavioral economics, psicologia do consumo
 *   - cinema_foto        → Cinematografia, fotografia, referências visuais globais
 *   - tendencias_br      → Comportamento do consumidor brasileiro, pesquisas de mercado
 *
 * Resultado: jarvis_kb_entries com category='skill_learned', tenant_id='__agency__'
 * (conhecimento da agência, não de cliente específico)
 */

import { query } from '../db';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { orchestrate } from '../services/ai/copyOrchestrator';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Self-throttle: uma vez por semana ─────────────────────────────────────────

const lastRunByWeek: Record<string, boolean> = {};

function getWeekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── Registro de fontes autoritativas ─────────────────────────────────────────
//
// JARVIS sabe ONDE buscar conhecimento para cada domínio.
// Cada entrada define queries de pesquisa e o tipo de conhecimento esperado.

interface SkillSource {
  category: string;
  label: string;
  queries: string[];           // queries para Serper/Tavily
  extractionFocus: string;     // o que extrair de cada resultado
  agentType: 'copy' | 'art' | 'both';
  frequencyWeeks: number;      // a cada quantas semanas roda
}

const SKILL_SOURCES: SkillSource[] = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLICIDADE & ESTRATÉGIA CRIATIVA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'publicidade_global',
    label: 'Premiações Globais de Publicidade (Cannes, D&AD, Clio, One Show)',
    queries: [
      'Cannes Lions 2025 Grand Prix winners creative strategy analysis',
      'D&AD Black Pencil 2025 art direction copywriting technique',
      'One Show Gold Pencil 2025 campaign breakdown',
      'Clio Awards 2025 best integrated campaign analysis',
      'Effie Awards 2025 most effective campaigns strategy',
      'ANDY Awards 2025 outstanding campaigns creative direction',
      'advertising effectiveness IPA Effectiveness Awards 2025',
      'Lurzer Archive best print ads 2025 visual direction',
    ],
    extractionFocus: 'técnicas criativas vencedoras, estratégias de copy, direção de arte premiada, gatilhos psicológicos utilizados, insight criativo central, por que a campanha funcionou',
    agentType: 'both',
    frequencyWeeks: 2,
  },

  {
    category: 'publicidade_br',
    label: 'Publicidade Brasileira (CCSP, Caboré, Colunistas)',
    queries: [
      'Cannes Lions Brasil 2025 campanhas brasileiras Grand Prix',
      'Prêmio CCSP 2025 melhores campanhas publicidade brasileira',
      'Caboré 2025 profissionais destaque publicidade brasil',
      'Colunistas Brasil 2025 campanhas premiadas criação',
      'Meio Mensagem 2025 campanhas criativas destaque análise',
      'tendências publicidade digital Brasil 2025 consumidor',
      'marketing comportamental brasil consumidor 2025 pesquisa',
      'publicidade brasileira premiada internacionalmente 2025',
    ],
    extractionFocus: 'técnicas que funcionam com o consumidor brasileiro, referências culturais relevantes, linguagem, tom, humor, emoção brasileira, tendências locais de consumo',
    agentType: 'both',
    frequencyWeeks: 2,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PLATAFORMAS DIGITAIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'plataformas',
    label: 'Algoritmos e Melhores Práticas de Plataformas',
    queries: [
      'Instagram algorithm 2025 reach organic content what works',
      'Instagram Reels best practices 2025 performance hooks',
      'TikTok algorithm update 2025 FYP content strategy',
      'LinkedIn algorithm 2025 organic reach content format',
      'Meta Business advertising creative best practices 2025',
      'YouTube Shorts algorithm 2025 retention optimization',
      'WhatsApp Business marketing campaigns 2025 best practices',
      'Pinterest algorithm 2025 visual content strategy',
    ],
    extractionFocus: 'mudanças de algoritmo recentes, o que está tendo alcance orgânico, formatos com melhor performance, duração ideal de vídeo, melhores práticas de copy e visual por plataforma',
    agentType: 'both',
    frequencyWeeks: 1,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DESIGN GRÁFICO & IDENTIDADE VISUAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'design_grafico',
    label: 'Design Gráfico — Behance, Awwwards, Communication Arts, It\'s Nice That',
    queries: [
      'Behance graphic design trends 2025 top advertising projects',
      'Communication Arts design annual 2025 winners analysis',
      'It\'s Nice That best design work 2025 visual direction',
      'Awwwards site of the year 2025 design trends',
      'Creative Review best visual identities 2025 branding',
      'HOW Design awards 2025 outstanding graphic design',
      'logo design trends 2025 brand identity evolution',
      'brand identity redesign 2025 visual direction strategy',
    ],
    extractionFocus: 'tendências de design gráfico, direção visual de identidades, o que está ganhando premiações, técnicas de composição e hierarquia visual premiadas',
    agentType: 'art',
    frequencyWeeks: 2,
  },

  {
    category: 'tipografia',
    label: 'Tipografia — Type Directors Club, I Love Typography, Fonts in Use',
    queries: [
      'Type Directors Club TDC awards 2025 typography excellence',
      'typography trends 2025 advertising branding variable fonts',
      'Fonts in Use interesting typography applications 2025',
      'I Love Typography best font combinations 2025 editorial',
      'Typewolf fonts of the year 2025 recommendations',
      'expressive typography advertising campaigns 2025',
      'custom lettering advertising 2025 visual communication',
    ],
    extractionFocus: 'tendências tipográficas, combinações de fontes que funcionam, tipografia expressiva em publicidade, como tipografia comunica emoção antes do conteúdo',
    agentType: 'art',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FOTOGRAFIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'fotografia_editorial',
    label: 'Fotografia — Magnum, World Press Photo, Lens Culture, British Journal',
    queries: [
      'World Press Photo 2025 winners visual storytelling analysis',
      'Magnum Photos 2025 best photography documentary style',
      'Lens Culture awards 2025 outstanding photography direction',
      'British Journal of Photography 2025 emerging photographers',
      'photography direction advertising campaigns 2025 lighting',
      'portrait photography trends 2025 lighting techniques',
      'lifestyle photography advertising 2025 authentic direction',
      'food photography trends 2025 styling direction',
    ],
    extractionFocus: 'estilos fotográficos premiados, técnicas de direção de fotografia, iluminação, composição, styling, como técnicas documentais aplicam em publicidade',
    agentType: 'art',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CINEMA & CINEMATOGRAFIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'cinema_cinematografia',
    label: 'Cinema — ASC, No Film School, A24, Criterion, Sundance',
    queries: [
      'best cinematography 2025 ASC awards visual style analysis',
      'A24 film aesthetics 2025 visual language color grading',
      'No Film School cinematography techniques 2025 commercial',
      'Sundance 2025 best visual films direction analysis',
      'Cannes Palme d\'Or 2025 visual direction cinematography',
      'Oscar nominated cinematography 2025 techniques analysis',
      'color grading trends 2025 film commercial video',
      'short film advertising best director techniques 2025',
    ],
    extractionFocus: 'técnicas cinematográficas aplicáveis em vídeo curto/Reels, color grading dominante, movimentos de câmera, iluminação, estilos visuais que estão sendo premiados',
    agentType: 'art',
    frequencyWeeks: 4,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOTION, ANIMAÇÃO & IDENTIDADE EM MOVIMENTO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'motion_animacao',
    label: 'Motion Design — Motionographer, Stash, Art of the Title',
    queries: [
      'Motionographer best motion design 2025 advertising',
      'Stash Magazine motion design trends 2025 commercial',
      'Art of the Title best title sequences 2025 technique',
      'motion graphics trends advertising 2025 social media',
      'animation advertising campaigns 2025 visual style',
      '2D animation advertising 2025 brand campaigns',
      'kinetic typography video 2025 advertising',
      'after effects motion design techniques 2025 brand',
    ],
    extractionFocus: 'tendências em motion design, técnicas de animação para publicidade em redes sociais, motion identity, como movimento comunica emoção de marca',
    agentType: 'art',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ILUSTRAÇÃO & ARTE CONCEITUAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'ilustracao',
    label: 'Ilustração — Society of Illustrators, 3x3, Grain Edit',
    queries: [
      'Society of Illustrators awards 2025 best illustration advertising',
      '3x3 Magazine illustration annual 2025 trends',
      'editorial illustration trends 2025 advertising campaigns',
      'brand illustration style 2025 visual identity',
      'character design advertising 2025 brand mascots',
      'conceptual illustration advertising 2025 techniques',
      'flat illustration vs realistic illustration advertising 2025',
    ],
    extractionFocus: 'tendências em ilustração para publicidade, estilos que estão ganhando, como ilustração constrói identidade de marca, técnicas de ilustração conceitual',
    agentType: 'art',
    frequencyWeeks: 4,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TENDÊNCIAS VISUAIS & CULTURAIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'tendencias_visuais',
    label: 'Tendências Visuais — Pantone, Pinterest, Adobe, Shutterstock Trends',
    queries: [
      'Pantone color of the year 2025 2026 brand applications meaning',
      'Pinterest predicts 2025 visual aesthetic trends',
      'Adobe creative trends 2025 visual communication',
      'Shutterstock creative trends 2025 visual direction',
      'Getty Images visual trends 2025 advertising photography',
      'visual aesthetic trends Instagram TikTok 2025',
      'color palette trends branding 2025 2026',
      'AI visual generation style trends advertising 2025',
    ],
    extractionFocus: 'tendências de cor, estética, composição, paletas emergentes, estilos visuais em ascensão ou declínio, como aplicar em publicidade',
    agentType: 'art',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MODA & LIFESTYLE (REFERÊNCIAS VISUAIS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'moda_lifestyle',
    label: 'Moda e Lifestyle como Referência Visual — Vogue, Dazed, i-D, System',
    queries: [
      'Vogue Italia editorial photography direction 2025',
      'fashion advertising campaigns 2025 visual direction analysis',
      'Dazed magazine visual aesthetic 2025 art direction',
      'i-D magazine photography 2025 editorial style',
      'luxury brand advertising visual direction 2025',
      'fashion week advertising campaigns 2025 visual trends',
      'lifestyle brand photography 2025 direction composition',
      'high fashion advertising editorial 2025 art direction',
    ],
    extractionFocus: 'estética visual da moda aplicável a publicidade, direção de arte de editorial, paletas, composição, iluminação, como moda de ponta influencia publicidade geral',
    agentType: 'art',
    frequencyWeeks: 4,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ARQUITETURA & ESPAÇO (REFERÊNCIAS VISUAIS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'arquitetura_espaco',
    label: 'Arquitetura e Espaço — Dezeen, ArchDaily, Wallpaper*',
    queries: [
      'Dezeen best architecture 2025 visual aesthetic spaces',
      'Wallpaper magazine design awards 2025 interior visual trends',
      'ArchDaily visual design 2025 space photography',
      'interior design trends 2025 advertising set design',
      'retail store design 2025 brand experience visual',
      'spatial design advertising installations 2025',
    ],
    extractionFocus: 'tendências de espaço e ambiente como referência para set design, composição e paleta, como arquitetura e design de interiores influenciam estética visual publicitária',
    agentType: 'art',
    frequencyWeeks: 5,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ARTE CONTEMPORÂNEA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'arte_contemporanea',
    label: 'Arte Contemporânea — Artsy, frieze, MoMA, Tate, Venice Biennale',
    queries: [
      'Venice Biennale 2025 contemporary art visual trends',
      'frieze art fair 2025 artists visual direction',
      'MoMA contemporary art exhibitions 2025 visual language',
      'Tate Modern 2025 exhibitions visual aesthetics',
      'contemporary art advertising crossover 2025',
      'art Basel 2025 visual trends collectors market',
      'contemporary Brazilian art international 2025',
      'Pinacoteca São Paulo Itaú Cultural 2025 visual art',
    ],
    extractionFocus: 'tendências da arte contemporânea que influenciam publicidade, movimentos artísticos sendo absorvidos por marcas, como arte de galeria migra para visual de marca',
    agentType: 'art',
    frequencyWeeks: 5,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CULTURA VISUAL BRASILEIRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'cultura_visual_br',
    label: 'Cultura Visual Brasileira — Itaú Cultural, Casa Vogue, Zupi, SET',
    queries: [
      'Itaú Cultural exposições arte 2025 visual brasileiro',
      'Casa Vogue Brasil tendências estéticas 2025',
      'Zupi design gráfico brasileiro tendências 2025',
      'fotografia brasileira contemporânea 2025 referências',
      'design brasileiro premiado internacionalmente 2025',
      'estética urbana brasileira São Paulo Rio 2025',
      'cultura visual periférica brasil publicidade 2025',
      'grafite arte de rua brasil publicidade 2025',
    ],
    extractionFocus: 'referências visuais genuinamente brasileiras, estética que ressoa com consumidor local, como cultura popular brasileira aparece em publicidade de impacto',
    agentType: 'art',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPORTAMENTO & PSICOLOGIA DO CONSUMO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'comportamento',
    label: 'Psicologia do Consumo, Neuromarketing e Economia Comportamental',
    queries: [
      'neuromarketing advertising effectiveness research 2025',
      'behavioral economics consumer decision making 2025',
      'attention economy social media behavior research 2025',
      'emotional advertising effectiveness neuroscience 2025',
      'Kahneman system 1 system 2 advertising application 2025',
      'loss aversion marketing effectiveness research',
      'social proof mechanisms advertising effectiveness 2025',
      'consumer psychology visual processing advertising',
    ],
    extractionFocus: 'descobertas sobre como o cérebro processa publicidade, gatilhos psicológicos comprovados por pesquisa, heurísticas de decisão, o que realmente move o comportamento',
    agentType: 'copy',
    frequencyWeeks: 3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETORES ESPECÍFICOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    category: 'setor_financeiro',
    label: 'Marketing Setor Financeiro',
    queries: [
      'fintech marketing campaigns 2025 best practices',
      'bank advertising emotional marketing 2025',
      'financial services content strategy 2025',
      'fintech brand voice copywriting examples 2025',
      'investment marketing behavioral psychology 2025',
    ],
    extractionFocus: 'como bancos e fintechs estão comunicando, o que funciona no setor, linguagem, tom, estratégias de copy e visual que estão funcionando',
    agentType: 'both',
    frequencyWeeks: 3,
  },
];

// ── Extração de conhecimento via Claude ───────────────────────────────────────

interface ExtractedSkillEntry {
  topic: string;
  content: string;
  tags: string[];
  agentType: 'copy' | 'art' | 'both';
}

async function extractSkillInsights(
  source: SkillSource,
  searchResults: Array<{ title: string; snippet: string; url: string }>,
): Promise<ExtractedSkillEntry[]> {
  if (!searchResults.length) return [];

  const resultsText = searchResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nFonte: ${r.url}`)
    .join('\n\n');

  const prompt = `Você é o cérebro de conhecimento de uma agência de publicidade de elite.

Analise os resultados de pesquisa abaixo sobre "${source.label}" e extraia insights de CRAFT acionáveis para copywriters e diretores de arte.

FOCO DA EXTRAÇÃO: ${source.extractionFocus}

RESULTADOS DE PESQUISA:
${resultsText}

Extraia de 2 a 5 insights de alta qualidade. Para cada um:
- Deve ser específico e acionável (não genérico)
- Deve ensinar algo que melhora diretamente o trabalho de copy ou direção de arte
- Deve incluir COMO aplicar, não só O QUE foi descoberto

Responda APENAS em JSON válido (sem markdown):
{
  "insights": [
    {
      "topic": "<categoria>:<subtópico específico> (ex: 'plataformas:instagram_reels_hook_2025' ou 'comportamento:loss_aversion_mobile')",
      "content": "<insight completo em 2-4 frases: o que é, por que funciona, como aplicar. Inclua dados específicos quando disponíveis.>",
      "tags": ["<tag1>", "<tag2>"],
      "applies_to": "<copy | art | both>"
    }
  ]
}`;

  try {
    const result = await orchestrate('campaign_strategy', {
      prompt,
      temperature: 0.2,
      maxTokens: 1200,
    }, { tenant_id: '__agency__', feature: 'jarvis_skill_learn' });

    const raw = result.output.trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return [];

    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed.insights)) return [];

    return parsed.insights
      .filter((ins: any) => ins.topic && ins.content && ins.content.length > 50)
      .map((ins: any) => ({
        topic: `skill_learned:${source.category}:${ins.topic}`.slice(0, 200),
        content: ins.content,
        tags: Array.isArray(ins.tags) ? ins.tags : [],
        agentType: ins.applies_to as 'copy' | 'art' | 'both',
      }));
  } catch {
    return [];
  }
}

// ── Arquivo no KB ─────────────────────────────────────────────────────────────

async function fileSkillEntry(
  entry: ExtractedSkillEntry,
  sourceCategory: string,
  searchQuery: string,
): Promise<void> {
  // Usa tenant_id especial '__agency__' + client_id NULL para conhecimento global da agência
  await query(
    `INSERT INTO jarvis_kb_entries
       (tenant_id, client_id, topic, category, content, evidence_level,
        source, source_data)
     VALUES ($1, NULL, $2, 'skill_learned', $3, 'one_case', 'jarvis_auto_research', $4::jsonb)
     ON CONFLICT (tenant_id, client_id, topic)
     DO UPDATE SET
       content    = EXCLUDED.content,
       updated_at = now()`,
    [
      '__agency__',
      entry.topic,
      entry.content,
      JSON.stringify({
        source_category: sourceCategory,
        search_query: searchQuery,
        agent_type: entry.agentType,
        tags: entry.tags,
        learned_at: new Date().toISOString(),
      }),
    ]
  );
}

// ── Verifica se a categoria já rodou recentemente ──────────────────────────────

async function shouldRunCategory(source: SkillSource): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - source.frequencyWeeks * 7);

  const { rows } = await query(
    `SELECT updated_at FROM jarvis_kb_entries
     WHERE tenant_id = '__agency__'
       AND client_id IS NULL
       AND category = 'skill_learned'
       AND source_data->>'source_category' = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [source.category]
  );

  if (!rows.length) return true; // nunca rodou
  return new Date(rows[0].updated_at) < cutoffDate;
}

// ── Worker principal ──────────────────────────────────────────────────────────

export async function runJarvisSkillLearnWorkerOnce(): Promise<void> {
  const weekKey = getWeekKey();
  if (lastRunByWeek[weekKey]) return;

  if (!isTavilyConfigured()) {
    console.log('[jarvisSkillLearn] Serper/Tavily not configured — skipping');
    return;
  }

  console.log(`[jarvisSkillLearn] Starting autonomous skill learning — week ${weekKey}`);

  let totalInsights = 0;
  let totalQueries = 0;
  let errors = 0;

  for (const source of SKILL_SOURCES) {
    // Verifica se precisa rodar esta categoria agora
    const shouldRun = await shouldRunCategory(source).catch(() => true);
    if (!shouldRun) {
      console.log(`[jarvisSkillLearn] Skipping "${source.label}" — ran recently`);
      continue;
    }

    console.log(`[jarvisSkillLearn] Learning: ${source.label}`);

    for (const searchQuery of source.queries) {
      try {
        // Busca via Serper (Tavily drop-in)
        const searchResult = await tavilySearch(searchQuery, {
          maxResults: 5,
          searchDepth: 'basic',
          timeoutMs: 8000,
        });

        if (!searchResult.results.length) continue;
        totalQueries++;

        // Extrai insights via Claude
        const insights = await extractSkillInsights(source, searchResult.results);

        // Arquiva cada insight no KB
        for (const insight of insights) {
          try {
            await fileSkillEntry(insight, source.category, searchQuery);
            totalInsights++;
          } catch (err) {
            console.error(`[jarvisSkillLearn] Failed to file insight:`, (err as any)?.message);
          }
        }

        // Rate limit: 2s entre queries para não sobrecarregar API
        await sleep(2000);

      } catch (err) {
        errors++;
        console.warn(`[jarvisSkillLearn] Query failed: "${searchQuery}"`, (err as any)?.message);
        await sleep(3000);
      }
    }

    // 5s entre categorias
    await sleep(5000);
  }

  lastRunByWeek[weekKey] = true;

  console.log(
    `[jarvisSkillLearn] Done. Queries: ${totalQueries}, Insights filed: ${totalInsights}, Errors: ${errors}`
  );
}
