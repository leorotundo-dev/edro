/**
 * Script para remover eventos duplicados do banco de PRODUÇÃO
 *
 * USO:
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/removeDuplicatesProduction.ts --dry-run
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/removeDuplicatesProduction.ts
 *
 * IMPORTANTE: Cole a DATABASE_URL de produção diretamente no comando
 */

import { Pool, QueryResultRow } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL não definida');
  console.error('');
  console.error('USO:');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" npx tsx src/scripts/removeDuplicatesProduction.ts --dry-run');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('REMOCAO DE EVENTOS DUPLICADOS - PRODUCAO\n');
  console.log('='.repeat(70));

  if (dryRun) {
    console.log('MODO DRY-RUN: Nenhum evento sera deletado\n');
  } else {
    console.log('MODO EXECUCAO: Eventos duplicados SERAO DELETADOS\n');
  }

  // 1. Contar total de eventos
  const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
  const totalEvents = parseInt(countRows[0].count, 10);
  console.log(`Total de eventos no banco: ${totalEvents}\n`);

  // 2. Encontrar duplicados por nome + data
  console.log('Buscando duplicados por nome + data...\n');

  const { rows: duplicates } = await query<{ name: string; date: string; cnt: string; ids: string[] }>(`
    SELECT
      name,
      date,
      COUNT(*) as cnt,
      array_agg(id ORDER BY created_at ASC) as ids
    FROM events
    WHERE date IS NOT NULL
    GROUP BY name, date
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, name ASC
  `);

  if (duplicates.length === 0) {
    console.log('Nenhum duplicado encontrado por nome + data!\n');
  } else {
    console.log(`Encontrados ${duplicates.length} grupos de duplicados por nome + data:\n`);

    let totalToRemove = 0;
    const idsToRemove: string[] = [];

    for (const dup of duplicates.slice(0, 20)) {
      const count = parseInt(dup.cnt, 10);
      const extraIds = dup.ids.slice(1);
      totalToRemove += extraIds.length;
      idsToRemove.push(...extraIds);

      console.log(`  ${dup.date || 'N/A'} | "${dup.name}" (${count}x)`);
      console.log(`    Manter: ${dup.ids[0]}`);
      console.log(`    Remover: ${extraIds.join(', ')}`);
    }

    if (duplicates.length > 20) {
      console.log(`\n  ... e mais ${duplicates.length - 20} grupos de duplicados`);

      for (const dup of duplicates.slice(20)) {
        const extraIds = dup.ids.slice(1);
        totalToRemove += extraIds.length;
        idsToRemove.push(...extraIds);
      }
    }

    console.log(`\nTotal de eventos a remover (nome+data): ${totalToRemove}`);

    if (!dryRun && idsToRemove.length > 0) {
      console.log('\nRemovendo duplicados...');

      const batchSize = 100;
      let removed = 0;

      for (let i = 0; i < idsToRemove.length; i += batchSize) {
        const batch = idsToRemove.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');

        await query(`DELETE FROM events WHERE id IN (${placeholders})`, batch);
        removed += batch.length;
        console.log(`   Removidos ${removed}/${idsToRemove.length}`);
      }

      console.log(`\n${removed} eventos duplicados removidos!`);
    }
  }

  // 3. Encontrar duplicados por nome normalizado + data
  console.log('\nBuscando duplicados por nome similar + data...\n');

  const { rows: similarDups } = await query<{ date: string; normalized: string; cnt: string; ids: string[]; names: string[] }>(`
    SELECT
      date,
      LOWER(TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[áàâãä]', 'a', 'gi'),
        '[éèêë]', 'e', 'gi'
      ))) as normalized,
      COUNT(*) as cnt,
      array_agg(id ORDER BY base_relevance DESC) as ids,
      array_agg(name ORDER BY base_relevance DESC) as names
    FROM events
    WHERE date IS NOT NULL
    GROUP BY date, LOWER(TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[áàâãä]', 'a', 'gi'),
      '[éèêë]', 'e', 'gi'
    )))
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `);

  const realSimilarDups = similarDups.filter(dup => {
    const uniqueNames = new Set(dup.names);
    return uniqueNames.size > 1;
  });

  if (realSimilarDups.length === 0) {
    console.log('Nenhum duplicado similar encontrado!\n');
  } else {
    console.log(`Encontrados ${realSimilarDups.length} grupos com nomes similares:\n`);

    const similarIdsToRemove: string[] = [];

    for (const dup of realSimilarDups.slice(0, 15)) {
      console.log(`  ${dup.date} | Variacoes:`);
      for (let i = 0; i < dup.names.length; i++) {
        console.log(`    ${i === 0 ? 'MANTER' : 'REMOVER'} "${dup.names[i]}"`);
        if (i > 0) {
          similarIdsToRemove.push(dup.ids[i]);
        }
      }
    }

    if (realSimilarDups.length > 15) {
      console.log(`\n  ... e mais ${realSimilarDups.length - 15} grupos similares`);

      for (const dup of realSimilarDups.slice(15)) {
        for (let i = 1; i < dup.ids.length; i++) {
          similarIdsToRemove.push(dup.ids[i]);
        }
      }
    }

    console.log(`\nTotal de eventos similares a remover: ${similarIdsToRemove.length}`);

    if (!dryRun && similarIdsToRemove.length > 0) {
      console.log('\nRemovendo duplicados similares...');

      const batchSize = 100;
      let removed = 0;

      for (let i = 0; i < similarIdsToRemove.length; i += batchSize) {
        const batch = similarIdsToRemove.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');

        await query(`DELETE FROM events WHERE id IN (${placeholders})`, batch);
        removed += batch.length;
        console.log(`   Removidos ${removed}/${similarIdsToRemove.length}`);
      }

      console.log(`\n${removed} eventos similares removidos!`);
    }
  }

  // 4. Resumo final
  const { rows: finalCount } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
  const finalTotal = parseInt(finalCount[0].count, 10);

  console.log('\n' + '='.repeat(70));
  console.log('RESUMO FINAL');
  console.log('='.repeat(70));
  console.log(`\nEventos antes: ${totalEvents}`);
  console.log(`Eventos depois: ${finalTotal}`);
  console.log(`Eventos removidos: ${totalEvents - finalTotal}`);

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
