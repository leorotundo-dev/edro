const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const clientId = 'cs-mobi-cuiaba';
  const { rows: clients } = await db.query('SELECT tenant_id FROM clients WHERE id=$1 LIMIT 1', [clientId]);
  if (!clients[0]) throw new Error('client not found');
  const tenantId = clients[0].tenant_id;
  const payload = { reportei_account_id: '598678', base_url: 'https://connect.reportei.com/api' };
  await db.query(
    `INSERT INTO connectors (tenant_id, client_id, provider, payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (tenant_id, client_id, provider)
     DO UPDATE SET payload=EXCLUDED.payload, updated_at=now()`,
    [tenantId, clientId, 'reportei', JSON.stringify(payload)]
  );
  console.log('Reportei connector saved for cs-mobi-cuiaba');
  await db.end();
})();
