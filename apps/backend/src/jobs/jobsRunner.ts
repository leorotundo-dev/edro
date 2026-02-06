import { runLibraryWorkerOnce } from '../library/processWorker';
import { runClippingWorkerOnce } from '../clipping/worker';
import { runSocialListeningWorkerOnce } from '../socialListening/worker';
import { runClientIntelligenceWorkerOnce } from '../clientIntelligence/worker';
import { runCalendarRelevanceWorkerOnce } from './calendarRelevanceWorker';

export function startJobsRunner() {
  const enabled = (process.env.JOBS_RUNNER_ENABLED || 'true') === 'true';
  if (!enabled) return;

  const intervalMs = Number(process.env.JOBS_RUNNER_INTERVAL_MS || 5000);
  const warnMs = Number(process.env.JOBS_RUNNER_WARN_MS || 30_000);

  // Run each worker in its own non-overlapping loop.
  // This prevents one stuck/slow worker from blocking all others (e.g. clipping).
  function startWorkerLoop(name: string, fn: () => Promise<any>, startDelayMs: number) {
    let running = false;

    const tick = async () => {
      if (running) return;
      running = true;
      const startedAt = Date.now();
      try {
        await fn();
      } catch (error: any) {
        // Don't crash the server for background loop errors.
        console.error(`[jobs] worker ${name} failed:`, error?.message || error);
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed > warnMs) {
          console.warn(`[jobs] worker ${name} slow: ${elapsed}ms`);
        }
        running = false;
      }
    };

    setTimeout(() => {
      void tick();
      setInterval(() => void tick(), intervalMs);
    }, startDelayMs);
  }

  // Small staggering to reduce DB burst at process start.
  startWorkerLoop('library', runLibraryWorkerOnce, 0);
  startWorkerLoop('clipping', runClippingWorkerOnce, 500);
  startWorkerLoop('socialListening', runSocialListeningWorkerOnce, 1000);
  startWorkerLoop('clientIntelligence', runClientIntelligenceWorkerOnce, 1500);
  startWorkerLoop('calendarRelevance', runCalendarRelevanceWorkerOnce, 2000);
}
