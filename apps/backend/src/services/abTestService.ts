import { query } from '../db';
import { rebuildClientPreferences } from './learningLoopService';

// ── Types ──────────────────────────────────────────────────────────

export type ABTest = {
  id: string;
  briefing_id: string;
  variant_a_id: string;
  variant_b_id: string;
  winner_id: string | null;
  metric: string;
  status: string;
  started_at: string;
  ended_at: string | null;
};

export type ABResult = {
  id: string;
  test_id: string;
  variant_id: string;
  impressions: number;
  clicks: number;
  engagement: number;
  conversions: number;
  score: number | null;
  recorded_at: string;
};

// ── Service ────────────────────────────────────────────────────────

export async function createABTest(params: {
  briefing_id: string;
  variant_a_id: string;
  variant_b_id: string;
  metric?: string;
}): Promise<ABTest> {
  const { rows } = await query<ABTest>(
    `INSERT INTO copy_ab_tests (briefing_id, variant_a_id, variant_b_id, metric)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.briefing_id, params.variant_a_id, params.variant_b_id, params.metric || 'engagement'],
  );
  return rows[0];
}

export async function listABTests(briefingId: string): Promise<ABTest[]> {
  const { rows } = await query<ABTest>(
    `SELECT * FROM copy_ab_tests
     WHERE briefing_id = $1
     ORDER BY created_at DESC`,
    [briefingId],
  );
  return rows;
}

export async function getABTest(testId: string): Promise<ABTest | null> {
  const { rows } = await query<ABTest>(
    `SELECT * FROM copy_ab_tests WHERE id = $1`,
    [testId],
  );
  return rows[0] || null;
}

export async function recordABResult(params: {
  test_id: string;
  variant_id: string;
  impressions?: number;
  clicks?: number;
  engagement?: number;
  conversions?: number;
  score?: number;
}): Promise<ABResult> {
  const { rows } = await query<ABResult>(
    `INSERT INTO copy_ab_results (test_id, variant_id, impressions, clicks, engagement, conversions, score)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      params.test_id,
      params.variant_id,
      params.impressions ?? 0,
      params.clicks ?? 0,
      params.engagement ?? 0,
      params.conversions ?? 0,
      params.score ?? null,
    ],
  );
  return rows[0];
}

export async function getABResults(testId: string): Promise<ABResult[]> {
  const { rows } = await query<ABResult>(
    `SELECT * FROM copy_ab_results
     WHERE test_id = $1
     ORDER BY recorded_at DESC`,
    [testId],
  );
  return rows;
}

export async function declareWinner(params: {
  test_id: string;
  tenant_id?: string;
}): Promise<ABTest> {
  const test = await getABTest(params.test_id);
  if (!test) throw new Error('Test not found');
  if (test.status !== 'running') throw new Error('Test is not running');

  // Aggregate results per variant
  const { rows: aggregated } = await query<any>(
    `SELECT variant_id,
            SUM(impressions) AS total_impressions,
            SUM(clicks) AS total_clicks,
            SUM(engagement) AS total_engagement,
            SUM(conversions) AS total_conversions,
            AVG(score) AS avg_score,
            COUNT(*) AS result_count
     FROM copy_ab_results
     WHERE test_id = $1
     GROUP BY variant_id`,
    [params.test_id],
  );

  if (aggregated.length < 2) throw new Error('Need results for both variants');

  // Determine winner based on configured metric
  const metricKey = test.metric === 'score' ? 'avg_score'
    : test.metric === 'clicks' ? 'total_clicks'
    : test.metric === 'conversions' ? 'total_conversions'
    : 'total_engagement';

  const sorted = aggregated.sort(
    (a: any, b: any) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0),
  );
  const winnerId = sorted[0].variant_id;

  const { rows } = await query<ABTest>(
    `UPDATE copy_ab_tests
     SET winner_id = $2, status = 'completed', ended_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [params.test_id, winnerId],
  );

  // Feed winner into learning loop (fire-and-forget)
  if (params.tenant_id && test.briefing_id) {
    const { rows: briefingRows } = await query<any>(
      `SELECT client_id FROM edro_briefings WHERE id = $1`,
      [test.briefing_id],
    );
    const clientId = briefingRows[0]?.client_id;
    if (clientId) {
      // Boost winner's score in copy_versions
      await query(
        `UPDATE edro_copy_versions SET score = GREATEST(score, 4) WHERE id = $1`,
        [winnerId],
      );
      rebuildClientPreferences({ tenant_id: params.tenant_id, client_id: clientId }).catch(() => {});
    }
  }

  return rows[0];
}

export async function cancelABTest(testId: string): Promise<ABTest> {
  const { rows } = await query<ABTest>(
    `UPDATE copy_ab_tests
     SET status = 'cancelled', ended_at = NOW()
     WHERE id = $1 AND status = 'running'
     RETURNING *`,
    [testId],
  );
  if (!rows[0]) throw new Error('Test not found or not running');
  return rows[0];
}
