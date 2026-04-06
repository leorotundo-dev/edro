/**
 * Jarvis KB Worker
 *
 * Roda após reporteiSyncWorker (segunda-feira 04h) e via trigger manual.
 *
 * Para cada cliente ativo:
 *   1. synthesizeClientKb() — learning_rules → jarvis_kb_entries
 *
 * Depois de todos os clientes:
 *   2. promoteToAgencyKb() — padrões em 3+ clientes → jarvis_agency_kb_entries
 *
 * Resultado: JARVIS tem memória acumulada disponível para injetar no intelligenceEngine.
 */

import { query } from '../db';
import { synthesizeClientKb, promoteToAgencyKb, synthesizeTrelloKb } from '../services/jarvisKbService';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runJarvisKbWorkerOnce(): Promise<void> {
  console.log('[jarvisKbWorker] Starting KB synthesis...');
  const start = Date.now();

  const { rows: tenants } = await query(
    `SELECT DISTINCT tenant_id FROM clients WHERE is_active = true`,
    []
  );

  let totalClientEntries = 0;
  let totalAgencyEntries = 0;
  let clientsProcessed = 0;
  let errors = 0;

  for (const { tenant_id } of tenants) {
    const { rows: clients } = await query(
      `SELECT id FROM clients WHERE tenant_id=$1 AND is_active=true`,
      [tenant_id]
    );

    for (const { id: clientId } of clients) {
      try {
        const count = await synthesizeClientKb(tenant_id, clientId);
        totalClientEntries += count;
        clientsProcessed++;

        if (count > 0) {
          console.log(`[jarvisKbWorker] client=${clientId} → ${count} KB entries synthesized`);
        }
      } catch (err) {
        errors++;
        console.error(`[jarvisKbWorker] Error on client=${clientId}:`, err);
      }

      // Synthesize Trello work history patterns into KB
      try {
        const trelloCount = await synthesizeTrelloKb(tenant_id, clientId);
        if (trelloCount > 0) {
          totalClientEntries += trelloCount;
          console.log(`[jarvisKbWorker] client=${clientId} → ${trelloCount} Trello KB entries synthesized`);
        }
      } catch (err) {
        // Trello not configured or no data — graceful degradation
        console.warn(`[jarvisKbWorker] Trello KB skip for client=${clientId}:`, (err as any)?.message);
      }

      // Rate limiting — avoid hammering the DB
      await sleep(100);
    }

    // After all clients of a tenant, promote cross-client patterns
    try {
      const promoted = await promoteToAgencyKb(tenant_id);
      totalAgencyEntries += promoted;
      if (promoted > 0) {
        console.log(`[jarvisKbWorker] tenant=${tenant_id} → ${promoted} patterns promoted to agency KB`);
      }
    } catch (err) {
      console.error(`[jarvisKbWorker] Error promoting agency KB for tenant=${tenant_id}:`, err);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[jarvisKbWorker] Done in ${elapsed}s. ` +
    `Clients: ${clientsProcessed}, KB entries: ${totalClientEntries}, ` +
    `Agency promotions: ${totalAgencyEntries}, Errors: ${errors}`
  );
}
