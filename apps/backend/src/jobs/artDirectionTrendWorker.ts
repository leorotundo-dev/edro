import {
  analyzePendingArtDirectionReferences,
  recomputeArtDirectionTrendSnapshots,
} from '../services/ai/artDirectionMemoryService';

let running = false;
let lastRunDay = '';

function isEnabled() {
  const flag = process.env.ART_DIRECTION_TREND_ENABLED;
  if (flag === undefined) return false;
  return flag === 'true' || flag === '1';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function runArtDirectionTrendWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;
  const hour = new Date().getHours();
  const today = todayStr();
  if (hour !== 3 || lastRunDay === today) return;

  running = true;
  lastRunDay = today;
  try {
    const analyzed = await analyzePendingArtDirectionReferences(12);
    const snapshots = await recomputeArtDirectionTrendSnapshots({ windowDays: 30, recentDays: 7 });
    console.log(`[artDirectionTrendWorker] analyzed=${analyzed} snapshots=${snapshots}`);
  } catch (error: any) {
    console.error('[artDirectionTrendWorker] failed:', error?.message || error);
  } finally {
    running = false;
  }
}
