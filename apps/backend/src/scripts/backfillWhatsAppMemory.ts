import { pool, query } from '../db';
import { backfillWhatsAppClientMemory } from '../services/whatsappClientMemoryService';

function parseArg(flag: string) {
  const prefix = `${flag}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

async function resolveTenantId(explicitTenantId: string | null) {
  if (explicitTenantId) return explicitTenantId;

  const { rows } = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id
       FROM clients
      WHERE tenant_id IS NOT NULL
      ORDER BY tenant_id ASC`
  );

  if (rows.length === 1) return rows[0].tenant_id;

  const discovered = rows.map((row) => row.tenant_id);
  throw new Error(
    discovered.length
      ? `multiple_tenants_detected: ${discovered.join(', ')}. Use --tenant=<id>.`
      : 'no_tenants_found'
  );
}

async function main() {
  const tenantId = await resolveTenantId(parseArg('--tenant'));
  const clientId = parseArg('--client');

  const stats = await backfillWhatsAppClientMemory({
    tenantId,
    clientId,
  });

  console.log(JSON.stringify({ tenantId, clientId, stats }, null, 2));
}

main()
  .catch((error) => {
    console.error('[backfillWhatsAppMemory] failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
