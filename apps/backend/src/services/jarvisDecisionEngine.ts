/**
 * jarvisDecisionEngine.ts
 *
 * Classifica eventos das 9 fontes com a fórmula U×C×I,
 * determina o nível de autonomia (0-5) e a categoria de ação.
 *
 * Arquitetura:
 *   classifyEvent(event)       → peso + categoria + nível
 *   buildClientState(...)      → snapshot das 9 fontes por cliente
 *   processAlerts(tenantId)    → converte jarvis_alerts em JarvisDecisions
 *
 * Níveis de autonomia:
 *   0 — Silencioso: processa internamente
 *   1 — Ambient: feed do Home sem interrupção
 *   2 — Notifica: badge + push
 *   3 — Propõe: inbox com 1 clique
 *   4 — Requer confirmação explícita
 *   5 — NUNCA autônomo (deletar, publicar, enviar)
 */

import { query } from '../db';
import { buildClientKnowledgeBase } from './clientKnowledgeBaseService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionCategory =
  | 'SILENCIO'
  | 'ALERTA_PASSIVO'
  | 'ALERTA_ATIVO'
  | 'PROPOSTA'
  | 'EXECUCAO'
  | 'CRIACAO';

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type RawEvent = {
  rule_id: string;                 // C01-C10 or custom
  tenant_id: string;
  client_id: string | null;
  source: 'trello' | 'meetings' | 'whatsapp' | 'calendar' | 'financial' | 'clipping' | 'social' | 'learning' | 'competitors' | 'jobs';
  title: string;
  body: string;
  urgency: number;                 // 1-5
  confidence: number;              // 0.0-1.0
  impact: number;                  // 1-5
  suggested_action?: string;
  ref_id?: string;
};

export type JarvisDecision = {
  event: RawEvent;
  weight: number;                  // urgency × confidence × impact
  category: ActionCategory;
  autonomy_level: AutonomyLevel;
  reasoning: string;               // 1 linha explicando a decisão
  suppressed: boolean;             // true se throttled/snoozed
};

export type JarvisClientState = {
  client_id: string;
  tenant_id: string;
  snapshot_at: Date;
  awareness: {
    trello:      { active_jobs: number; blocked: number; stale: number };
    meetings:    { pending_decisions: number; last_meeting_days_ago: number | null };
    whatsapp:    { days_without_client_response: number | null; pending_approval: boolean };
    calendar:    { upcoming_orphan_dates: number };
    financial:   { contract_renewal_days: number | null; invoices_overdue: number };
    learning:    { active_rules: number; new_patterns_24h: number };
    competitors: { active_in_48h: number };
    social:      { mentions_24h: number };
    jobs:        { without_briefing: number; da_stale: number };
    living_memory: {
      active_directives: number;
      evidence_signals_30d: number;
      fresh_signals_7d: number;
      pending_commitments: number;
    };
  };
  open_alerts: number;
  pending_decisions: JarvisDecision[];
  living_memory_preview: {
    directives: string[];
    evidence: Array<{
      source_type: string;
      title: string | null;
      excerpt: string;
      occurred_at: string | null;
    }>;
    pending_commitments: Array<{
      title: string;
      responsible: string | null;
      deadline: string | null;
    }>;
  };
};

// ── Event Classifier ──────────────────────────────────────────────────────────

const ANTI_FATIGUE_MAX_ALERTS_PER_CLIENT_PER_DAY = 3;

/**
 * Classifies a raw event using U×C×I formula and maps to action category.
 */
export function classifyEvent(event: RawEvent): JarvisDecision {
  const weight = event.urgency * event.confidence * event.impact;

  let category: ActionCategory;
  let autonomy_level: AutonomyLevel;
  let reasoning: string;

  // Classification table from Decision Engine spec
  if (weight >= 20) {
    category = 'ALERTA_ATIVO';
    autonomy_level = 2;
    reasoning = `Peso ${weight.toFixed(1)} — crítico. Interrompe com badge.`;
  } else if (weight >= 14 && event.urgency >= 4) {
    category = 'ALERTA_ATIVO';
    autonomy_level = 2;
    reasoning = `Peso ${weight.toFixed(1)} + urgência alta — notificação ativa.`;
  } else if (weight >= 9) {
    category = 'PROPOSTA';
    autonomy_level = 3;
    reasoning = `Peso ${weight.toFixed(1)} — Jarvis propõe ação no inbox.`;
  } else if (weight >= 4) {
    category = 'ALERTA_PASSIVO';
    autonomy_level = 1;
    reasoning = `Peso ${weight.toFixed(1)} — aparece no feed sem interromper.`;
  } else {
    category = 'SILENCIO';
    autonomy_level = 0;
    reasoning = `Peso ${weight.toFixed(1)} — processamento interno.`;
  }

  // Override for EXECUCAO: high-confidence client behavior change (C06)
  if (event.rule_id === 'C06' && event.confidence >= 0.85) {
    category = 'EXECUCAO';
    autonomy_level = 0;
    reasoning = `Tom/preferência do cliente — Jarvis atualiza perfil silenciosamente.`;
  }

  // Override for CRIACAO: trigger de criação (data orphan + urgency, or market opportunity)
  if (
    (event.rule_id === 'C07' && event.urgency >= 3) ||
    (event.rule_id === 'C05' && event.confidence >= 0.8 && event.impact >= 4)
  ) {
    category = 'CRIACAO';
    autonomy_level = 3;
    reasoning = `${event.rule_id} com alto impacto — Jarvis gera conteúdo e propõe no inbox.`;
  }

  return {
    event,
    weight,
    category,
    autonomy_level,
    reasoning,
    suppressed: false,
  };
}

// ── Anti-fatigue filter ───────────────────────────────────────────────────────

/**
 * Applies anti-fatigue rules to a list of decisions for a client.
 * Max 3 ALERTA_ATIVO per client per day. Same rule repeats every 24h.
 */
export function applyAntiFatigue(
  decisions: JarvisDecision[],
  existingAlertCount: number,
): JarvisDecision[] {
  let activeCount = existingAlertCount;

  return decisions.map((d) => {
    if (d.category === 'ALERTA_ATIVO' || d.category === 'ALERTA_PASSIVO') {
      if (activeCount >= ANTI_FATIGUE_MAX_ALERTS_PER_CLIENT_PER_DAY) {
        return { ...d, suppressed: true, reasoning: d.reasoning + ' [suprimido: limite diário atingido]' };
      }
      activeCount++;
    }
    return d;
  });
}

// ── Build JarvisClientState ───────────────────────────────────────────────────

/**
 * Builds a snapshot of the client's awareness state across 9 sources.
 * Used by the Decision Engine to understand overall health.
 */
export async function buildClientState(
  tenantId: string,
  clientId: string,
): Promise<JarvisClientState> {
  const [trello, meetings, whatsapp, calendar, financial, learning, competitors, jobs, livingMemory] =
    await Promise.allSettled([

      // Trello
      query<{ active_jobs: string; blocked: string; stale: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE pc.is_archived = false) ::text AS active_jobs,
           COUNT(*) FILTER (WHERE pc.is_archived = false AND pc.updated_at < now() - interval '48 hours') ::text AS stale,
           0::text AS blocked
         FROM project_cards pc
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.client_id = $1 AND pb.tenant_id = $2`,
        [clientId, tenantId],
      ),

      // Meetings
      query<{ pending_decisions: string; last_days: string | null }>(
        `SELECT
           COUNT(*) FILTER (WHERE has_action_items = true AND meeting_date > now() - interval '7 days') ::text AS pending_decisions,
           EXTRACT(DAY FROM now() - MAX(meeting_date))::text AS last_days
         FROM meeting_summaries
         WHERE client_id = $1 AND tenant_id = $2`,
        [clientId, tenantId],
      ),

      // WhatsApp
      query<{ days_without_response: string | null; has_pending: string }>(
        `SELECT
           EXTRACT(DAY FROM now() - MAX(created_at)) FILTER (WHERE direction = 'inbound') ::text AS days_without_response,
           (COUNT(*) FILTER (WHERE direction = 'outbound' AND created_at > now() - interval '72 hours') > 0)::text AS has_pending
         FROM whatsapp_messages
         WHERE client_id = $1 AND tenant_id = $2`,
        [clientId, tenantId],
      ),

      // Calendar orphan dates
      query<{ orphan_count: string }>(
        `SELECT COUNT(*)::text AS orphan_count
         FROM calendar_events ce
         WHERE ce.client_id::text = $1
           AND ce.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
           AND NOT EXISTS (
             SELECT 1 FROM project_cards pc
             JOIN project_boards pb ON pb.id = pc.board_id
             WHERE pb.client_id::text = ce.client_id::text
               AND pb.tenant_id = $2
               AND pc.created_at > now() - interval '7 days'
           )`,
        [clientId, tenantId],
      ),

      // Financial
      query<{ renewal_days: string | null; overdue: string }>(
        `SELECT
           MIN(EXTRACT(DAY FROM renewal_date - now()))::text AS renewal_days,
           COUNT(*) FILTER (WHERE status = 'overdue') ::text AS overdue
         FROM client_contracts
         WHERE client_id = $1 AND tenant_id = $2 AND status NOT IN ('cancelled', 'completed')`,
        [clientId, tenantId],
      ).catch(() => ({ rows: [{ renewal_days: null, overdue: '0' }] })),

      // Learning rules
      query<{ total: string; new_24h: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE is_active = true) ::text AS total,
           COUNT(*) FILTER (WHERE is_active = true AND created_at > now() - interval '24 hours') ::text AS new_24h
         FROM learning_rules
         WHERE client_id = $1 AND tenant_id = $2`,
        [clientId, tenantId],
      ),

      // Competitors active in 48h
      query<{ active: string }>(
        `SELECT COUNT(DISTINCT cp.id)::text AS active
         FROM competitor_profiles cp
         JOIN competitor_posts cpost ON cpost.competitor_profile_id = cp.id
         WHERE cp.client_id = $1 AND cp.tenant_id = $2
           AND cpost.published_at > now() - interval '48 hours'`,
        [clientId, tenantId],
      ),

      // Jobs without briefing + DA stale
      query<{ no_briefing: string; da_stale: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE j.status IN ('intake','briefing') AND NOT EXISTS (
             SELECT 1 FROM job_briefings jb WHERE jb.job_id = j.id
           )) ::text AS no_briefing,
           COUNT(*) FILTER (WHERE j.status IN ('allocated','in_progress')
             AND j.updated_at < now() - interval '48 hours'
             AND j.deadline_at < now() + interval '2 days'
           ) ::text AS da_stale
         FROM jobs j
         WHERE j.client_id = $1 AND j.tenant_id = $2`,
        [clientId, tenantId],
      ),
      buildClientKnowledgeBase({
        tenantId,
        clientId,
        daysBack: 30,
        limitDocuments: 6,
        intent: 'ops',
      }),
    ]);

  const getInt = (r: PromiseSettledResult<{ rows: any[] }>, field: string, fallback = 0): number => {
    if (r.status !== 'fulfilled') return fallback;
    const val = r.value.rows[0]?.[field];
    return val == null ? fallback : parseInt(val, 10) || 0;
  };

  const [openAlertsRes] = await Promise.allSettled([
    query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM jarvis_alerts
       WHERE tenant_id = $1 AND client_id = $2 AND status = 'open'`,
      [tenantId, clientId],
    ),
  ]);
  const openAlerts = openAlertsRes.status === 'fulfilled' ? parseInt(openAlertsRes.value.rows[0]?.cnt ?? '0', 10) : 0;

  const meetingRow = meetings.status === 'fulfilled' ? meetings.value.rows[0] : null;
  const waRow = whatsapp.status === 'fulfilled' ? whatsapp.value.rows[0] : null;
  const financialRow = financial.status === 'fulfilled' ? financial.value.rows[0] : null;
  const livingMemorySnapshot = livingMemory.status === 'fulfilled'
    ? livingMemory.value.living_memory_summary
    : {
      active_directives: 0,
      evidence_signals: 0,
      fresh_signals_7d: 0,
      pending_commitments: 0,
    };
  const livingMemoryPreview = livingMemory.status === 'fulfilled'
    ? {
      directives: livingMemory.value.directives.map((item) => item.title),
      evidence: livingMemory.value.evidence.map((item) => ({
        source_type: item.source_type || 'memory',
        title: item.title,
        excerpt: item.summary || item.fact_text,
        occurred_at: item.related_at,
      })),
      pending_commitments: livingMemory.value.commitments.map((item) => ({
        title: item.title,
        responsible: null,
        deadline: item.related_at,
      })),
    }
    : {
      directives: [],
      evidence: [],
      pending_commitments: [],
    };

  return {
    client_id: clientId,
    tenant_id: tenantId,
    snapshot_at: new Date(),
    awareness: {
      trello: {
        active_jobs: getInt(trello, 'active_jobs'),
        blocked: getInt(trello, 'blocked'),
        stale: getInt(trello, 'stale'),
      },
      meetings: {
        pending_decisions: parseInt(meetingRow?.pending_decisions ?? '0', 10) || 0,
        last_meeting_days_ago: meetingRow?.last_days ? parseFloat(meetingRow.last_days) : null,
      },
      whatsapp: {
        days_without_client_response: waRow?.days_without_response
          ? parseFloat(waRow.days_without_response) : null,
        pending_approval: waRow?.has_pending === 'true',
      },
      calendar: { upcoming_orphan_dates: getInt(calendar, 'orphan_count') },
      financial: {
        contract_renewal_days: financialRow?.renewal_days != null
          ? parseFloat(financialRow.renewal_days) : null,
        invoices_overdue: parseInt(financialRow?.overdue ?? '0', 10) || 0,
      },
      learning: {
        active_rules: getInt(learning, 'total'),
        new_patterns_24h: getInt(learning, 'new_24h'),
      },
      competitors: { active_in_48h: getInt(competitors, 'active') },
      social: { mentions_24h: 0 },  // wire up when social_mentions table is used
      jobs: {
        without_briefing: getInt(jobs, 'no_briefing'),
        da_stale: getInt(jobs, 'da_stale'),
      },
      living_memory: {
        active_directives: livingMemorySnapshot.active_directives,
        evidence_signals_30d: livingMemorySnapshot.evidence_signals,
        fresh_signals_7d: livingMemorySnapshot.fresh_signals_7d,
        pending_commitments: livingMemorySnapshot.pending_commitments,
      },
    },
    open_alerts: openAlerts,
    pending_decisions: [],
    living_memory_preview: livingMemoryPreview,
  };
}

// ── processAlerts ─────────────────────────────────────────────────────────────

/**
 * Fetches open jarvis_alerts for a tenant, classifies them, and returns
 * a prioritized list of JarvisDecisions for the frontend.
 *
 * Also persists the weight + autonomy_level back to jarvis_alerts.
 */
export async function processAlerts(tenantId: string, limit = 50): Promise<JarvisDecision[]> {
  const { rows } = await query<{
    id: string; client_id: string | null; alert_type: string;
    title: string; body: string; priority: string; source_refs: any;
    created_at: string;
  }>(
    `SELECT id, client_id, alert_type, title, body, priority, source_refs, created_at
     FROM jarvis_alerts
     WHERE tenant_id = $1 AND status = 'open'
     ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
              created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );

  // Map alert_type → rule_id + urgency/confidence/impact estimates
  const ALERT_WEIGHTS: Record<string, Pick<RawEvent, 'rule_id' | 'urgency' | 'confidence' | 'impact' | 'source'>> = {
    card_stalled:         { rule_id: 'C04', urgency: 2, confidence: 1.0, impact: 2, source: 'trello' },
    meeting_no_card:      { rule_id: 'C01', urgency: 3, confidence: 0.85, impact: 4, source: 'meetings' },
    whatsapp_no_reply:    { rule_id: 'C02', urgency: 4, confidence: 0.9,  impact: 4, source: 'whatsapp' },
    contract_expiring:    { rule_id: 'C03', urgency: 5, confidence: 1.0,  impact: 5, source: 'financial' },
    market_opportunity:   { rule_id: 'C05', urgency: 2, confidence: 0.8,  impact: 4, source: 'clipping' },
    job_no_briefing:      { rule_id: 'CX',  urgency: 2, confidence: 1.0,  impact: 3, source: 'jobs' },
    calendar_date_orphan: { rule_id: 'C07', urgency: 3, confidence: 1.0,  impact: 3, source: 'calendar' },
    competitor_active:    { rule_id: 'C08', urgency: 2, confidence: 0.8,  impact: 4, source: 'competitors' },
    da_stale:             { rule_id: 'C09', urgency: 4, confidence: 1.0,  impact: 4, source: 'trello' },
    learning_pattern_new: { rule_id: 'C10', urgency: 1, confidence: 0.75, impact: 3, source: 'learning' },
  };

  const decisions: JarvisDecision[] = rows.map((row) => {
    const w = ALERT_WEIGHTS[row.alert_type] ?? { rule_id: 'CX', urgency: 2, confidence: 0.7, impact: 2, source: 'trello' as const };
    const event: RawEvent = {
      rule_id:    w.rule_id,
      tenant_id:  tenantId,
      client_id:  row.client_id,
      source:     w.source,
      title:      row.title,
      body:       row.body,
      urgency:    w.urgency,
      confidence: w.confidence,
      impact:     w.impact,
      ref_id:     row.id,
    };
    return classifyEvent(event);
  });

  // Sort by weight descending
  decisions.sort((a, b) => b.weight - a.weight);
  return decisions;
}
