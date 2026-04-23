import { FastifyInstance } from 'fastify';
import { pool } from '../db';
import { env } from '../env';

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

    const degraded = Object.values(checks).filter((c) => !c.ok).map((_, i) => Object.keys(checks)[i]);
    const statusCode = dbOk ? 200 : 503;

    return reply.code(statusCode).send({
      status: dbOk ? (degraded.length === 0 ? 'ready' : 'degraded') : 'not_ready',
      degraded: Object.keys(checks).filter((k) => !checks[k].ok),
      checks,
      uptime_s: Math.floor(process.uptime()),
      node_version: process.version,
      ts: new Date().toISOString(),
    });
  });
}
