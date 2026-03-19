/**
 * Scheduled Publications Worker
 *
 * Roda a cada 5 min (auto-throttled).
 * Processa entradas vencidas em scheduled_publications:
 *   - LinkedIn com connector ativo → publica diretamente via API
 *   - Outros canais → envia notificação "está na hora de publicar"
 *
 * Status transitions:
 *   scheduled → published   (LinkedIn com sucesso)
 *   scheduled → failed      (LinkedIn com erro)
 *   scheduled → notified    (não-LinkedIn: notification sent)
 */

import { query } from '../db';
import { publishLinkedInPost } from '../services/integrations/linkedinService';
import { notifyEvent } from '../services/notificationService';

const MAX_PER_TICK = 5;

// ── Self-throttle: 1× per 5 minutes ──────────────────────────────────────────

let lastRunAt = 0;
const RUN_INTERVAL_MS = 5 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadLinkedInConnector(tenantId: string, clientId: string) {
  const res = await query<any>(
    `SELECT id, access_token, user_id
     FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'linkedin' AND status = 'active'
     LIMIT 1`,
    [tenantId, clientId],
  );
  return res.rows[0] ?? null;
}

async function loadAccountManager(tenantId: string) {
  const res = await query<any>(
    `SELECT id, email, name FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'account_manager')
     ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  );
  return res.rows[0] ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runScheduledPublicationsOnce(): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < RUN_INTERVAL_MS) return;
  lastRunAt = now;

  const res = await query<any>(
    `SELECT sp.id, sp.tenant_id, sp.briefing_id, sp.platform,
            sp.copy_text, sp.image_url, sp.scheduled_at,
            b.main_client_id AS client_id, b.title AS briefing_title, b.source
     FROM scheduled_publications sp
     LEFT JOIN edro_briefings b ON b.id = sp.briefing_id
     WHERE sp.status = 'scheduled'
       AND sp.scheduled_at <= NOW()
     ORDER BY sp.scheduled_at ASC
     LIMIT $1`,
    [MAX_PER_TICK],
  );

  if (!res.rows.length) return;

  console.log(`[scheduledPublications] Processing ${res.rows.length} due publications.`);

  for (const pub of res.rows) {
    try {
      const tenantId: string = pub.tenant_id;
      const clientId: string = pub.client_id;
      const platform: string = (pub.platform ?? '').toLowerCase();

      if (platform === 'linkedin' && clientId) {
        const connector = await loadLinkedInConnector(tenantId, clientId);

        if (connector) {
          await publishLinkedInPost(tenantId, clientId, {
            caption:  pub.copy_text ?? '',
            imageUrl: pub.image_url ?? '',
            title:    pub.briefing_title ?? '',
          });

          await query(
            `UPDATE scheduled_publications SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [pub.id],
          );
          console.log(`[scheduledPublications] Published to LinkedIn: pub=${pub.id} client=${clientId}`);
          continue;
        }
      }

      // Non-LinkedIn or no connector: notify account manager to publish manually
      const accountManager = await loadAccountManager(tenantId);
      if (accountManager) {
        await notifyEvent({
          event: 'scheduled_publication_due',
          tenantId,
          userId: accountManager.id,
          title: `Publicação agendada pronta: ${pub.briefing_title ?? platform}`,
          body: `Sua publicação em ${platform} está pronta para ir ao ar. Revise e publique.`,
          link: pub.briefing_id ? `/studio/brief/${pub.briefing_id}` : '/studio',
          recipientEmail: accountManager.email,
          payload: {
            schedule_id:    pub.id,
            briefing_id:    pub.briefing_id,
            platform,
            scheduled_at:   pub.scheduled_at,
          },
        });
      }

      await query(
        `UPDATE scheduled_publications SET status = 'notified', updated_at = NOW() WHERE id = $1`,
        [pub.id],
      );
      console.log(`[scheduledPublications] Notified for manual publish: pub=${pub.id} platform=${platform}`);
    } catch (err: any) {
      console.error(`[scheduledPublications] Error for pub=${pub.id}:`, err?.message);
      await query(
        `UPDATE scheduled_publications SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [pub.id],
      ).catch(() => null);
    }
  }
}
