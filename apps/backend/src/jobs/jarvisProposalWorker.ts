/**
 * Jarvis Proactive Proposal Worker
 *
 * Runs daily (self-throttled, only fires when conditions are met).
 * For each client with sufficient KB data (>= 5 entries):
 *   1. Reads jarvis_kb_entries (client patterns)
 *   2. Reads upcoming calendar events (next 30 days)
 *   3. Reads social listening trends
 *   4. Reads competitor intelligence
 *   5. Calls Claude to generate a proactive campaign proposal
 *   6. Creates an ai_opportunities record with type='proactive_campaign_proposal'
 *   7. Files the proposal back to KB
 *
 * The proposal includes:
 *   - campaign theme, recommended phase, target persona
 *   - suggested triggers (based on KB rules), expected micro-behaviors
 */

import { query } from '../db';
import { orchestrate } from '../services/ai/copyOrchestrator';
import { fileOutputToKb } from '../services/jarvisKbFilingService';

const MIN_KB_ENTRIES = 5;
const MAX_CLIENTS_PER_TICK = 3;

// Self-throttle: once per day
let lastRunDate = '';

/** Force a run regardless of time-gate (for admin triggers). */
export async function triggerJarvisProposalsNow(): Promise<void> {
  lastRunDate = '';
  return runJarvisProposalWorkerOnce();
}

export async function runJarvisProposalWorkerOnce(): Promise<void> {
  // Self-throttle: 1x/day at 05:00 UTC
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  if (hour < 5 || hour > 6) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[jarvisProposalWorker] Starting daily proactive proposal generation...');

  // Get clients with enough KB data across all tenants
  const { rows: clientRows } = await query(
    `SELECT tenant_id, client_id, COUNT(*) AS entry_count
     FROM jarvis_kb_entries
     WHERE evidence_level IN ('one_case', 'pattern', 'rule')
     GROUP BY tenant_id, client_id
     HAVING COUNT(*) >= $1
     ORDER BY COUNT(*) DESC
     LIMIT $2`,
    [MIN_KB_ENTRIES, MAX_CLIENTS_PER_TICK * 3]
  );

  if (!clientRows.length) {
    console.log('[jarvisProposalWorker] No clients with sufficient KB data yet.');
    return;
  }

  let processed = 0;
  let created = 0;

  for (const row of clientRows) {
    if (processed >= MAX_CLIENTS_PER_TICK) break;

    try {
      const proposal = await generateProposalForClient(row.tenant_id, row.client_id);
      if (proposal) {
        await saveProposalAsOpportunity(row.tenant_id, row.client_id, proposal);
        await fileOutputToKb(row.tenant_id, row.client_id, proposal.full_text, 'campaign_proposal', {
          phase: proposal.recommended_phase,
          persona: proposal.target_persona,
          triggers: proposal.suggested_triggers,
          micro_behavior: proposal.primary_micro_behavior,
          metadata: { theme: proposal.theme },
        });
        created++;
      }
      processed++;
    } catch (err) {
      console.error(`[jarvisProposalWorker] Error for client=${row.client_id}:`, err);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[jarvisProposalWorker] Done. Clients processed: ${processed}, proposals created: ${created}`);
}

// ── Proposal generation ───────────────────────────────────────────────────────

interface ProposalResult {
  theme: string;
  recommended_phase: string;
  target_persona: string;
  suggested_triggers: string[];
  primary_micro_behavior: string;
  expected_micro_behaviors: string[];
  rationale: string;
  full_text: string;
}

async function generateProposalForClient(
  tenantId: string,
  clientId: string
): Promise<ProposalResult | null> {
  // 1. Load client info
  const clientRes = await query(
    `SELECT id, name, segment, profile FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [clientId, tenantId]
  );
  const client = clientRes.rows[0];
  if (!client) return null;

  // 2. Load KB patterns (top rules)
  const { rows: kbEntries } = await query(
    `SELECT topic, category, content, evidence_level
     FROM jarvis_kb_entries
     WHERE tenant_id = $1 AND client_id = $2
       AND evidence_level IN ('one_case', 'pattern', 'rule')
     ORDER BY
       CASE evidence_level WHEN 'rule' THEN 1 WHEN 'pattern' THEN 2 ELSE 3 END,
       updated_at DESC
     LIMIT 20`,
    [tenantId, clientId]
  );

  // 3. Load upcoming calendar events (next 30 days)
  const { rows: calendarEvents } = await query(
    `SELECT e.name, e.date, ce.notes, ce.relevance_score
     FROM client_events ce
     JOIN events e ON e.id = ce.event_id
     WHERE ce.client_id = $1
       AND e.date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
       AND e.date <= to_char(CURRENT_DATE + INTERVAL '30 days', 'YYYY-MM-DD')
     ORDER BY ce.relevance_score DESC NULLS LAST, e.date
     LIMIT 10`,
    [clientId]
  );

  // 4. Load social listening trends
  const { rows: socialTrends } = await query(
    `SELECT keyword, platform, mention_count, average_sentiment, trend_direction
     FROM social_listening_keywords
     WHERE client_id = $1
       AND trend_direction = 'UP'
       AND updated_at > NOW() - INTERVAL '7 days'
     ORDER BY mention_count DESC
     LIMIT 5`,
    [clientId]
  );

  // 5. Load competitor intelligence (recent)
  const { rows: competitors } = await query(
    `SELECT ci.competitor_name, ci.pattern_type, ci.pattern_description
     FROM competitor_intelligence ci
     WHERE ci.client_id = $1 AND ci.tenant_id = $2
       AND ci.created_at > NOW() - INTERVAL '14 days'
     ORDER BY ci.created_at DESC
     LIMIT 5`,
    [clientId, tenantId]
  );

  // ── Build prompt ──────────────────────────────────────────────────────────

  const kbBlock = kbEntries.length
    ? kbEntries.map((e: any) => `- [${e.evidence_level}] ${e.content}`).join('\n')
    : 'Nenhum padrão confirmado ainda.';

  const calendarBlock = calendarEvents.length
    ? calendarEvents.map((e: any) => `- ${e.date}: ${e.name}${e.notes ? ` (${e.notes})` : ''}`).join('\n')
    : 'Nenhum evento relevante nos próximos 30 dias.';

  const socialBlock = socialTrends.length
    ? socialTrends.map((t: any) => `- ${t.keyword} em ${t.platform}: ${t.mention_count} menções, sentimento médio ${t.average_sentiment?.toFixed(2) ?? 'n/a'}`).join('\n')
    : 'Nenhuma tendência de alta no momento.';

  const competitorBlock = competitors.length
    ? competitors.map((c: any) => `- ${c.competitor_name}: ${c.pattern_type} — ${c.pattern_description}`).join('\n')
    : 'Nenhuma inteligência competitiva recente.';

  const prompt = `Você é o JARVIS, agente estratégico de marketing comportamental da agência Edro Digital.

Cliente: ${client.name}
Segmento: ${client.segment ?? 'não especificado'}
Perfil: ${JSON.stringify(client.profile ?? {})}

PADRÕES APRENDIDOS (KB do cliente):
${kbBlock}

CALENDÁRIO (próximos 30 dias):
${calendarBlock}

TENDÊNCIAS SOCIAIS (alta):
${socialBlock}

INTELIGÊNCIA COMPETITIVA:
${competitorBlock}

Com base nestes dados, gere UMA proposta proativa de campanha comportamental para este cliente.
A proposta deve:
1. Identificar a maior oportunidade de comportamento a ser estimulado agora
2. Recomendar a fase da campanha: historia | prova | convite
3. Sugerir gatilhos comprovados pelo KB (priorize [regra] e [padrão])
4. Definir o micro-comportamento alvo (AMD)
5. Listar 2-3 micro-comportamentos esperados do público
6. Explicar o racional estratégico

Responda APENAS em JSON válido (sem markdown):
{
  "theme": "Tema central da campanha (1 linha)",
  "recommended_phase": "historia|prova|convite",
  "target_persona": "Nome/perfil da persona alvo",
  "suggested_triggers": ["gatilho1", "gatilho2"],
  "primary_micro_behavior": "AMD principal (ex: salvar, clicar, compartilhar)",
  "expected_micro_behaviors": ["comportamento1", "comportamento2"],
  "rationale": "Racional estratégico em 2-3 parágrafos",
  "headline_suggestion": "Uma frase de abertura para o conceito"
}`;

  let output: string;
  try {
    const result = await orchestrate('campaign_strategy', {
      prompt,
      temperature: 0.7,
      maxTokens: 1200,
    }, { tenant_id: tenantId, feature: 'jarvis_proactive_proposal' });
    output = result.output;
  } catch (err) {
    console.error(`[jarvisProposalWorker] AI call failed for client=${clientId}:`, err);
    return null;
  }

  // Parse response
  let parsed: any;
  try {
    const trimmed = output.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    parsed = JSON.parse(start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed);
  } catch {
    console.warn(`[jarvisProposalWorker] Failed to parse proposal for client=${clientId}`);
    return null;
  }

  return {
    theme: parsed.theme ?? 'Proposta JARVIS',
    recommended_phase: parsed.recommended_phase ?? 'historia',
    target_persona: parsed.target_persona ?? 'Não especificado',
    suggested_triggers: Array.isArray(parsed.suggested_triggers) ? parsed.suggested_triggers : [],
    primary_micro_behavior: parsed.primary_micro_behavior ?? 'engajar',
    expected_micro_behaviors: Array.isArray(parsed.expected_micro_behaviors) ? parsed.expected_micro_behaviors : [],
    rationale: parsed.rationale ?? '',
    full_text: output,
  };
}

// ── Save proposal as ai_opportunity ──────────────────────────────────────────

async function saveProposalAsOpportunity(
  tenantId: string,
  clientId: string,
  proposal: ProposalResult
): Promise<void> {
  // Resolve edro_clients UUID
  const edroRes = await query(
    `SELECT ec.id FROM edro_clients ec
     JOIN clients c ON LOWER(ec.name) = LOWER(c.name)
     WHERE c.id = $1 LIMIT 1`,
    [clientId]
  );
  const edroClientId = edroRes.rows[0]?.id;
  if (!edroClientId) return;

  const description = [
    `Tema: ${proposal.theme}`,
    `Fase recomendada: ${proposal.recommended_phase}`,
    `Persona alvo: ${proposal.target_persona}`,
    `Gatilhos: ${proposal.suggested_triggers.join(', ')}`,
    `AMD: ${proposal.primary_micro_behavior}`,
    `Micro-comportamentos esperados: ${proposal.expected_micro_behaviors.join(', ')}`,
    '',
    proposal.rationale,
  ].join('\n');

  await query(
    `INSERT INTO ai_opportunities
       (tenant_id, client_id, type, title, description, suggested_action,
        source, priority, confidence, status, payload)
     VALUES ($1, $2::uuid, 'proactive_campaign_proposal', $3, $4, $5,
             'jarvis_proactive', 'high', 80, 'new', $6::jsonb)`,
    [
      tenantId,
      edroClientId,
      `Proposta JARVIS: ${proposal.theme}`,
      description,
      `Iniciar campanha "${proposal.theme}" na fase ${proposal.recommended_phase} com AMD ${proposal.primary_micro_behavior}`,
      JSON.stringify({
        theme: proposal.theme,
        phase: proposal.recommended_phase,
        persona: proposal.target_persona,
        triggers: proposal.suggested_triggers,
        micro_behavior: proposal.primary_micro_behavior,
        expected_behaviors: proposal.expected_micro_behaviors,
      }),
    ]
  );

  console.log(`[jarvisProposalWorker] Created opportunity for client=${clientId}: "${proposal.theme}"`);
}
