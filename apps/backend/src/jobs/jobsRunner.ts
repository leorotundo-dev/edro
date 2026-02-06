import { runLibraryWorkerOnce } from '../library/processWorker';
import { runClippingWorkerOnce } from '../clipping/worker';
import { runSocialListeningWorkerOnce } from '../socialListening/worker';
import { runClientIntelligenceWorkerOnce } from '../clientIntelligence/worker';
import { runCalendarRelevanceWorkerOnce } from './calendarRelevanceWorker';

export function startJobsRunner() {
  const enabled = (process.env.JOBS_RUNNER_ENABLED || 'true') === 'true';
  if (!enabled) return;

  const intervalMs = Number(process.env.JOBS_RUNNER_INTERVAL_MS || 5000);

  // Prevent overlapping ticks: setInterval + async can re-enter if the previous tick takes longer than intervalMs.
  let tickRunning = false;

  setInterval(async () => {
    if (tickRunning) return;
    tickRunning = true;
    try {
      await runLibraryWorkerOnce();
      await runClippingWorkerOnce();
      await runSocialListeningWorkerOnce();
      await runClientIntelligenceWorkerOnce();
      await runCalendarRelevanceWorkerOnce();
    } catch {
      // ignore loop errors
    } finally {
      tickRunning = false;
    }
  }, intervalMs);
}
