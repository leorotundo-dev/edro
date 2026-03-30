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
import { runMetaSyncWorkerOnce } from './metaSyncWorker';
import { runCopyRoiWorkerOnce } from './copyRoiWorker';
import { runAccountManagerWorkerOnce } from './accountManagerWorker';
import { runMeetBotWorkerOnce } from './meetBotWorker';
import { runWatchRenewWorkerOnce } from './watchRenewWorker';
import { runGroupIntelligenceWorkerOnce } from './groupIntelligenceWorker';
import { runGroupDigestWorkerOnce } from './groupDigestWorker';
import { runGroupDeadlineAlertWorkerOnce } from './groupDeadlineAlertWorker';
import { runOperationsRuntimeWorkerOnce } from './operationsRuntimeWorker';
import { runJobAutomationWorkerOnce } from './jobAutomationWorker';
import { runWhatsAppMemoryBackfillWorkerOnce } from './whatsappMemoryBackfillWorker';
import { runWhatsAppHealthWorkerOnce } from './whatsappHealthWorker';
import { runOpsDigestWorkerOnce } from './opsDigestWorker';
import { runSimulationOutcomeMatcherOnce } from './simulationOutcomeMatcherWorker';
import { runAutoBriefingFromOpportunityOnce } from './autoBriefingFromOpportunityWorker';
import { runContentFatigueMonitorOnce } from './contentFatigueMonitorWorker';
import { runScheduledPublicationsOnce } from './scheduledPublicationsWorker';
import { runWeeklyDigestOnce } from './weeklyDigestWorker';
import { runCompetitorIntelligenceWorkerOnce } from './competitorIntelligenceWorker';
import { runOpportunityDetectorWorkerOnce } from './opportunityDetectorWorker';
import { runTrelloSyncWorkerOnce } from './trelloSyncWorker';
import { runJarvisAlertWorkerOnce } from './jarvisAlertWorker';
import { runArtDirectionReferenceWorkerOnce } from './artDirectionReferenceWorker';
import { runArtDirectionTrendWorkerOnce } from './artDirectionTrendWorker';
import { runWebhookRetryWorkerOnce } from './webhookRetryWorker';
import { runAgencyDigestWorkerOnce } from './agencyDigestWorker';
import { runClientPostsWorkerOnce } from './clientPostsWorker';
import { runJarvisBackgroundWorkerOnce } from './jarvisBackgroundWorker';
import { runJarvisCreationWorkerOnce } from './jarvisCreationWorker';

export function startJobsRunner() {
  const enabled = (process.env.JOBS_RUNNER_ENABLED || 'true') === 'true';
  if (!enabled) return;

  const defaultIntervalMs = Number(process.env.JOBS_RUNNER_INTERVAL_MS || 5000);
  const warnMs = Number(process.env.JOBS_RUNNER_WARN_MS || 30_000);

  // Run each worker in its own non-overlapping loop.
  // customIntervalMs overrides the global interval for workers that don't need
  // sub-second polling (daily/weekly jobs self-throttle internally).
  function startWorkerLoop(
    name: string,
    fn: () => Promise<any>,
    startDelayMs: number,
    customWarnMs?: number,
    customIntervalMs?: number,
  ) {
    let running = false;
    const effectiveWarnMs = customWarnMs ?? warnMs;
    const effectiveIntervalMs = customIntervalMs ?? defaultIntervalMs;

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
      setInterval(() => void tick(), effectiveIntervalMs);
    }, startDelayMs);
  }

  // ── 5s — user-facing or truly time-critical ──────────────────────────────
  // These workers process user-triggered queues or must fire at exact times.
  startWorkerLoop('library', runLibraryWorkerOnce, 0);
  startWorkerLoop('clipping', runClippingWorkerOnce, 500);
  startWorkerLoop('socialListening', runSocialListeningWorkerOnce, 1000);
  startWorkerLoop('clientIntelligence', runClientIntelligenceWorkerOnce, 1500);
  // Central de Operações — keeps demands, agenda e riscos synchronized
  startWorkerLoop('operationsRuntime', runOperationsRuntimeWorkerOnce, 13500, 180_000);
  // Job Automation Pipeline — auto-copy, auto-image, auto-assign, ETA recalc
  startWorkerLoop('jobAutomation', runJobAutomationWorkerOnce, 14000, 120_000);
  // WhatsApp connection health — auto-reconnect disconnected Evolution instances
  startWorkerLoop('whatsappHealth', runWhatsAppHealthWorkerOnce, 15000, 30_000);
  // Scheduled Publications — publishes LinkedIn or notifies for other platforms
  startWorkerLoop('scheduledPublications', runScheduledPublicationsOnce, 17500, 60_000);
  // Jarvis Background — long-running actions such as full creative post pipelines
  startWorkerLoop('jarvisBackground', runJarvisBackgroundWorkerOnce, 17750, 180_000);
  // Webhook Retry — retries failed WhatsApp/Instagram/Recall events (max 3 attempts)
  startWorkerLoop('webhookRetry', runWebhookRetryWorkerOnce, 21500, 30_000);

  // ── 30s — periodic background (self-throttled, no user-visible impact) ───
  startWorkerLoop('clientEnrichment', runClientEnrichmentWorkerOnce, 2500, undefined, 30_000);
  // Operational Agent — monitors stalls/budgets/deadlines every 30min
  startWorkerLoop('operationalAgent', runOperationalAgentOnce, 8000, 120_000, 30_000);
  // Briefing Scheduler — creates recurring jobs (self-throttled to 1min)
  startWorkerLoop('briefingScheduler', runBriefingSchedulerOnce, 8500, 60_000, 30_000);

  // ── 60s — daily/weekly workers (self-throttle by time-of-day internally) ─
  // These workers check internally whether it's time to run. Polling every 60s
  // adds at most 60s of delay vs the configured schedule — acceptable for all.
  // This reduces baseline DB polling load from ~9.4 q/s to ~1.4 q/s.

  // 2 min threshold — runs every ~2h, processes calendar relevance scoring
  startWorkerLoop('calendarRelevance', runCalendarRelevanceWorkerOnce, 2000, 120_000, 60_000);
  // Daily alerts (bottleneck + PoV) — runs at 09h
  startWorkerLoop('dailyAlerts', runDailyAlertsWorkerOnce, 3000, undefined, 60_000);
  // Web market intelligence — auto-schedules stale clients + processes jobs
  startWorkerLoop('webIntelligence', runWebIntelligenceWorkerOnce, 3500, undefined, 60_000);
  // Trend radar — runs every Monday at 08h, saves sector trends to library
  startWorkerLoop('trendRadar', runTrendRadarWorkerOnce, 4000, undefined, 60_000);
  // Calendar enrichment — Tavily + OpenAI batch of 20 events/hour, 3-5 min is normal
  startWorkerLoop('calendarEnrichment', runCalendarEnrichmentWorkerOnce, 4500, 600_000, 60_000);
  // Clipping Tavily supplement — injects Tavily search results as TREND items (every 6h)
  startWorkerLoop('clippingTavily', runClippingTavilyWorkerOnce, 5000, undefined, 60_000);
  // Calendar inspiration — Tavily scrape for high-relevance dates (1×/day)
  startWorkerLoop('calendarInspiration', runCalendarInspirationWorkerOnce, 5500, 120_000, 60_000);
  // Auto-archive stale briefings (due_at passado) — roda 1× por dia
  startWorkerLoop('archiveStale', runArchiveStaleBriefingsOnce, 6000, undefined, 60_000);
  // Reportei sync — runs Mon/Wed/Fri (3×/week), fetches 7d/30d/90d metrics
  startWorkerLoop('reporteiSync', runReporteiSyncWorkerOnce, 6500, 300_000, 60_000);
  // Performance alerts — runs every Monday, detects drops/spikes vs previous period
  startWorkerLoop('performanceAlerts', runPerformanceAlertWorkerOnce, 7000, 120_000, 60_000);
  // Client Health Score — runs every Monday, computes 0-100 health per client
  startWorkerLoop('clientHealth', runClientHealthWorkerOnce, 7500, 120_000, 60_000);
  // Monthly Reports — generates PDFs on day 1 of each month (self-throttled)
  startWorkerLoop('monthlyReports', runMonthlyReportsWorkerOnce, 9000, 300_000, 60_000);
  // Meta Ads daily sync — pulls IG post metrics → format_performance_metrics (max 8 clients/tick)
  startWorkerLoop('metaSync', runMetaSyncWorkerOnce, 9500, 120_000, 60_000);
  // Client Posts — fetches client's own Instagram + Facebook posts (every 12h)
  startWorkerLoop('clientPosts', runClientPostsWorkerOnce, 10000, 120_000, 60_000);
  // Copy ROI scores — Fogg quality × Meta CTR × ROAS × AI cost (max 5 clients/tick)
  startWorkerLoop('copyRoi', runCopyRoiWorkerOnce, 10500, 120_000, 60_000);
  // AI Account Manager — proactive churn/upsell alerts per client (max 5 clients/tick)
  startWorkerLoop('accountManager', runAccountManagerWorkerOnce, 10500, 120_000, 60_000);
  // Recall meet-bot scheduler/finalizer for Google Calendar auto-join meetings
  startWorkerLoop('meetBot', runMeetBotWorkerOnce, 11000, 120_000, 60_000);
  // Gmail + Calendar watch auto-renewal — runs 1×/day, prevents silent expiry after 6-7 days
  startWorkerLoop('watchRenew', runWatchRenewWorkerOnce, 11500, 60_000, 60_000);
  // WhatsApp group intelligence — extracts insights from unprocessed messages (max 5 clients/tick)
  startWorkerLoop('groupIntelligence', runGroupIntelligenceWorkerOnce, 12000, 120_000, 60_000);
  // WhatsApp group digests — daily at 08:00 BRT, weekly on Mondays
  startWorkerLoop('groupDigest', runGroupDigestWorkerOnce, 12500, 120_000, 60_000);
  // WhatsApp deadline alerts — self-throttled to 09:00, 14:00, 18:00 BRT
  startWorkerLoop('groupDeadlineAlert', runGroupDeadlineAlertWorkerOnce, 13000, 60_000, 60_000);
  // One-shot admin backfills for persistent WhatsApp client memory
  startWorkerLoop('whatsappMemoryBackfill', runWhatsAppMemoryBackfillWorkerOnce, 14500, 600_000, 60_000);
  // Ops daily digest — email às 09h com resumo de demandas críticas
  startWorkerLoop('opsDigest', runOpsDigestWorkerOnce, 15500, 60_000, 60_000);
  // Simulation Outcome Matcher — runs at 03h BRT, links predictions to real metrics
  startWorkerLoop('simulationOutcomeMatcher', runSimulationOutcomeMatcherOnce, 16000, 120_000, 60_000);
  // Auto-Briefing from Opportunities — runs at 07h BRT
  startWorkerLoop('autoBriefing', runAutoBriefingFromOpportunityOnce, 16500, 180_000, 60_000);
  // Content Fatigue Monitor — 1x/hour, detects >25% engagement drops
  startWorkerLoop('contentFatigue', runContentFatigueMonitorOnce, 17000, 120_000, 60_000);
  // Weekly Digest — every Monday 08h BRT, sends intelligence summary email
  startWorkerLoop('weeklyDigest', runWeeklyDigestOnce, 18000, 120_000, 60_000);
  // Competitor Intelligence — daily at 02h BRT
  startWorkerLoop('competitorIntelligence', runCompetitorIntelligenceWorkerOnce, 18500, 300_000, 60_000);
  // Opportunity Detector — daily at 06h BRT, scans all sources for all clients
  startWorkerLoop('opportunityDetector', runOpportunityDetectorWorkerOnce, 19000, 600_000, 60_000);
  // Trello Sync — every 30min, keeps Edro boards in sync with Trello
  startWorkerLoop('trelloSync', runTrelloSyncWorkerOnce, 19500, 300_000, 60_000);
  // Jarvis Alert Engine — 2x/day, cross-source alerts
  startWorkerLoop('jarvisAlerts', runJarvisAlertWorkerOnce, 20000, 120_000, 60_000);
  // Art Direction Reference Discovery — opt-in, searches curated web references every 6h
  startWorkerLoop('artDirectionReference', runArtDirectionReferenceWorkerOnce, 20500, 180_000, 60_000);
  // Art Direction Trend Memory — opt-in, analyzes discovered references and consolidates daily
  startWorkerLoop('artDirectionTrend', runArtDirectionTrendWorkerOnce, 21000, 300_000, 60_000);
  startWorkerLoop('agencyDigest', runAgencyDigestWorkerOnce, 22000, 60_000, 60_000);
  // Jarvis Creation Worker — 1x/day at ~09h, closes the production loop (alert → briefing → copy → arte → handoff)
  startWorkerLoop('jarvisCreation', runJarvisCreationWorkerOnce, 23000, 120_000, 60_000);
}
