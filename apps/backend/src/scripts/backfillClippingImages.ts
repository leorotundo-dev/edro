import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';

function getArg(name: string, fallback: number) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const num = Number(arg.split('=')[1]);
  return Number.isFinite(num) ? num : fallback;
}

async function main() {
  const limit = Math.min(getArg('limit', 200), 1000);
  const days = Math.min(getArg('days', 30), 365);

  const { rows } = await query<any>(
    `
    SELECT id, tenant_id
    FROM clipping_items
    WHERE image_url IS NULL
      AND url IS NOT NULL
      AND created_at >= NOW() - ($1 || ' days')::interval
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [String(days), limit]
  );

  let enqueued = 0;
  for (const item of rows) {
    await enqueueJob(item.tenant_id, 'clipping_enrich_item', { item_id: item.id });
    enqueued += 1;
  }

  console.log(`Enqueued ${enqueued} clipping_enrich_item jobs.`);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
