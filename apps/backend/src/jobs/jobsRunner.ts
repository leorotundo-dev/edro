import { runLibraryWorkerOnce } from '../library/processWorker';
import { runClippingWorkerOnce } from '../clipping/worker';
import { runSocialListeningWorkerOnce } from '../socialListening/worker';

export function startJobsRunner() {
  const enabled = (process.env.JOBS_RUNNER_ENABLED || 'true') === 'true';
  if (!enabled) return;

  const intervalMs = Number(process.env.JOBS_RUNNER_INTERVAL_MS || 5000);

  setInterval(async () => {
    try {
      await runLibraryWorkerOnce();
      await runClippingWorkerOnce();
      await runSocialListeningWorkerOnce();
    } catch {
      // ignore loop errors
    }
  }, intervalMs);
}
