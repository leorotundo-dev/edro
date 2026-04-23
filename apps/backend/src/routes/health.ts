import { FastifyInstance } from 'fastify';
import { pool } from '../db';
import { env } from '../env';
import { getAllWorkers, getStaleWorkers } from '../jobs/workerRegistry';

// ── Shallow healthcheck — used by Railway container healthcheck (Path: /) ────
// Must stay fast and always return 200 while the process is alive.

// ── Deep readiness — ops visibility without exposing tenant data ──────────────
// Returns 503 + {status:'not_ready'} only if DB is unreachable.
// All other degraded checks return 200 with ok:false in that check so ops can
// see what's wrong without Railway restarting a healthy container.

type Check = { ok: boolean; detail?: string; latency_ms?: number };

async function dbPing(): Promise<Check> {
  const t0 = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency_ms: Date.now() - t0 };
  } catch (err: any) {
    return { ok: false, detail: err?.message ?? 'unknown', latency_ms: Date.now() - t0 };
  }
}

async function gmailWatchCheck(): Promise<Check> {
  try {
    const { rows } = await pool.query<{ expired: string; expiring_soon: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE watch_expiry <= NOW())::text         AS expired,
         COUNT(*) FILTER (
           WHERE watch_expiry > NOW()
             AND watch_expiry < NOW() + INTERVAL '48 hours'
         )::text AS expiring_soon
       FROM gmail_connections
       WHERE watch_expiry IS NOT NULL`,
    );
    const { expired, expiring_soon } = rows[0] ?? { expired: '0', expiring_soon: '0' };
    return {
      ok: parseInt(expired, 10) === 0,
      detail: `expired=${expired} expiring_soon=${expiring_soon}`,
    };
  } catch {
    return { ok: true, detail: 'skip (table unavailable)' };
  }
}

async function calendarWatchCheck(): Promise<Check> {
  try {
    const { rows } = await pool.query<{ expired: string; expiring_soon: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE expires_at <= NOW())::text          AS expired,
         COUNT(*) FILTER (
           WHERE expires_at > NOW()
             AND expires_at < NOW() + INTERVAL '48 hours'
         )::text AS expiring_soon
       FROM google_calendar_channels
       WHERE expires_at IS NOT NULL`,
    );
    const { expired, expiring_soon } = rows[0] ?? { expired: '0', expiring_soon: '0' };
    return {
      ok: parseInt(expired, 10) === 0,
      detail: `expired=${expired} expiring_soon=${expiring_soon}`,
    };
  } catch {
    return { ok: true, detail: 'skip (table unavailable)' };
  }
}

async function evolutionPing(apiUrl: string, apiKey: string | undefined): Promise<Check> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/instance/fetchInstances`, {
      method: 'GET',
      headers: { apikey: apiKey ?? '' },
      signal: AbortSignal.timeout(3000),
    });
    return {
      ok: res.status < 500,
      detail: `http=${res.status}`,
      latency_ms: Date.now() - t0,
    };
  } catch (err: any) {
    return {
      ok: false,
      detail: err?.message ?? 'timeout',
      latency_ms: Date.now() - t0,
    };
  }
}

async function trelloOutboxCheck(): Promise<Check> {
  try {
    const { rows } = await pool.query<{ pending: string; dead: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending','error'))::text AS pending,
         COUNT(*) FILTER (WHERE status = 'dead')::text               AS dead
       FROM trello_outbox`,
    );
    const { pending, dead } = rows[0] ?? { pending: '0', dead: '0' };
    return {
      ok: parseInt(dead, 10) === 0,
      detail: `pending=${pending} dead=${dead}`,
    };
  } catch {
    return { ok: true, detail: 'skip (table unavailable)' };
  }
}

export default async function healthRoutes(app: FastifyInstance) {
  // ── Shallow — Railway healthcheck target ────────────────────────────────────
  app.get('/', async () => ({ status: 'ok' }));
  app.get('/health', async () => ({ status: 'ok' }));

  // ── Deep readiness ───────────────────────────────────────────────────────────
  app.get('/health/ready', async (_req, reply) => {
    const checks: Record<string, Check> = {};

    // 1. DB — only check that can flip to 503
    checks.db = await dbPing();
    const dbOk = checks.db.ok;

    // 2. Pool pressure
    checks.db_pool = {
      ok: pool.waitingCount === 0,
      detail: `total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`,
    };

    // Run remaining checks in parallel — none of them affect HTTP status
    const [
      gmailCheck,
      calendarCheck,
      outboxCheck,
      evolutionCheck,
    ] = await Promise.all([
      env.GOOGLE_CLIENT_ID ? gmailWatchCheck()    : Promise.resolve<Check | null>(null),
      env.GOOGLE_CLIENT_ID ? calendarWatchCheck() : Promise.resolve<Check | null>(null),
      trelloOutboxCheck(),
      env.EVOLUTION_API_URL ? evolutionPing(env.EVOLUTION_API_URL, env.EVOLUTION_API_KEY) : Promise.resolve<Check | null>(null),
    ]);

    if (gmailCheck)    checks.gmail_watch    = gmailCheck;
    if (calendarCheck) checks.calendar_watch = calendarCheck;
                       checks.trello_outbox  = outboxCheck;
    if (evolutionCheck) checks.evolution     = evolutionCheck;

    // S3/storage — config presence only (no live ping, avoids latency)
    if (env.S3_BUCKET) {
      checks.storage = {
        ok: Boolean(env.S3_ACCESS_KEY && env.S3_SECRET_KEY),
        detail: `bucket=${env.S3_BUCKET} region=${env.S3_REGION ?? 'default'}`,
      };
    }

    // Worker registry summary — stale = no tick in the last 10 min for 5s workers,
    // or no tick in the last 5 min for workers that should have run by now.
    // We use a generous 10-minute window so slow workers don't false-alarm.
    const allWorkers = getAllWorkers();
    const staleWorkers = getStaleWorkers(10 * 60 * 1000);        // >10 min since last tick
    const neverRan    = allWorkers.filter((w) => w.last_run_at === null);
    const errorWorkers = allWorkers.filter((w) => w.last_error_at !== null && w.last_run_at !== null &&
      w.last_error_at === w.last_run_at);  // last tick was an error

    if (allWorkers.length > 0) {
      checks.workers = {
        ok: staleWorkers.length === 0 && errorWorkers.length === 0,
        detail: [
          `total=${allWorkers.length}`,
          `pending=${neverRan.length}`,
          staleWorkers.length ? `stale=${staleWorkers.map((w) => w.name).join(',')}` : null,
          errorWorkers.length ? `erroring=${errorWorkers.map((w) => w.name).join(',')}` : null,
        ].filter(Boolean).join(' '),
      };
    }

    const statusCode = dbOk ? 200 : 503;

    return reply.code(statusCode).send({
      status: dbOk ? (Object.values(checks).every((c) => c.ok) ? 'ready' : 'degraded') : 'not_ready',
      degraded: Object.keys(checks).filter((k) => !checks[k].ok),
      checks,
      uptime_s: Math.floor(process.uptime()),
      node_version: process.version,
      ts: new Date().toISOString(),
    });
  });

  // ── Full worker list — ops visibility ────────────────────────────────────────
  // Unauthenticated intentionally — no tenant data, just process state.
  app.get('/health/workers', async (_req, reply) => {
    const all = getAllWorkers();
    const now = Date.now();

    const enriched = all.map((w) => {
      const lastRunMs = w.last_run_at ? new Date(w.last_run_at).getTime() : null;
      const idleSec   = lastRunMs !== null ? Math.floor((now - lastRunMs) / 1000) : null;
      const lastErrMs = w.last_error_at ? new Date(w.last_error_at).getTime() : null;
      const status =
        w.last_run_at === null                            ? 'pending'
        : lastErrMs !== null && lastErrMs === lastRunMs   ? 'error'
        : idleSec !== null && idleSec > 600              ? 'stale'
        : 'ok';

      return { ...w, idle_sec: idleSec, status };
    });

    const summary = {
      total:   enriched.length,
      ok:      enriched.filter((w) => w.status === 'ok').length,
      pending: enriched.filter((w) => w.status === 'pending').length,
      stale:   enriched.filter((w) => w.status === 'stale').length,
      error:   enriched.filter((w) => w.status === 'error').length,
    };

    return reply.send({
      summary,
      workers: enriched,
      uptime_s: Math.floor(process.uptime()),
      ts: new Date().toISOString(),
    });
  });
}
