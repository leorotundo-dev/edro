const { Client } = require('pg');

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const id = 'cs-mobi-cuiaba';
  const name = 'CS Mobi Cuiabá';

  const { rows: tenantRows } = await db.query(
    "SELECT tenant_id FROM clients WHERE id='cs-mobi-leste-sp' LIMIT 1"
  );
  if (!tenantRows[0]?.tenant_id) {
    throw new Error('tenant_id not found from cs-mobi-leste-sp');
  }
  const tenantId = tenantRows[0].tenant_id;

  await db.query(
    `INSERT INTO clients (id, name, segment_primary, country, uf, city, reportei_account_id, tenant_id, profile)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT (id) DO UPDATE
     SET name=EXCLUDED.name,
         segment_primary=EXCLUDED.segment_primary,
         country=EXCLUDED.country,
         uf=EXCLUDED.uf,
         city=EXCLUDED.city,
         reportei_account_id=EXCLUDED.reportei_account_id,
         tenant_id=EXCLUDED.tenant_id,
         profile=EXCLUDED.profile,
         updated_at=NOW()`,
    [
      id,
      name,
      'mobilidade_urbana',
      'BR',
      'MT',
      'Cuiabá',
      '598678',
      tenantId,
      JSON.stringify({
        segment_secondary: ['mobilidade_urbana', 'transporte'],
        calendar_profile: {
          enable_calendar_total: true,
          calendar_weight: 60,
          retail_mode: false,
          allow_cultural_opportunities: true,
          allow_geek_pop: true,
          allow_profession_days: true,
          restrict_sensitive_causes: false,
        },
        trend_profile: {
          enable_trends: false,
          trend_weight: 40,
          sources: [],
        },
      }),
    ]
  );

  console.log('CS Mobi Cuiabá created/updated.');
  await db.end();
})();
