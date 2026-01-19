const crypto = require('crypto');
const { Client } = require('pg');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const editalIdArg = getArg('--edital-id');
const editalCodeArg = getArg('--edital-code');
const editalTitleArg = getArg('--edital-title');
const userEmailArg = getArg('--user-email');
const confirm = args.includes('--confirm');
const listOnly = args.includes('--list');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL.');
  process.exit(1);
}

if (!userEmailArg) {
  console.error('Missing --user-email');
  process.exit(1);
}

const makeHash = (input) => crypto.createHash('sha256').update(input).digest('hex');

const normalize = (value) => String(value || '').trim();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const userRes = await client.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [userEmailArg]
    );
    const user = userRes.rows[0];
    if (!user) {
      console.error(`User not found for email ${userEmailArg}`);
      process.exit(1);
    }

    if (listOnly) {
      const listRes = await client.query(
        `
        SELECT e.id, e.codigo, e.titulo, e.banca
        FROM editais e
        JOIN edital_usuarios eu ON eu.edital_id = e.id
        WHERE eu.user_id = $1
        ORDER BY e.updated_at DESC
        `,
        [user.id]
      );
      console.log(JSON.stringify(listRes.rows, null, 2));
      process.exit(0);
    }

    let editalRes;
    if (editalIdArg) {
      editalRes = await client.query(
        'SELECT id, codigo, titulo, banca FROM editais WHERE id = $1 LIMIT 1',
        [editalIdArg]
      );
    } else if (editalCodeArg) {
      editalRes = await client.query(
        'SELECT id, codigo, titulo, banca FROM editais WHERE codigo ILIKE $1 ORDER BY updated_at DESC LIMIT 1',
        [`%${normalize(editalCodeArg)}%`]
      );
    } else if (editalTitleArg) {
      editalRes = await client.query(
        'SELECT id, codigo, titulo, banca FROM editais WHERE titulo ILIKE $1 ORDER BY updated_at DESC LIMIT 1',
        [`%${normalize(editalTitleArg)}%`]
      );
    } else {
      console.error('Missing --edital-id or --edital-code or --edital-title');
      process.exit(1);
    }

    const edital = editalRes.rows[0];
    if (!edital) {
      console.error('Edital not found.');
      process.exit(1);
    }

    const dropsRes = await client.query(
      "SELECT id, topic_code FROM drops WHERE origin_meta->>'edital_id' = $1",
      [edital.id]
    );
    const dropIds = dropsRes.rows.map((row) => row.id);
    const topicCodes = Array.from(
      new Set(dropsRes.rows.map((row) => row.topic_code).filter(Boolean))
    );
    const cacheHashes = topicCodes.map((code) =>
      makeHash(`edital:${edital.id}|topic:${code}`)
    );

    const questoesRes = await client.query(
      'SELECT questao_id FROM edital_questoes WHERE edital_id = $1',
      [edital.id]
    );
    const questaoIds = questoesRes.rows.map((row) => row.questao_id);

    const autoRes = await client.query(
      'SELECT id FROM edital_auto_formacoes WHERE edital_id = $1 AND user_id = $2',
      [edital.id, user.id]
    );
    const autoIds = autoRes.rows.map((row) => row.id);

    console.log(
      JSON.stringify(
        {
          user: { id: user.id, email: user.email },
          edital: { id: edital.id, codigo: edital.codigo, titulo: edital.titulo },
          drops: dropIds.length,
          topic_codes: topicCodes.length,
          cache_hashes: cacheHashes.length,
          questoes: questaoIds.length,
          auto_formacoes: autoIds.length,
        },
        null,
        2
      )
    );

    if (!confirm) {
      console.log('Dry run only. Re-run with --confirm to apply.');
      process.exit(0);
    }

    await client.query('BEGIN');

    if (autoIds.length) {
      await client.query(
        'DELETE FROM edital_auto_formacoes_versions WHERE auto_formacao_id = ANY($1::uuid[])',
        [autoIds]
      );
    }

    await client.query(
      'DELETE FROM edital_auto_formacoes WHERE edital_id = $1 AND user_id = $2',
      [edital.id, user.id]
    );

    await client.query('DELETE FROM daily_plans WHERE user_id = $1', [user.id]);

    const reccoTables = [
      'recco_inputs',
      'recco_states',
      'recco_prioridades',
      'recco_selecao',
      'recco_sequencia',
      'recco_reforco',
      'recco_feedback',
      'recco_predictions',
      'recco_cognitive_flags',
      'recco_emotional_flags',
    ];
    for (const table of reccoTables) {
      await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [user.id]);
    }

    if (dropIds.length) {
      await client.query('DELETE FROM srs_cards WHERE drop_id = ANY($1::uuid[])', [dropIds]);
      await client.query('DELETE FROM user_drops WHERE drop_id = ANY($1::uuid[])', [dropIds]);
    }

    await client.query("DELETE FROM drops WHERE origin_meta->>'edital_id' = $1", [edital.id]);

    if (cacheHashes.length) {
      await client.query(
        'DELETE FROM drop_cache WHERE hash = ANY($1::varchar[])',
        [cacheHashes]
      );
    }

    if (questaoIds.length) {
      await client.query('DELETE FROM edital_questoes WHERE edital_id = $1', [edital.id]);
      await client.query(
        `
        DELETE FROM questoes
        WHERE id = ANY($1::uuid[])
          AND NOT EXISTS (
            SELECT 1 FROM edital_questoes eq WHERE eq.questao_id = questoes.id
          )
        `,
        [questaoIds]
      );
    }

    await client.query('COMMIT');
    console.log('Reset completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
