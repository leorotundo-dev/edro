/**
 * Content Fatigue Monitor Worker
 *
 * Roda a cada tick (auto-throttled: 1x/hora).
 * Para cada campanha ativa com métricas recentes:
 *   1. Compara engagement_rate dos últimos 7 dias vs média histórica dos 30-90 dias
 *   2. Se queda > 25%: detecta fadiga de copy
 *   3. Gera copy substituta automaticamente via AgentWriter
 *   4. Cria edro_briefing com status='draft' e nota de fadiga
 *   5. Notifica: "Copy com queda de X% — substituta pronta para aprovação"
 *
 * Não duplica alertas: verifica se já existe briefing de substituição
 * para o campaign_format nas últimas 2 semanas.
 */

import { query } from '../db';
import { generateBehavioralDraft } from '../services/ai/agentWriter';
import { notifyEvent } from '../services/notificationService';

const FATIGUE_THRESHOLD = 0.25;  // 25% drop
const MIN_HISTORY_DAYS = 14;     // Needs at least 14 days of data
const MAX_PER_TICK = 10;
const COOLDOWN_HOURS = 24;

let lastRunHour = -1;

// ── Detect fatigue for a campaign format ──────────────────────────────────────

interface FatigueCandidate {
  format_id: string;
  format_name: string;
  platform: string;
  client_id: string;
  tenant_id: string;
  campaign_id: string;
  recent_eng: number;
  historical_eng: number;
  drop_pct: number;
  amd: string | null;
}

async function detectFatiguedFormats(): Promise<FatigueCandidate[]> {
  const res = await query<any>(
    `SELECT
       cf.id as format_id,
       cf.format_name,
       cf.platform,
       c.client_id,
       c.tenant_id,
       c.id as campaign_id,
       -- Recent 7-day avg engagement rate
       AVG(CASE WHEN fpm.measurement_date >= CURRENT_DATE - 7 THEN fpm.engagement_rate END) as recent_eng,
       -- Historical 14-90 day avg engagement rate
       AVG(CASE WHEN fpm.measurement_date < CURRENT_DATE - 7
                 AND fpm.measurement_date >= CURRENT_DATE - 90 THEN fpm.engagement_rate END) as historical_eng,
       -- Get AMD from campaign behavior_intents
       (SELECT bi->>'amd' FROM jsonb_array_elements(COALESCE(c.behavior_intents, '[]'::jsonb)) bi LIMIT 1) as amd
     FROM campaign_formats cf
     JOIN campaigns c ON c.id = cf.campaign_id
     JOIN format_performance_metrics fpm ON fpm.format_id = cf.id
     WHERE cf.launched_at IS NOT NULL
       AND cf.launched_at <= NOW() - INTERVAL '${MIN_HISTORY_DAYS} days'
       AND c.status IN ('active', 'running', 'published')
       AND fpm.engagement_rate > 0
     GROUP BY cf.id, cf.format_name, cf.platform, c.client_id, c.tenant_id, c.id, c.behavior_intents
     HAVING
       COUNT(CASE WHEN fpm.measurement_date >= CURRENT_DATE - 7 THEN 1 END) >= 3
       AND COUNT(CASE WHEN fpm.measurement_date < CURRENT_DATE - 7 THEN 1 END) >= 5
       AND AVG(CASE WHEN fpm.measurement_date >= CURRENT_DATE - 7 THEN fpm.engagement_rate END) > 0
       AND AVG(CASE WHEN fpm.measurement_date < CURRENT_DATE - 7
                     AND fpm.measurement_date >= CURRENT_DATE - 90 THEN fpm.engagement_rate END) > 0
     ORDER BY c.tenant_id, c.client_id
     LIMIT $1`,
    [MAX_PER_TICK * 3],
  );

  return res.rows
    .filter((r: any) => {
      const recent = parseFloat(r.recent_eng ?? '0');
      const historical = parseFloat(r.historical_eng ?? '0');
      if (historical <= 0) return false;
      const drop = (historical - recent) / historical;
      r.recent_eng = recent;
      r.historical_eng = historical;
      r.drop_pct = drop;
      return drop >= FATIGUE_THRESHOLD;
    })
    .slice(0, MAX_PER_TICK) as FatigueCandidate[];
}

async function hasRecentFatigueBriefing(formatId: string): Promise<boolean> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM edro_briefings
     WHERE source = 'fatigue_substitution'
       AND (payload->>'format_id') = $1
       AND created_at >= NOW() - INTERVAL '14 days'`,
    [formatId],
  );
  return parseInt(res.rows[0]?.count ?? '0') > 0;
}

// ── Load client context ───────────────────────────────────────────────────────

async function loadClientContext(clientId: string, tenantId: string) {
  const res = await query<any>(
    `SELECT id, name, segment, profile FROM clients WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId],
  );
  return res.rows[0] ?? null;
}

async function loadAccountManager(tenantId: string) {
  const res = await query<any>(
    `SELECT id, email, name FROM users WHERE tenant_id = $1 AND role IN ('admin', 'account_manager') ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  );
  return res.rows[0] ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runContentFatigueMonitorOnce(): Promise<void> {
  // Self-throttle: 1x/hora
  const currentHour = new Date().getUTCHours();
  if (currentHour === lastRunHour) return;
  lastRunHour = currentHour;

  const fatigued = await detectFatiguedFormats();
  if (!fatigued.length) return;

  console.log(`[fatigueMonitor] Detected ${fatigued.length} fatigued formats.`);

  for (const fmt of fatigued) {
    try {
      // Check cooldown
      if (await hasRecentFatigueBriefing(fmt.format_id)) continue;

      const client = await loadClientContext(fmt.client_id, fmt.tenant_id);
      if (!client) continue;

      const amd = fmt.amd ?? 'salvar';
      const dropPct = Math.round(fmt.drop_pct * 100);

      // Generate substitute copy
      const draft = await generateBehavioralDraft({
        platform: fmt.platform ?? 'instagram',
        persona: {
          name: client.name,
          role: client.segment ?? 'profissional',
          pain_points: [],
          objection_patterns: [],
        },
        behaviorIntent: {
          amd,
          momento: 'solucao',
          triggers: ['especificidade', 'prova_social', 'autoridade'],
          target_behavior: `Renovar engajamento após fadiga de copy em ${fmt.platform}`,
        },
        clientName: client.name,
        clientSegment: client.segment ?? '',
        knowledgeBlock: `Esta copy substitui um formato com queda de ${dropPct}% de engajamento. Usar abordagem diferente da anterior.`,
      });

      const copyText = [draft.hook_text, draft.content_text, draft.cta_text].filter(Boolean).join('\n\n');

      // Create briefing
      const briefingPayload = {
        auto_generated: true,
        fatigue_substitution: true,
        format_id: fmt.format_id,
        format_name: fmt.format_name,
        platform: fmt.platform,
        campaign_id: fmt.campaign_id,
        recent_engagement: fmt.recent_eng,
        historical_engagement: fmt.historical_eng,
        drop_pct: dropPct,
        draft_copy: {
          hook_text: draft.hook_text,
          content_text: draft.content_text,
          cta_text: draft.cta_text,
          amd,
        },
      };

      const briefingRes = await query<{ id: string }>(
        `INSERT INTO edro_briefings
           (main_client_id, title, status, source, payload, created_by)
         VALUES ($1, $2, 'draft', 'fatigue_substitution', $3, 'system')
         RETURNING id`,
        [
          fmt.client_id,
          `[Substituta] ${fmt.format_name} — queda de ${dropPct}% no engajamento`,
          JSON.stringify(briefingPayload),
        ],
      );

      const briefingId = briefingRes.rows[0]?.id;

      if (briefingId) {
        await query(
          `INSERT INTO edro_copy_versions (briefing_id, language, model, output, created_by)
           VALUES ($1, 'pt', 'fatigue_monitor', $2, 'system')`,
          [briefingId, copyText],
        );
      }

      // Notify
      const accountManager = await loadAccountManager(fmt.tenant_id);
      if (accountManager && briefingId) {
        await notifyEvent({
          event: 'content_fatigue_detected',
          tenantId: fmt.tenant_id,
          userId: accountManager.id,
          title: `Copy com fadiga: ${fmt.format_name}`,
          body: `Queda de ${dropPct}% no engajamento em ${fmt.platform}. Copy substituta gerada e pronta para aprovação.`,
          link: `/studio/brief/${briefingId}`,
          recipientEmail: accountManager.email,
          payload: {
            briefing_id: briefingId,
            format_id: fmt.format_id,
            format_name: fmt.format_name,
            drop_pct: dropPct,
          },
        });
      }

      console.log(`[fatigueMonitor] Briefing ${briefingId} created for format "${fmt.format_name}" (-${dropPct}%)`);
    } catch (err: any) {
      console.error(`[fatigueMonitor] Error for format ${fmt.format_id}:`, err?.message);
    }
  }
}
