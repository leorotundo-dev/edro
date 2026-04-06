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

  // ── Publicidade Global ──────────────────────────────────────────────────────
  {
    category: 'publicidade_global',
    label: 'Publicidade Global (premiações e tendências)',
    queries: [
      'Cannes Lions 2025 Grand Prix winning campaigns strategy',
      'D&AD 2025 pencil winners copywriting art direction',
      'Clio Awards 2025 best campaigns behavioral psychology',
      'advertising effectiveness trends 2025 research',
      'best copywriting campaigns 2025 analysis what worked',
    ],
    extractionFocus: 'técnicas criativas vencedoras, estratégias de copy, direção de arte, gatilhos psicológicos utilizados, por que funcionou',
    agentType: 'both',
    frequencyWeeks: 2,
  },

  // ── Publicidade Brasil ──────────────────────────────────────────────────────
  {
    category: 'publicidade_br',
    label: 'Publicidade Brasileira',
    queries: [
      'Cannes Lions Brasil 2025 campanhas brasileiras premiadas',
      'tendências publicidade digital Brasil 2025',
      'CCSP melhores campanhas brasileiras 2025',
      'marketing comportamental brasil tendências consumidor 2025',
      'Meio Mensagem campanhas destaque 2025',
    ],
    extractionFocus: 'técnicas de comunicação que funcionam com o consumidor brasileiro, referências culturais, linguagem, tom, tendências locais',
    agentType: 'both',
    frequencyWeeks: 2,
  },

  // ── Plataformas Digitais ────────────────────────────────────────────────────
  {
    category: 'plataformas',
    label: 'Atualizações de Plataformas',
    queries: [
      'Instagram algorithm changes 2025 content strategy',
      'TikTok algorithm update 2025 what works',
      'LinkedIn content strategy 2025 best practices',
      'Meta for Business advertising best practices 2025',
      'Instagram Reels performance tips 2025',
      'WhatsApp Business marketing best practices 2025',
    ],
    extractionFocus: 'mudanças de algoritmo, novos formatos, o que está tendo mais alcance, melhores práticas atuais de copy e visual por plataforma',
    agentType: 'both',
    frequencyWeeks: 1,
  },

  // ── Design e Arte ───────────────────────────────────────────────────────────
  {
    category: 'design_arte',
    label: 'Design, Arte e Estética',
    queries: [
      'graphic design trends 2025 visual communication',
      'Behance top design projects 2025 advertising',
      'Awwwards best websites 2025 visual trends',
      'Communication Arts advertising annual 2025',
      'typography trends 2025 branding advertising',
      'color trends 2025 advertising design',
    ],
    extractionFocus: 'tendências estéticas, paletas de cor, direção de arte, composição visual, tipografia, o que está ganhando premiações e por quê',
    agentType: 'art',
    frequencyWeeks: 2,
  },

  // ── Tendências Visuais e Culturais ─────────────────────────────────────────
  {
    category: 'tendencias_visuais',
    label: 'Tendências Visuais e Culturais',
    queries: [
      'Pantone color of the year 2025 meaning brand applications',
      'Pinterest predicts 2025 visual trends',
      'Adobe color trends 2025 design',
      'visual aesthetic trends social media 2025',
      'AI generated imagery trends advertising 2025',
      'photography trends advertising 2025',
    ],
    extractionFocus: 'tendências visuais emergentes, paletas, estilos fotográficos, estéticas dominantes, como aplicar em publicidade',
    agentType: 'art',
    frequencyWeeks: 4,
  },

  // ── Comportamento e Psicologia ──────────────────────────────────────────────
  {
    category: 'comportamento',
    label: 'Psicologia do Consumo e Neuromarketing',
    queries: [
      'neuromarketing advertising effectiveness research 2025',
      'behavioral economics marketing 2025 insights',
      'consumer psychology advertising what works research',
      'attention economy social media behavior 2025',
      'emotional marketing effectiveness research 2025',
      'decision making heuristics advertising research',
    ],
    extractionFocus: 'descobertas sobre como o cérebro processa publicidade, gatilhos psicológicos comprovados, heurísticas de decisão, o que move o consumidor',
    agentType: 'copy',
    frequencyWeeks: 3,
  },

  // ── Cinema e Fotografia ─────────────────────────────────────────────────────
  {
    category: 'cinema_foto',
    label: 'Cinema, Fotografia e Referências Visuais',
    queries: [
      'best cinematography 2025 visual style analysis',
      'A24 visual aesthetics 2025 films',
      'World Press Photo 2025 winners documentary photography',
      'short film advertising visual storytelling 2025',
      'photography direction advertising campaigns 2025',
      'motion graphics trends video advertising 2025',
    ],
    extractionFocus: 'estilos visuais de referência, técnicas cinematográficas aplicáveis a vídeo curto/Reels, direção de fotografia, composição de cena',
    agentType: 'art',
    frequencyWeeks: 4,
  },

  // ── Setor Financeiro / Fintech ──────────────────────────────────────────────
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
