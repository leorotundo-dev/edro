/**
 * calibrationService — learns from actual_minutes to improve future estimates.
 *
 * Queries completed jobs (status=done, actual_minutes IS NOT NULL) from the
 * last 90 days and computes the median actual duration per (job_type, complexity).
 * Returns calibrated estimates + a confidence measure based on sample size.
 *
 * The calibrated base replaces the static ESTIMATE_MATRIX when enough data exists
 * (minimum 3 samples). Below that threshold, it falls back to the static matrix.
 */

import { query } from '../../db';

export interface CalibrationEntry {
  jobType: string;
  complexity: string;
  sampleCount: number;
  medianMinutes: number;
  p25Minutes: number;
  p75Minutes: number;
  staticMinutes: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  /** positive = jobs take longer than estimated, negative = shorter */
  driftPercent: number;
}

export interface CalibrationReport {
  tenantId: string;
  generatedAt: string;
  lookbackDays: number;
  entries: CalibrationEntry[];
}

// Static baseline (mirrors estimationService.ts)
const STATIC_MATRIX: Record<string, Record<string, number>> = {
  briefing:       { s: 30,  m: 60,  l: 120 },
  copy:           { s: 30,  m: 90,  l: 180 },
  design_static:  { s: 60,  m: 120, l: 240 },
  design_carousel:{ s: 120, m: 240, l: 360 },
  video_edit:     { s: 120, m: 360, l: 720 },
  campaign:       { s: 180, m: 480, l: 960 },
  meeting:        { s: 30,  m: 60,  l: 120 },
  approval:       { s: 15,  m: 30,  l: 60  },
  publication:    { s: 15,  m: 30,  l: 60  },
  urgent_request: { s: 60,  m: 180, l: 360 },
};

function confidenceLevel(n: number): CalibrationEntry['confidence'] {
  if (n >= 20) return 'high';
  if (n >= 8)  return 'medium';
  if (n >= 3)  return 'low';
  return 'none';
}

/** Compute median of sorted array. */
function median(sorted: number[]): number {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

export async function generateCalibrationReport(
  tenantId: string,
  lookbackDays = 90,
): Promise<CalibrationReport> {
  const { rows } = await query<{
    job_type: string;
    complexity: string;
    actual_minutes: number;
  }>(
    `SELECT job_type, complexity, actual_minutes
       FROM jobs
      WHERE tenant_id = $1
        AND status = 'done'
        AND actual_minutes IS NOT NULL
        AND actual_minutes > 0
        AND actual_minutes < 2880   -- cap at 48h to exclude outliers
        AND completed_at > now() - ($2::int * interval '1 day')
      ORDER BY job_type, complexity, actual_minutes`,
    [tenantId, lookbackDays],
  );

  // Group by (job_type, complexity)
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = `${row.job_type}::${row.complexity}`;
    const arr = groups.get(key) ?? [];
    arr.push(Number(row.actual_minutes));
    groups.set(key, arr);
  }

  const entries: CalibrationEntry[] = [];
  for (const [key, vals] of groups) {
    const [jobType, complexity] = key.split('::');
    const sorted = [...vals].sort((a, b) => a - b);
    const staticMinutes = STATIC_MATRIX[jobType]?.[complexity] ?? 120;
    const medianMinutes = median(sorted);
    const p25 = percentile(sorted, 25);
    const p75 = percentile(sorted, 75);
    const drift = staticMinutes > 0
      ? Math.round(((medianMinutes - staticMinutes) / staticMinutes) * 100)
      : 0;

    entries.push({
      jobType,
      complexity,
      sampleCount: sorted.length,
      medianMinutes,
      p25Minutes: p25,
      p75Minutes: p75,
      staticMinutes,
      confidence: confidenceLevel(sorted.length),
      driftPercent: drift,
    });
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    lookbackDays,
    entries: entries.sort((a, b) =>
      a.jobType.localeCompare(b.jobType) || a.complexity.localeCompare(b.complexity),
    ),
  };
}

/**
 * Returns a calibrated estimate for a specific (jobType, complexity), or null
 * if there is insufficient history (< 3 samples).
 */
export async function getCalibratedEstimate(
  tenantId: string,
  jobType: string,
  complexity: string,
): Promise<{ minutes: number; confidence: CalibrationEntry['confidence']; sampleCount: number } | null> {
  const { rows } = await query<{ actual_minutes: number; cnt: string }>(
    `SELECT actual_minutes,
            COUNT(*) OVER () AS cnt
       FROM jobs
      WHERE tenant_id = $1
        AND job_type = $2
        AND complexity = $3
        AND status = 'done'
        AND actual_minutes IS NOT NULL
        AND actual_minutes > 0
        AND actual_minutes < 2880
        AND completed_at > now() - interval '90 days'
      ORDER BY actual_minutes`,
    [tenantId, jobType, complexity],
  );

  const n = rows.length;
  if (n < 3) return null;

  const sorted = rows.map((r) => Number(r.actual_minutes));
  return {
    minutes: median(sorted),
    confidence: confidenceLevel(n),
    sampleCount: n,
  };
}
