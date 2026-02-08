const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query(
    "SELECT id, name FROM clients WHERE LOWER(name) LIKE '%cuiaba%' OR LOWER(name) LIKE '%cuia%' OR LOWER(id) LIKE '%cuiaba%' ORDER BY name"
  );
  console.log(rows);
  await db.end();
})();
