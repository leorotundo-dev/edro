/**
 * Jarvis KB Health Worker
 *
 * Runs monthly (self-throttled).
 * For each client with KB entries:
 *   1. Health check — contradictions, claims without source, gaps, suggestions
 *   2. Connector — finds non-obvious connections between KB entries across categories
 *      (e.g. trigger:loss_aversion [pattern] + dark_funnel:linkedin → hypothesis of correlation)
 *   3. Writes findings as jarvis_kb_entries with category='health_finding'|'connection'
 */

import { query } from '../db';
import { orchestrate } from '../services/ai/copyOrchestrator';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Self-throttle: run once per month per tenant
const lastRunByTenant: Record<string, string> = {};

function getMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function runJarvisKbHealthWorkerOnce(): Promise<void> {
  const monthKey = getMonthKey();

  // Get all tenants that have KB entries
  const { rows: tenants } = await query(
    `SELECT DISTINCT tenant_id FROM jarvis_kb_entries`,
    []
  );

  if (!tenants.length) return;

  for (const { tenant_id } of tenants) {
    // Self-throttle: once per month per tenant
    if (lastRunByTenant[tenant_id] === monthKey) continue;

    await runHealthCheckForTenant(tenant_id);
    lastRunByTenant[tenant_id] = monthKey;

    await sleep(2000); // brief pause between tenants
  }
}

async function runHealthCheckForTenant(tenantId: string): Promise<void> {
  console.log(`[jarvisKbHealthWorker] Running health check for tenant=${tenantId}`);

  // Get all clients with >= 3 KB entries
  const { rows: clients } = await query(
    `SELECT client_id, COUNT(*) AS entry_count
     FROM jarvis_kb_entries
     WHERE tenant_id = $1
     GROUP BY client_id
     HAVING COUNT(*) >= 3`,
    [tenantId]
  );

  if (!clients.length) return;

  for (const { client_id } of clients) {
    try {
      await runHealthCheckForClient(tenantId, client_id);
      await sleep(1500); // rate limit between clients
    } catch (err) {
      console.error(`[jarvisKbHealthWorker] Error for client=${client_id}:`, err);
    }
  }
}

async function runHealthCheckForClient(tenantId: string, clientId: string): Promise<void> {
  // Load all KB entries for this client
  const { rows: entries } = await query(
    `SELECT topic, category, content, evidence_level, source, created_at, updated_at
     FROM jarvis_kb_entries
     WHERE tenant_id = $1 AND client_id = $2
     ORDER BY category, evidence_level, updated_at DESC
     LIMIT 100`,
    [tenantId, clientId]
  );

  if (!entries.length) return;

  // Build KB summary for analysis
  const kbSummary = entries
    .map((e: any) => `[${e.category}/${e.evidence_level}] ${e.topic}: ${e.content}`)
    .join('\n');

  const prompt = `Você é um analista de knowledge base de marketing comportamental.

Analise as entradas abaixo do KB do JARVIS para um cliente e identifique:

1. CONTRADIÇÕES: entradas que se contradizem (ex: gatilho X funciona e gatilho X não funciona)
2. AFIRMAÇÕES SEM FONTE: entradas com evidence_level='hypothesis' sem dados de apoio
3. LACUNAS: tópicos mencionados mas sem entrada dedicada no KB
4. SUGESTÕES: 3 novos artigos/entradas que fariam falta neste KB

KB ATUAL:
${kbSummary}

Responda APENAS em JSON válido (sem markdown):
{
  "contradictions": [
    {"entry_a": "topic_a", "entry_b": "topic_b", "description": "Por que se contradizem"}
  ],
  "claims_without_source": [
    {"topic": "topic_name", "description": "Qual afirmação precisa de validação"}
  ],
  "gaps": [
    {"topic_missing": "nome do tópico", "description": "Por que deveria existir"}
  ],
  "suggested_articles": [
    {"title": "Título do artigo", "category": "categoria", "rationale": "Por que seria útil"}
  ]
}`;

  let analysisResult: string;
  try {
    const result = await orchestrate('campaign_strategy', {
      prompt,
      temperature: 0.3,
      maxTokens: 1500,
    }, { tenant_id: tenantId, feature: 'jarvis_kb_health' });
    analysisResult = result.output;
  } catch (err) {
    console.error(`[jarvisKbHealthWorker] AI call failed for client=${clientId}:`, err);
    return;
  }

  // Parse the JSON response
  let parsed: any;
  try {
    const trimmed = analysisResult.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(trimmed.slice(start, end + 1));
    } else {
      parsed = JSON.parse(trimmed);
    }
  } catch (err) {
    console.warn(`[jarvisKbHealthWorker] Failed to parse AI response for client=${clientId}`);
    return;
  }

  const findings: Array<{ topic: string; content: string }> = [];

  // File contradictions
  if (Array.isArray(parsed.contradictions)) {
    for (const c of parsed.contradictions) {
      findings.push({
        topic: `health:contradiction:${c.entry_a}:${c.entry_b}`.slice(0, 200),
        content: `[hipótese][health_finding] Contradição detectada entre "${c.entry_a}" e "${c.entry_b}": ${c.description}. Revisar e reconciliar estas entradas.`,
      });
    }
  }

  // File claims without source
  if (Array.isArray(parsed.claims_without_source)) {
    for (const c of parsed.claims_without_source) {
      findings.push({
        topic: `health:needs_validation:${c.topic}`.slice(0, 200),
        content: `[hipótese][health_finding] Afirmação sem validação: "${c.topic}". ${c.description}. Necessita dados de performance para confirmar ou refutar.`,
      });
    }
  }

  // File gaps
  if (Array.isArray(parsed.gaps)) {
    for (const g of parsed.gaps) {
      findings.push({
        topic: `health:gap:${g.topic_missing}`.slice(0, 200),
        content: `[hipótese][health_finding] Lacuna detectada: "${g.topic_missing}". ${g.description}. Criar entrada ao observar dados suficientes.`,
      });
    }
  }

  // File suggested articles
  if (Array.isArray(parsed.suggested_articles)) {
    for (const s of parsed.suggested_articles) {
      findings.push({
        topic: `health:suggestion:${s.title}`.slice(0, 200),
        content: `[hipótese][health_finding] Artigo sugerido: "${s.title}" (categoria: ${s.category}). ${s.rationale}`,
      });
    }
  }

  // Write all findings to KB
  let filed = 0;
  for (const finding of findings) {
    try {
      await query(
        `INSERT INTO jarvis_kb_entries
           (tenant_id, client_id, topic, category, content, evidence_level, source, source_data)
         VALUES ($1,$2,$3,'health_finding',$4,'hypothesis','jarvis_kb_health',$5::jsonb)
         ON CONFLICT (tenant_id, client_id, topic)
         DO UPDATE SET
           content    = EXCLUDED.content,
           updated_at = now()`,
        [
          tenantId, clientId,
          finding.topic, finding.content,
          JSON.stringify({ analyzed_at: new Date().toISOString(), entry_count: entries.length }),
        ]
      );
      filed++;
    } catch (err) {
      console.error(`[jarvisKbHealthWorker] Failed to file finding:`, err);
    }
  }

  if (filed > 0) {
    console.log(`[jarvisKbHealthWorker] client=${clientId}: filed ${filed} health findings`);
  }

  // Run Connector after health check
  await runConnectorForClient(tenantId, clientId, entries);
}

// ── Connector ─────────────────────────────────────────────────────────────────
// Finds non-obvious connections between KB entries across categories.
// The insight: patterns in one category often correlate with patterns in another
// but nobody explicitly connected them. The Connector makes those links explicit.

async function runConnectorForClient(
  tenantId: string,
  clientId: string,
  entries: any[]
): Promise<void> {
  // Only run if we have entries from multiple categories — no point connecting 1 category
  const categories = new Set(entries.map((e: any) => e.category));
  if (categories.size < 2) return;

  // Focus on confirmed patterns — hypothesis-only entries have no signal yet
  const confirmed = entries.filter((e: any) =>
    ['one_case', 'pattern', 'rule'].includes(e.evidence_level)
  );
  if (confirmed.length < 3) return;

  const kbSummary = confirmed
    .map((e: any) => `[${e.category}/${e.evidence_level}] ${e.topic}: ${e.content.slice(0, 200)}`)
    .join('\n');

  const prompt = `Você é um analista de padrões de marketing comportamental.

Analise as entradas do KB abaixo e encontre CONEXÕES NÃO-ÓBVIAS entre elas.

O que procurar:
- Um trigger que performa bem + um canal específico de dark funnel → hipótese de correlação
- Um AMD que funciona numa fase + uma persona → sugestão de combinação a testar
- Um padrão de plataforma + um padrão de trigger → possível combinação de alta performance
- Sequências lógicas: "se isso funciona, então aquilo provavelmente também funciona"
- Contradições que na verdade podem ser explicadas por contexto diferente (persona, fase, canal)

Ignore conexões óbvias. Foque em insights que um estrategista não veria olhando as entradas individualmente.

KB CONFIRMADO (${confirmed.length} entradas):
${kbSummary}

Responda APENAS em JSON válido (sem markdown), máximo 5 conexões:
{
  "connections": [
    {
      "entry_a": "topic da entrada A",
      "entry_b": "topic da entrada B",
      "connection_type": "correlation | sequence | combination | explanation",
      "hypothesis": "A hipótese específica que conecta as duas entradas",
      "suggested_test": "Como testar essa conexão na próxima campanha"
    }
  ]
}`;

  let analysisResult: string;
  try {
    const result = await orchestrate('campaign_strategy', {
      prompt,
      temperature: 0.4,
      maxTokens: 1200,
    }, { tenant_id: tenantId, feature: 'jarvis_kb_connector' });
    analysisResult = result.output;
  } catch (err) {
    console.error(`[jarvisKbConnector] AI call failed for client=${clientId}:`, err);
    return;
  }

  let parsed: any;
  try {
    const trimmed = analysisResult.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return;
  }

  if (!Array.isArray(parsed.connections) || !parsed.connections.length) return;

  let filed = 0;
  for (const conn of parsed.connections) {
    if (!conn.entry_a || !conn.entry_b || !conn.hypothesis) continue;

    const topic = `connection:${conn.entry_a}:${conn.entry_b}`.slice(0, 200);
    const content = [
      `[hipótese][conexão] ${conn.connection_type?.toUpperCase() ?? 'CONEXÃO'} entre "${conn.entry_a}" e "${conn.entry_b}".`,
      `Hipótese: ${conn.hypothesis}`,
      conn.suggested_test ? `Teste sugerido: ${conn.suggested_test}` : '',
    ].filter(Boolean).join(' ');

    try {
      await query(
        `INSERT INTO jarvis_kb_entries
           (tenant_id, client_id, topic, category, content, evidence_level, source, source_data)
         VALUES ($1,$2,$3,'connection',$4,'hypothesis','jarvis_kb_connector',$5::jsonb)
         ON CONFLICT (tenant_id, client_id, topic)
         DO UPDATE SET
           content    = EXCLUDED.content,
           updated_at = now()`,
        [
          tenantId, clientId, topic, content,
          JSON.stringify({
            entry_a: conn.entry_a,
            entry_b: conn.entry_b,
            connection_type: conn.connection_type,
            analyzed_at: new Date().toISOString(),
          }),
        ]
      );
      filed++;
    } catch (err) {
      console.error(`[jarvisKbConnector] Failed to file connection:`, err);
    }
  }

  if (filed > 0) {
    console.log(`[jarvisKbConnector] client=${clientId}: filed ${filed} connections`);
  }
}
