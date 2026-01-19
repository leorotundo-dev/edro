const { Client } = require('pg');

const editalId = process.env.EDITAL_ID || process.argv[2];

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL.');
  process.exit(1);
}

if (!editalId) {
  console.error('Missing EDITAL_ID (env or arg).');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const drops = await client.query(
      "SELECT COUNT(1)::int AS count FROM drops WHERE origin_meta->>'edital_id' = $1",
      [editalId]
    );
    const published = await client.query(
      "SELECT COUNT(1)::int AS count FROM drops WHERE origin_meta->>'edital_id' = $1 AND status = 'published'",
      [editalId]
    );
    const drafts = await client.query(
      "SELECT COUNT(1)::int AS count FROM drops WHERE origin_meta->>'edital_id' = $1 AND status = 'draft'",
      [editalId]
    );
    const questions = await client.query(
      'SELECT COUNT(1)::int AS count FROM edital_questoes WHERE edital_id = $1',
      [editalId]
    );
    const autoFormacoes = await client.query(
      'SELECT COUNT(1)::int AS count FROM edital_auto_formacoes WHERE edital_id = $1',
      [editalId]
    );

    console.log(
      JSON.stringify(
        {
          editalId,
          drops: drops.rows[0].count,
          published: published.rows[0].count,
          drafts: drafts.rows[0].count,
          questoes: questions.rows[0].count,
          auto_formacoes: autoFormacoes.rows[0].count,
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
