import 'dotenv/config';
import { query, pool } from '../db';
import { syncMeetingParticipantsFromAutoJoin } from '../repos/meetingParticipantsRepo';

async function ensureRequiredTables() {
  const requiredTables = [
    'meetings',
    'calendar_auto_joins',
    'meeting_participants',
  ];

  const { rows } = await query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [requiredTables],
  );

  const existing = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !existing.has(table));
  if (missing.length) {
    throw new Error(`[backfillMeetingParticipants] banco atual sem schema carregado: ${missing.join(',')}`);
  }
}

async function countPending(label: string, sql: string) {
  const { rows } = await query<{ total: string }>(sql);
  console.log(`${label}: ${Number(rows[0]?.total ?? 0)}`);
}

async function preview() {
  console.log('Meeting participants backfill preview');
  await countPending(
    'meetings com calendar_auto_join e sem participantes',
    `SELECT COUNT(*) AS total
       FROM (
         SELECT DISTINCT caj.meeting_id
           FROM calendar_auto_joins caj
          WHERE caj.meeting_id IS NOT NULL
       ) linked
      WHERE NOT EXISTS (
        SELECT 1
          FROM meeting_participants mp
         WHERE mp.meeting_id = linked.meeting_id
      )`,
  );
  console.log('Nenhuma escrita executada. Rode com --apply para efetivar o backfill.');
}

async function applyBackfill() {
  const { rows } = await query<{
    auto_join_id: string;
    meeting_id: string;
    tenant_id: string;
    client_id: string | null;
  }>(
    `SELECT DISTINCT ON (caj.meeting_id)
        caj.id::text AS auto_join_id,
        caj.meeting_id::text AS meeting_id,
        caj.tenant_id,
        caj.client_id
       FROM calendar_auto_joins caj
      WHERE caj.meeting_id IS NOT NULL
      ORDER BY caj.meeting_id, caj.created_at DESC`,
  );

  let processed = 0;
  for (const row of rows) {
    await syncMeetingParticipantsFromAutoJoin({
      meetingId: row.meeting_id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      autoJoinId: row.auto_join_id,
    });
    processed += 1;
  }

  console.log(`meetings reconciliadas via calendar_auto_joins: ${processed}`);
  console.log('Backfill de participantes de reunião concluído.');
}

async function run() {
  const apply = process.argv.includes('--apply');
  await ensureRequiredTables();

  if (!apply) {
    await preview();
  } else {
    await applyBackfill();
  }
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
