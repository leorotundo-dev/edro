/**
 * Script para remover eventos duplicados do banco de dados
 * Executa: npx tsx src/scripts/removeDuplicateEvents.ts
 *
 * Opções:
 *   --dry-run     Apenas mostra o que seria removido, sem deletar
 */

import { query, pool } from '../db';

interface DuplicateGroup {
  name: string;
  date: string;
  count: number;
  ids: string[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('🔍 REMOÇÃO DE EVENTOS DUPLICADOS NO BANCO DE DADOS\n');
  console.log('='.repeat(70));

  if (dryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhum evento será deletado\n');
  }

  // 1. Contar total de eventos
  const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
  const totalEvents = parseInt(countRows[0].count, 10);
  console.log(`📊 Total de eventos no banco: ${totalEvents}\n`);

  // 2. Encontrar duplicados por nome + data
  console.log('🔍 Buscando duplicados por nome + data...\n');

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
    console.log('✅ Nenhum duplicado encontrado por nome + data!\n');
  } else {
    console.log(`❌ Encontrados ${duplicates.length} grupos de duplicados por nome + data:\n`);

    let totalToRemove = 0;
    const idsToRemove: string[] = [];

    for (const dup of duplicates.slice(0, 30)) {
      const count = parseInt(dup.cnt, 10);
      const extraIds = dup.ids.slice(1); // Manter o primeiro (mais antigo)
      totalToRemove += extraIds.length;
      idsToRemove.push(...extraIds);

      console.log(`  ${dup.date || 'N/A'} | "${dup.name}" (${count}x)`);
      console.log(`    Manter: ${dup.ids[0]}`);
      console.log(`    Remover: ${extraIds.join(', ')}`);
    }

    if (duplicates.length > 30) {
      console.log(`\n  ... e mais ${duplicates.length - 30} grupos de duplicados`);

      // Calcular todos os IDs a remover
      for (const dup of duplicates.slice(30)) {
        const extraIds = dup.ids.slice(1);
        totalToRemove += extraIds.length;
        idsToRemove.push(...extraIds);
      }
    }

    console.log(`\n📊 Total de eventos a remover: ${totalToRemove}`);

    if (!dryRun && idsToRemove.length > 0) {
      console.log('\n🗑️  Removendo duplicados...');

      // Deletar em lotes de 100
      const batchSize = 100;
      let removed = 0;

      for (let i = 0; i < idsToRemove.length; i += batchSize) {
        const batch = idsToRemove.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');

        await query(`DELETE FROM events WHERE id IN (${placeholders})`, batch);
        removed += batch.length;
        console.log(`   Removidos ${removed}/${idsToRemove.length}`);
      }

      console.log(`\n✅ ${removed} eventos duplicados removidos!`);
    }
  }

  // 3. Encontrar duplicados por nome normalizado + data (variações de escrita)
  console.log('\n🔍 Buscando duplicados por nome similar + data...\n');

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

  // Filtrar apenas os que têm nomes DIFERENTES (variações)
  const realSimilarDups = similarDups.filter(dup => {
    const uniqueNames = new Set(dup.names);
    return uniqueNames.size > 1;
  });

  if (realSimilarDups.length === 0) {
    console.log('✅ Nenhum duplicado similar encontrado!\n');
  } else {
    console.log(`⚠️  Encontrados ${realSimilarDups.length} grupos com nomes similares:\n`);

    const similarIdsToRemove: string[] = [];

    for (const dup of realSimilarDups.slice(0, 20)) {
      console.log(`  ${dup.date} | Variações:`);
      for (let i = 0; i < dup.names.length; i++) {
        console.log(`    ${i === 0 ? '✓' : '✗'} "${dup.names[i]}" (${dup.ids[i]})`);
        if (i > 0) {
          similarIdsToRemove.push(dup.ids[i]);
        }
      }
    }

    if (realSimilarDups.length > 20) {
      console.log(`\n  ... e mais ${realSimilarDups.length - 20} grupos similares`);

      for (const dup of realSimilarDups.slice(20)) {
        for (let i = 1; i < dup.ids.length; i++) {
          similarIdsToRemove.push(dup.ids[i]);
        }
      }
    }

    console.log(`\n📊 Total de eventos similares a remover: ${similarIdsToRemove.length}`);

    if (!dryRun && similarIdsToRemove.length > 0) {
      console.log('\n🗑️  Removendo duplicados similares...');

      const batchSize = 100;
      let removed = 0;

      for (let i = 0; i < similarIdsToRemove.length; i += batchSize) {
        const batch = similarIdsToRemove.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');

        await query(`DELETE FROM events WHERE id IN (${placeholders})`, batch);
        removed += batch.length;
        console.log(`   Removidos ${removed}/${similarIdsToRemove.length}`);
      }

      console.log(`\n✅ ${removed} eventos similares removidos!`);
    }
  }

  // 4. Resumo final
  const { rows: finalCount } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
  const finalTotal = parseInt(finalCount[0].count, 10);

  console.log('\n' + '='.repeat(70));
  console.log('📋 RESUMO FINAL');
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
