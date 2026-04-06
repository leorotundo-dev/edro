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
import { runJarvisKbWorkerOnce } from './jarvisKbWorker';
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
  // Meta Ads daily sync — pulls IG post metrics → format_performance_metrics → LearningEngine (max 8 clients/tick)
  startWorkerLoop('metaSync', runMetaSyncWorkerOnce, 9500, 120_000);
  // Copy ROI scores — Fogg quality × Meta CTR × ROAS × AI cost (runs after metaSync, max 5 clients/tick)
  startWorkerLoop('copyRoi', runCopyRoiWorkerOnce, 10000, 120_000);
  // Jarvis KB — synthesizes learning_rules into persistent KB per client + promotes cross-client patterns (runs after reporteiSync)
  startWorkerLoop('jarvisKb', runJarvisKbWorkerOnce, 10500, 300_000);
  // AI Account Manager — proactive churn/upsell alerts per client (max 5 clients/tick)
  startWorkerLoop('accountManager', runAccountManagerWorkerOnce, 10500, 120_000);
  // Recall meet-bot scheduler/finalizer for Google Calendar auto-join meetings
  startWorkerLoop('meetBot', runMeetBotWorkerOnce, 11000, 120_000);
  // Gmail + Calendar watch auto-renewal — runs 1×/day, prevents silent expiry after 6-7 days
  startWorkerLoop('watchRenew', runWatchRenewWorkerOnce, 11500, 60_000);
  // WhatsApp group intelligence — extracts insights from unprocessed messages (max 5 clients/tick)
  startWorkerLoop('groupIntelligence', runGroupIntelligenceWorkerOnce, 12000, 120_000);
  // WhatsApp group digests — daily at 08:00 BRT, weekly on Mondays
  startWorkerLoop('groupDigest', runGroupDigestWorkerOnce, 12500, 120_000);
  // WhatsApp deadline alerts — self-throttled to 09:00, 14:00, 18:00 BRT
  startWorkerLoop('groupDeadlineAlert', runGroupDeadlineAlertWorkerOnce, 13000, 60_000);
  // Central de Operações runtime — keeps demands, agenda e riscos synchronized
  startWorkerLoop('operationsRuntime', runOperationsRuntimeWorkerOnce, 13500, 180_000);
  // Job Automation Pipeline — auto-copy, auto-image, auto-assign, ETA recalc
  startWorkerLoop('jobAutomation', runJobAutomationWorkerOnce, 14000, 120_000);
  // One-shot admin backfills for persistent WhatsApp client memory
  startWorkerLoop('whatsappMemoryBackfill', runWhatsAppMemoryBackfillWorkerOnce, 14500, 600_000);
  // WhatsApp connection health — auto-reconnect disconnected Evolution instances (every 5min)
  startWorkerLoop('whatsappHealth', runWhatsAppHealthWorkerOnce, 15000, 30_000);
  // Ops daily digest — email às 09h com resumo de demandas críticas, vencidas e sem dono
  startWorkerLoop('opsDigest', runOpsDigestWorkerOnce, 15500, 60_000);
  // Simulation Outcome Matcher — runs at 03h BRT, links simulation predictions to real metrics
  startWorkerLoop('simulationOutcomeMatcher', runSimulationOutcomeMatcherOnce, 16000, 120_000);
  // Auto-Briefing from Opportunities — runs at 07h BRT, generates ready-to-approve briefings from high-confidence opportunities
  startWorkerLoop('autoBriefing', runAutoBriefingFromOpportunityOnce, 16500, 180_000);
  // Content Fatigue Monitor — 1x/hour, detects >25% engagement drops and auto-generates substitute copy
  startWorkerLoop('contentFatigue', runContentFatigueMonitorOnce, 17000, 120_000);
  // Scheduled Publications — every 5 min, publishes LinkedIn or notifies for other platforms
  startWorkerLoop('scheduledPublications', runScheduledPublicationsOnce, 17500, 60_000);
  // Weekly Digest — every Monday 08h BRT, sends intelligence summary email to all admins
  startWorkerLoop('weeklyDigest', runWeeklyDigestOnce, 18000, 120_000);
  // Competitor Intelligence — daily at 02h BRT, auto-analyzes AMD patterns for all clients with competitors
  startWorkerLoop('competitorIntelligence', runCompetitorIntelligenceWorkerOnce, 18500, 300_000);
  // Opportunity Detector — daily at 06h BRT, scans clipping+social+calendar+Tavily+Google Trends for all clients
  startWorkerLoop('opportunityDetector', runOpportunityDetectorWorkerOnce, 19000, 600_000);
  // Trello Sync — every 30min, keeps Edro boards in sync with Trello during migration
  startWorkerLoop('trelloSync', runTrelloSyncWorkerOnce, 19500, 300_000);
  // Jarvis Alert Engine — 2x/day, cross-source alerts (stalled cards, no-reply, expiring contracts, market opportunities)
  startWorkerLoop('jarvisAlerts', runJarvisAlertWorkerOnce, 20000, 120_000);
}
