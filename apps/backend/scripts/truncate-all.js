// Trunca tabelas de harvest e editais
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query('TRUNCATE harvested_content, harvest_sources CASCADE;');
  await client.query('TRUNCATE edital_eventos, edital_questoes, edital_usuarios, editais CASCADE;');
  await client.end();
  console.log('truncate ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
