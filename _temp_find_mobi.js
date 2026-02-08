const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query(
    "SELECT id, name FROM clients WHERE LOWER(id) LIKE 'cs-mobi%' OR LOWER(name) LIKE '%mobi%' ORDER BY name"
  );
  console.log(rows);
  await db.end();
})();
