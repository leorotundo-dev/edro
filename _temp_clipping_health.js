const { Client } = require('pg');

const clientId = process.argv[2] || 'cs-infra-holding';

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows: clientRows } = await db.query(
    'SELECT id, tenant_id, name FROM clients WHERE id=$1 LIMIT 1',
    [clientId]
  );
  const client = clientRows[0];
  if (!client) {
    console.error('Client not found:', clientId);
    process.exitCode = 2;
    await db.end();
    return;
  }
  const tenantId = client.tenant_id;

  const [items, lastItem, jobStats, pendingJobs, fetchAges, failedFetch, sourcesByHealth, dueSources, pendingFetchPerSource] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int AS last_1h,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
         MAX(created_at) AS last_item_at
       FROM clipping_items WHERE tenant_id=$1`,
      [tenantId]
    ),
    db.query(
      `SELECT id, created_at, score, title
       FROM clipping_items
       WHERE tenant_id=$1
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    ),
    db.query(
      `SELECT type, status, COUNT(*)::int AS count
       FROM job_queue
       WHERE tenant_id=$1 AND type LIKE 'clipping_%'
       GROUP BY type, status
       ORDER BY type, status`,
      [tenantId]
    ),
    db.query(
      `SELECT type, status, COUNT(*)::int AS count
       FROM job_queue
       WHERE tenant_id=$1 AND type LIKE 'clipping_%' AND status IN ('queued','processing')
       GROUP BY type, status
       ORDER BY type, status`,
      [tenantId]
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='processing' AND updated_at < NOW() - INTERVAL '30 minutes')::int AS fetch_processing_gt_30m,
         COUNT(*) FILTER (WHERE status='processing' AND updated_at < NOW() - INTERVAL '60 minutes')::int AS fetch_processing_gt_60m,
         COUNT(*) FILTER (WHERE status='queued')::int AS fetch_queued,
         COUNT(*) FILTER (WHERE status='processing')::int AS fetch_processing
       FROM job_queue
       WHERE tenant_id=$1 AND type='clipping_fetch_source'`,
      [tenantId]
    ),
    db.query(
      `SELECT id, error_message, updated_at, payload->>'source_id' AS source_id
       FROM job_queue
       WHERE tenant_id=$1 AND type='clipping_fetch_source' AND status='failed'
       ORDER BY updated_at DESC
       LIMIT 10`,
      [tenantId]
    ),
    db.query(
      `SELECT status AS health, COUNT(*)::int AS count
       FROM clipping_sources
       WHERE tenant_id=$1
       GROUP BY status
       ORDER BY status`,
      [tenantId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS due_sources
       FROM clipping_sources cs
       WHERE cs.tenant_id=$1
         AND cs.is_active=true
         AND (
           cs.last_fetched_at IS NULL OR
           cs.last_fetched_at + (COALESCE(cs.fetch_interval_minutes, 60)::text || ' minutes')::interval <= NOW()
         )`,
      [tenantId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS pending_fetch_sources
       FROM (
         SELECT DISTINCT jq.payload->>'source_id' AS source_id
         FROM job_queue jq
         WHERE jq.tenant_id=$1
           AND jq.type='clipping_fetch_source'
           AND jq.status IN ('queued','processing')
       ) t`,
      [tenantId]
    ),
  ]);

  const out = {
    now: new Date().toISOString(),
    client: { id: client.id, name: client.name, tenant_id: tenantId },
    items: items.rows[0],
    last_item: lastItem.rows[0] || null,
    jobs: {
      stats: jobStats.rows,
      pending: pendingJobs.rows,
      fetch_ages: fetchAges.rows[0],
      failed_fetch_recent: failedFetch.rows,
      pending_fetch_sources: pendingFetchPerSource.rows[0]?.pending_fetch_sources ?? null,
    },
    sources: {
      by_health: sourcesByHealth.rows,
      due_sources: dueSources.rows[0]?.due_sources ?? null,
    },
  };

  console.log(JSON.stringify(out, null, 2));

  await db.end();
})();
