import { query } from '../db';

// ── Types ──────────────────────────────────────────────────────────

export type IndustryBenchmark = {
  industry: string;
  platform: string;
  format: string;
  avg_engagement: number;
  avg_score: number;
  avg_approval_rate: number;
  sample_size: number;
};

export type ClientComparison = {
  client_score: number;
  industry_avg_score: number;
  percentile: number; // 0-100, higher is better
  platforms: {
    platform: string;
    client_avg: number;
    industry_avg: number;
    delta: number; // positive = above industry avg
  }[];
  top_angles: string[];
};

// ── Build Industry Benchmarks ──────────────────────────────────────

export async function buildIndustryBenchmarks(params: {
  tenant_id: string;
}): Promise<IndustryBenchmark[]> {
  // Aggregate copy scores across all clients, grouped by industry + platform + format
  const { rows } = await query<any>(
    `SELECT
       c.industry,
       eb.payload->>'platform' AS platform,
       eb.payload->>'format' AS format,
       AVG(ecv.score) AS avg_score,
       COUNT(*) AS total_copies,
       COUNT(CASE WHEN ecv.status = 'approved' THEN 1 END) AS approved_count
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     JOIN edro_clients ec ON ec.id = eb.client_id
     LEFT JOIN clients c ON LOWER(c.name) = LOWER(ec.name) AND c.tenant_id = $1
     WHERE ecv.score IS NOT NULL
       AND ecv.created_at > NOW() - INTERVAL '180 days'
       AND c.industry IS NOT NULL
     GROUP BY c.industry, platform, format
     HAVING COUNT(*) >= 3
     ORDER BY c.industry, avg_score DESC`,
    [params.tenant_id],
  );

  const benchmarks: IndustryBenchmark[] = [];

  for (const row of rows) {
    const totalCopies = Number(row.total_copies);
    const approvedCount = Number(row.approved_count);
    const bm: IndustryBenchmark = {
      industry: row.industry || 'general',
      platform: row.platform || 'multi',
      format: row.format || 'all',
      avg_engagement: 0,
      avg_score: Number(row.avg_score) || 0,
      avg_approval_rate: totalCopies > 0 ? (approvedCount / totalCopies) * 100 : 0,
      sample_size: totalCopies,
    };
    benchmarks.push(bm);

    // Upsert
    await query(
      `INSERT INTO industry_benchmarks (tenant_id, industry, platform, format, avg_score, avg_approval_rate, sample_size, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (tenant_id, industry, platform, format, period)
       DO UPDATE SET avg_score = $5, avg_approval_rate = $6, sample_size = $7, updated_at = NOW()`,
      [params.tenant_id, bm.industry, bm.platform, bm.format, bm.avg_score, bm.avg_approval_rate, bm.sample_size],
    );
  }

  return benchmarks;
}

// ── Get Benchmarks by Industry ─────────────────────────────────────

export async function getIndustryBenchmarks(params: {
  tenant_id: string;
  industry: string;
}): Promise<IndustryBenchmark[]> {
  const { rows } = await query<any>(
    `SELECT industry, platform, format, avg_engagement, avg_score, avg_approval_rate, sample_size
     FROM industry_benchmarks
     WHERE tenant_id = $1 AND LOWER(industry) = LOWER($2)
     ORDER BY avg_score DESC`,
    [params.tenant_id, params.industry],
  );
  return rows.map((r: any) => ({
    industry: r.industry,
    platform: r.platform,
    format: r.format,
    avg_engagement: Number(r.avg_engagement),
    avg_score: Number(r.avg_score),
    avg_approval_rate: Number(r.avg_approval_rate),
    sample_size: Number(r.sample_size),
  }));
}

// ── Compare Client vs Industry ─────────────────────────────────────

export async function compareClientToIndustry(params: {
  tenant_id: string;
  client_id: string;
}): Promise<ClientComparison | null> {
  // Get client's industry
  const { rows: clientRows } = await query<any>(
    `SELECT name, industry FROM clients WHERE id = $1 AND tenant_id = $2`,
    [params.client_id, params.tenant_id],
  );
  const client = clientRows[0];
  if (!client?.industry) return null;

  // Get client's own scores by platform
  const { rows: clientScores } = await query<any>(
    `SELECT
       eb.payload->>'platform' AS platform,
       AVG(ecv.score) AS avg_score,
       COUNT(*) AS total
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     JOIN edro_clients ec ON ec.id = eb.client_id
     WHERE LOWER(ec.name) = LOWER($1)
       AND ecv.score IS NOT NULL
       AND ecv.created_at > NOW() - INTERVAL '180 days'
     GROUP BY platform`,
    [client.name],
  );

  // Get industry benchmarks
  const industryBenchmarks = await getIndustryBenchmarks({
    tenant_id: params.tenant_id,
    industry: client.industry,
  });

  // Build platform comparison
  const platforms = clientScores.map((cs: any) => {
    const industryAvg = industryBenchmarks
      .filter((b) => b.platform === cs.platform)
      .reduce((sum, b) => sum + b.avg_score, 0) / Math.max(industryBenchmarks.filter((b) => b.platform === cs.platform).length, 1);

    return {
      platform: cs.platform || 'multi',
      client_avg: Number(cs.avg_score) || 0,
      industry_avg: industryAvg,
      delta: (Number(cs.avg_score) || 0) - industryAvg,
    };
  });

  // Calculate overall client score
  const clientOverall = clientScores.reduce((s: number, r: any) => s + Number(r.avg_score), 0) / Math.max(clientScores.length, 1);
  const industryOverall = industryBenchmarks.reduce((s, b) => s + b.avg_score, 0) / Math.max(industryBenchmarks.length, 1);

  // Estimate percentile (simplified: based on delta from industry avg)
  const percentile = Math.min(100, Math.max(0, 50 + (clientOverall - industryOverall) * 20));

  // Get top performing angles for this client
  const { rows: angleRows } = await query<any>(
    `SELECT ecv.output
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     JOIN edro_clients ec ON ec.id = eb.client_id
     WHERE LOWER(ec.name) = LOWER($1)
       AND ecv.score >= 4
       AND ecv.created_at > NOW() - INTERVAL '180 days'
     ORDER BY ecv.score DESC
     LIMIT 5`,
    [client.name],
  );
  const topAngles = angleRows.map((r: any) => r.output.slice(0, 60).trim());

  return {
    client_score: Math.round(clientOverall * 100) / 100,
    industry_avg_score: Math.round(industryOverall * 100) / 100,
    percentile: Math.round(percentile),
    platforms,
    top_angles: topAngles,
  };
}
