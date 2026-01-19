const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';

const { Pool } = require('pg');

const jobId = Number.parseInt(process.env.JOB_ID || '88', 10);

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  console.log(JSON.stringify(rows[0] || null, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
