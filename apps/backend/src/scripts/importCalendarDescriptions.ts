/**
 * Script para importar descrições de IA do CSV para o banco de dados
 *
 * USO: npx tsx src/scripts/importCalendarDescriptions.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CSV_PATH = path.join(__dirname, '../../../../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function convertDate(dateStr: string): string {
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

async function main() {
  console.log('IMPORTAÇÃO DE DESCRIÇÕES DE IA PARA O BANCO\n');
  console.log('='.repeat(60));

  // Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error('Arquivo CSV não encontrado:', CSV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Parse header
  const header = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descricaoIdx = header.indexOf('descricao_ai');
  const origemIdx = header.indexOf('origem_ai');
  const curiosidadeIdx = header.indexOf('curiosidade_ai');

  console.log(`\nÍndices encontrados:`);
  console.log(`  data: ${dataIdx}, evento: ${eventoIdx}`);
  console.log(`  descricao_ai: ${descricaoIdx}, origem_ai: ${origemIdx}, curiosidade_ai: ${curiosidadeIdx}\n`);

  if (descricaoIdx === -1) {
    console.error('Coluna descricao_ai não encontrada no CSV');
    process.exit(1);
  }

  let updated = 0;
  let notFound = 0;
  let noDescription = 0;

  // Process each line
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    const dateCSV = fields[dataIdx];
    const evento = fields[eventoIdx];
    const descricao = fields[descricaoIdx];
    const origem = fields[origemIdx] || '';
    const curiosidade = fields[curiosidadeIdx] || '';

    if (!descricao || descricao.trim() === '') {
      noDescription++;
      continue;
    }

    const dateDB = convertDate(dateCSV);

    // Update event in database
    const result = await pool.query(
      `UPDATE events
       SET payload = jsonb_set(
         jsonb_set(
           jsonb_set(
             COALESCE(payload, '{}'),
             '{descricao_ai}',
             $1::jsonb
           ),
           '{origem_ai}',
           $2::jsonb
         ),
         '{curiosidade_ai}',
         $3::jsonb
       )
       WHERE name = $4 AND date = $5
       RETURNING id`,
      [
        JSON.stringify(descricao),
        JSON.stringify(origem),
        JSON.stringify(curiosidade),
        evento,
        dateDB
      ]
    );

    if (result.rowCount && result.rowCount > 0) {
      updated++;
      if (updated % 100 === 0) {
        console.log(`Atualizados: ${updated}...`);
      }
    } else {
      notFound++;
      if (notFound <= 10) {
        console.log(`  Não encontrado: "${evento}" em ${dateDB}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`Eventos atualizados: ${updated}`);
  console.log(`Eventos não encontrados: ${notFound}`);
  console.log(`Eventos sem descrição: ${noDescription}`);

  await pool.end();
  console.log('\nConcluído!');
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
