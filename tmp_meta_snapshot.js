const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await client.connect();
  const q = `
    WITH conn AS (
      SELECT c.tenant_id, c.client_id, c.provider, c.payload, c.created_at, cl.name AS client_name
      FROM connectors c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.provider IN ('meta','whatsapp','meta_ads')
    ),
    ig_dm AS (
      SELECT client_id, COUNT(*)::int AS count FROM instagram_messages GROUP BY client_id
    )
    SELECT
      conn.provider,
      conn.client_id,
      COALESCE(conn.client_name, '(sem nome)') AS client_name,
      conn.payload->>'page_id' AS page_id,
      conn.payload->>'page_name' AS page_name,
      conn.payload->>'instagram_business_id' AS instagram_business_id,
      conn.payload->>'instagram_username' AS instagram_username,
      conn.payload->>'ad_account_id' AS ad_account_id,
      COALESCE(ig_dm.count, 0) AS instagram_dm_count,
      conn.created_at
    FROM conn
    LEFT JOIN ig_dm ON ig_dm.client_id = conn.client_id
    ORDER BY conn.created_at DESC
    LIMIT 100;
  `;
  const res = await client.query(q);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch((err) => { console.error(err); process.exit(1); });
