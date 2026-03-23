/**
 * metaSyncService.ts
 *
 * Compatibility wrapper for the daily Meta sync worker and legacy route.
 * The canonical sync logic now lives in instagramSyncService.ts.
 */
import { recomputeClientLearningRules } from '../learningEngine';
import { computeClientCopyRoi } from '../copyRoiService';
import { syncInstagramMetrics } from './instagramSyncService';

export interface SyncResult {
  synced:  number;   // formats successfully synced
  skipped: number;   // formats without media_id or token
  errors:  string[]; // per-format error messages (non-fatal)
}

export async function syncMetaPerformanceForClient(
  tenantId: string,
  clientId: string,
): Promise<SyncResult> {
  const syncResult = await syncInstagramMetrics(tenantId, clientId);
  const result: SyncResult = {
    synced: syncResult.synced,
    skipped: syncResult.skipped,
    errors: syncResult.errors.map((entry) => `format ${entry.format_id}: ${entry.error}`),
  };

  if (result.synced > 0) {
    recomputeClientLearningRules(tenantId, clientId).catch(() => {});
    computeClientCopyRoi(tenantId, clientId).catch(() => {});
  }

  return result;
}
