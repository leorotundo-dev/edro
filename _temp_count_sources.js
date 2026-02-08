const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query(
    "SELECT COUNT(*)::int AS count FROM clipping_sources WHERE client_id='cs-mobi-cuiaba'"
  );
  console.log(rows);
  await db.end();
})();
