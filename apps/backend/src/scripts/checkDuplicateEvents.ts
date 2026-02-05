/**
 * Script para verificar eventos duplicados no calendário
 * Executa: npx tsx src/scripts/checkDuplicateEvents.ts
 */

import { query } from '../db';

interface EventRow {
  id: string;
  name: string;
  slug: string;
  date_type: string;
  date: string | null;
  rule: string | null;
  start_date: string | null;
  end_date: string | null;
  scope: string;
  country: string | null;
}

async function checkDuplicates() {
  console.log('🔍 Verificando eventos duplicados no calendário...\n');

  // 1. Total de eventos
  const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
  const totalEvents = parseInt(countRows[0].count, 10);
  console.log(`📊 Total de eventos: ${totalEvents}\n`);

  // 2. Duplicados por nome exato
  const { rows: exactDups } = await query<{ name: string; count: string }>(`
    SELECT name, COUNT(*) as count
    FROM events
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY count DESC, name ASC
  `);

  if (exactDups.length > 0) {
    console.log(`❌ DUPLICADOS POR NOME EXATO: ${exactDups.length} nomes repetidos\n`);
    console.log('Nome | Qtd');
    console.log('-'.repeat(60));
    for (const dup of exactDups.slice(0, 50)) {
      console.log(`${dup.name.substring(0, 50).padEnd(50)} | ${dup.count}`);
    }
    if (exactDups.length > 50) {
      console.log(`... e mais ${exactDups.length - 50} nomes duplicados`);
    }
    console.log('');
  } else {
    console.log('✅ Nenhum duplicado por nome exato encontrado\n');
  }

  // 3. Duplicados por slug
  const { rows: slugDups } = await query<{ slug: string; count: string }>(`
    SELECT slug, COUNT(*) as count
    FROM events
    GROUP BY slug
    HAVING COUNT(*) > 1
    ORDER BY count DESC, slug ASC
  `);

  if (slugDups.length > 0) {
    console.log(`❌ DUPLICADOS POR SLUG: ${slugDups.length} slugs repetidos\n`);
    console.log('Slug | Qtd');
    console.log('-'.repeat(60));
    for (const dup of slugDups.slice(0, 50)) {
      console.log(`${dup.slug.substring(0, 50).padEnd(50)} | ${dup.count}`);
    }
    if (slugDups.length > 50) {
      console.log(`... e mais ${slugDups.length - 50} slugs duplicados`);
    }
    console.log('');
  } else {
    console.log('✅ Nenhum duplicado por slug encontrado\n');
  }

  // 4. Duplicados por data fixa (mesma data + mesmo nome normalizado)
  const { rows: dateDups } = await query<{ date: string; name_normalized: string; count: string }>(`
    SELECT date, LOWER(TRIM(name)) as name_normalized, COUNT(*) as count
    FROM events
    WHERE date_type = 'fixed' AND date IS NOT NULL
    GROUP BY date, LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  if (dateDups.length > 0) {
    console.log(`❌ DUPLICADOS POR DATA FIXA + NOME: ${dateDups.length} combinações repetidas\n`);
    console.log('Data | Nome | Qtd');
    console.log('-'.repeat(70));
    for (const dup of dateDups.slice(0, 30)) {
      console.log(`${(dup.date || '').padEnd(12)} | ${dup.name_normalized.substring(0, 40).padEnd(40)} | ${dup.count}`);
    }
    console.log('');
  } else {
    console.log('✅ Nenhum duplicado por data fixa + nome encontrado\n');
  }

  // 5. Eventos com nomes muito similares (possíveis duplicados)
  const { rows: allEvents } = await query<EventRow>(`
    SELECT id, name, slug, date_type, date, rule, start_date, end_date, scope, country
    FROM events
    ORDER BY name ASC
  `);

  const similarPairs: { name1: string; name2: string; similarity: number }[] = [];
  const normalizedNames = allEvents.map(e => ({
    ...e,
    normalized: e.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, '') // remove especiais
      .replace(/\s+/g, ' ')
      .trim()
  }));

  // Verificar pares similares (Levenshtein simplificado)
  for (let i = 0; i < normalizedNames.length; i++) {
    for (let j = i + 1; j < normalizedNames.length; j++) {
      const a = normalizedNames[i].normalized;
      const b = normalizedNames[j].normalized;

      // Se um contém o outro e são muito parecidos
      if (a.length > 5 && b.length > 5) {
        if (a.includes(b) || b.includes(a)) {
          similarPairs.push({
            name1: normalizedNames[i].name,
            name2: normalizedNames[j].name,
            similarity: 95
          });
        } else if (a.split(' ')[0] === b.split(' ')[0] && a.split(' ').length > 1) {
          // Mesmo início
          const commonWords = a.split(' ').filter(w => b.split(' ').includes(w)).length;
          const maxWords = Math.max(a.split(' ').length, b.split(' ').length);
          const similarity = (commonWords / maxWords) * 100;
          if (similarity >= 60) {
            similarPairs.push({
              name1: normalizedNames[i].name,
              name2: normalizedNames[j].name,
              similarity: Math.round(similarity)
            });
          }
        }
      }
    }
  }

  if (similarPairs.length > 0) {
    console.log(`⚠️  POSSÍVEIS DUPLICADOS (nomes similares): ${similarPairs.length} pares\n`);
    const uniquePairs = similarPairs
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 50);

    console.log('Nome 1 | Nome 2 | Similaridade');
    console.log('-'.repeat(100));
    for (const pair of uniquePairs) {
      console.log(`${pair.name1.substring(0, 35).padEnd(35)} | ${pair.name2.substring(0, 35).padEnd(35)} | ${pair.similarity}%`);
    }
    if (similarPairs.length > 50) {
      console.log(`... e mais ${similarPairs.length - 50} pares similares`);
    }
    console.log('');
  } else {
    console.log('✅ Nenhum par com nomes muito similares encontrado\n');
  }

  // 6. Resumo por categoria
  const { rows: categoryCounts } = await query<{ category: string; count: string }>(`
    SELECT unnest(categories) as category, COUNT(*) as count
    FROM events
    GROUP BY category
    ORDER BY count DESC
  `);

  console.log('📂 EVENTOS POR CATEGORIA:\n');
  for (const cat of categoryCounts) {
    console.log(`  ${cat.category.padEnd(20)} ${cat.count}`);
  }
  console.log('');

  // 7. Resumo final
  const duplicateCount = exactDups.reduce((sum, d) => sum + parseInt(d.count, 10) - 1, 0);
  console.log('═'.repeat(60));
  console.log('RESUMO:');
  console.log(`  Total de eventos: ${totalEvents}`);
  console.log(`  Nomes duplicados: ${exactDups.length} (${duplicateCount} registros extras)`);
  console.log(`  Slugs duplicados: ${slugDups.length}`);
  console.log(`  Pares similares: ${similarPairs.length}`);
  console.log('═'.repeat(60));

  process.exit(0);
}

checkDuplicates().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
