/**
 * workerRegistry.ts
 *
 * In-memory registry — updated by startWorkerLoop on every tick.
 * Zero DB, zero migrations. Lives and dies with the process.
 *
 * Exposed via GET /health/workers (no auth, no tenant data).
 */

export type WorkerEntry = {
  name: string;
  /** null until first tick completes */
  last_run_at: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  last_error_at: string | null;
  run_count: number;
  error_count: number;
  /** ticks that exceeded the warn threshold */
  slow_count: number;
  registered_at: string;
};

const _registry = new Map<string, WorkerEntry>();

export function registerWorker(name: string): void {
  if (!_registry.has(name)) {
    _registry.set(name, {
      name,
      last_run_at: null,
      last_duration_ms: null,
      last_error: null,
      last_error_at: null,
      run_count: 0,
      error_count: 0,
      slow_count: 0,
      registered_at: new Date().toISOString(),
    });
  }
}

export function recordSuccess(name: string, durationMs: number, slow: boolean): void {
  const e = _registry.get(name);
  if (!e) return;
  e.last_run_at = new Date().toISOString();
  e.last_duration_ms = durationMs;
  e.run_count += 1;
  if (slow) e.slow_count += 1;
}

export function recordError(name: string, durationMs: number, error: unknown): void {
  const e = _registry.get(name);
  if (!e) return;
  const msg = (error as any)?.message ?? String(error);
  e.last_run_at = new Date().toISOString();
  e.last_duration_ms = durationMs;
  e.last_error = msg;
  e.last_error_at = new Date().toISOString();
  e.run_count += 1;
  e.error_count += 1;
}

export function getAllWorkers(): WorkerEntry[] {
  return Array.from(_registry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Workers that haven't completed a single tick yet */
export function getPendingWorkers(): WorkerEntry[] {
  return getAllWorkers().filter((e) => e.last_run_at === null);
}

/** Workers whose last successful tick was more than `thresholdMs` ago */
export function getStaleWorkers(thresholdMs: number): WorkerEntry[] {
  const cutoff = Date.now() - thresholdMs;
  return getAllWorkers().filter((e) => {
    if (!e.last_run_at) return false;               // pending, not stale
    return new Date(e.last_run_at).getTime() < cutoff;
  });
}
