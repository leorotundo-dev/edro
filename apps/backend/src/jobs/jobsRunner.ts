import { runLibraryWorkerOnce } from '../library/processWorker';
import { runClippingWorkerOnce } from '../clipping/worker';
import { runSocialListeningWorkerOnce } from '../socialListening/worker';
import { runClientIntelligenceWorkerOnce } from '../clientIntelligence/worker';
import { runCalendarRelevanceWorkerOnce } from './calendarRelevanceWorker';
import { runDailyAlertsWorkerOnce } from './dailyAlertsWorker';
import { runClientEnrichmentWorkerOnce } from './clientEnrichmentWorker';
import { runWebIntelligenceWorkerOnce } from './webIntelligenceWorker';
import { runTrendRadarWorkerOnce } from './trendRadarWorker';
import { runCalendarEnrichmentWorkerOnce } from './calendarEnrichmentWorker';
import { runClippingTavilyWorkerOnce } from './clippingTavilyWorker';
import { runCalendarInspirationWorkerOnce } from './calendarInspirationWorker';
import { runArchiveStaleBriefingsOnce } from './archiveStaleBriefingsWorker';
import { runReporteiSyncWorkerOnce } from './reporteiSyncWorker';
import { runPerformanceAlertWorkerOnce } from './performanceAlertWorker';
import { runClientHealthWorkerOnce } from './clientHealthWorker';
import { runOperationalAgentOnce } from './operationalAgentWorker';
import { runBriefingSchedulerOnce } from './briefingSchedulerWorker';
import { runMonthlyReportsWorkerOnce } from './monthlyReportsWorker';

export function startJobsRunner() {
  const enabled = (process.env.JOBS_RUNNER_ENABLED || 'true') === 'true';
  if (!enabled) return;

  const intervalMs = Number(process.env.JOBS_RUNNER_INTERVAL_MS || 5000);
  const warnMs = Number(process.env.JOBS_RUNNER_WARN_MS || 30_000);

  // Run each worker in its own non-overlapping loop.
  // This prevents one stuck/slow worker from blocking all others (e.g. clipping).
  function startWorkerLoop(name: string, fn: () => Promise<any>, startDelayMs: number, customWarnMs?: number) {
    let running = false;
    const effectiveWarnMs = customWarnMs ?? warnMs;

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
        if (elapsed > effectiveWarnMs) {
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
  // 2 min threshold — runs every ~2h, processes calendar relevance scoring
  startWorkerLoop('calendarRelevance', runCalendarRelevanceWorkerOnce, 2000, 120_000);
  startWorkerLoop('clientEnrichment', runClientEnrichmentWorkerOnce, 2500);
  // Daily alerts (bottleneck + PoV) — ticks every 60s, runs at 09h
  startWorkerLoop('dailyAlerts', runDailyAlertsWorkerOnce, 3000);
  // Web market intelligence — auto-schedules stale clients + processes jobs
  startWorkerLoop('webIntelligence', runWebIntelligenceWorkerOnce, 3500);
  // Trend radar — runs every Monday at 08h, saves sector trends to library
  startWorkerLoop('trendRadar', runTrendRadarWorkerOnce, 4000);
  // Calendar enrichment — Tavily + OpenAI batch of 20 events/hour, 3-5 min is normal
  startWorkerLoop('calendarEnrichment', runCalendarEnrichmentWorkerOnce, 4500, 600_000);
  // Clipping Tavily supplement — injects Tavily search results as TREND clipping items (every 6h)
  startWorkerLoop('clippingTavily', runClippingTavilyWorkerOnce, 5000);
  // Calendar inspiration — Tavily scrape for high-relevance dates (1×/day), 2 min threshold
  startWorkerLoop('calendarInspiration', runCalendarInspirationWorkerOnce, 5500, 120_000);
  // Auto-archive stale briefings (due_at passado) — roda 1× por dia, snapshot do copy gerado
  startWorkerLoop('archiveStale', runArchiveStaleBriefingsOnce, 6000);
  // Reportei sync — runs every Monday, fetches 7d/30d/90d metrics for all clients
  startWorkerLoop('reporteiSync', runReporteiSyncWorkerOnce, 6500, 300_000);
  // Performance alerts — runs every Monday, detects drops/spikes vs previous period
  startWorkerLoop('performanceAlerts', runPerformanceAlertWorkerOnce, 7000, 120_000);
  // Client Health Score — runs every Monday, computes 0-100 health per client
  startWorkerLoop('clientHealth', runClientHealthWorkerOnce, 7500, 120_000);
  // Operational Agent — runs every 30min (self-throttled), monitors stalls/budgets/deadlines
  startWorkerLoop('operationalAgent', runOperationalAgentOnce, 8000, 120_000);
  // Briefing Scheduler — creates recurring jobs (self-throttled to 1min)
  startWorkerLoop('briefingScheduler', runBriefingSchedulerOnce, 8500, 60_000);
  // Monthly Reports — generates PDFs on day 1 of each month (self-throttled)
  startWorkerLoop('monthlyReports', runMonthlyReportsWorkerOnce, 9000, 300_000);
}
