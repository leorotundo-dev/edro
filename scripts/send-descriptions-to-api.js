/**
 * Script para enviar descrições de IA para o banco via API
 *
 * USO:
 *   1. Faça login no https://edro-production.up.railway.app
 *   2. Pegue o token: localStorage.getItem('edro_token') no console
 *   3. Execute: TOKEN="seu_token" node scripts/send-descriptions-to-api.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');
const API_URL = 'https://edro-backend-production.up.railway.app/api/calendar/admin/import-descriptions';
const BATCH_SIZE = 50;

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('ERRO: TOKEN não definido');
  console.error('');
  console.error('USO:');
  console.error('  1. Faça login no https://edro-production.up.railway.app');
  console.error('  2. Abra DevTools > Console');
  console.error('  3. Execute: localStorage.getItem("edro_token")');
  console.error('  4. Rode: TOKEN="seu_token" node scripts/send-descriptions-to-api.js');
  process.exit(1);
}

function parseCSVLine(line) {
  const result = [];
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

function convertDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

async function sendBatch(descriptions) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ descriptions }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  console.log('ENVIO DE DESCRIÇÕES PARA O BANCO\n');
  console.log('='.repeat(60));

  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV não encontrado:', CSV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Parse header
  const header = parseCSVLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descricaoIdx = header.indexOf('descricao_ai');
  const origemIdx = header.indexOf('origem_ai');
  const curiosidadeIdx = header.indexOf('curiosidade_ai');

  console.log(`Índices: data=${dataIdx}, evento=${eventoIdx}, descricao=${descricaoIdx}\n`);

  // Parse all descriptions
  const allDescriptions = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    const descricao = fields[descricaoIdx];
    if (!descricao || descricao.trim() === '') continue;

    allDescriptions.push({
      name: fields[eventoIdx],
      date: convertDate(fields[dataIdx]),
      descricao_ai: descricao,
      origem_ai: fields[origemIdx] || '',
      curiosidade_ai: fields[curiosidadeIdx] || '',
    });
  }

  console.log(`Total de descrições: ${allDescriptions.length}\n`);

  // Send in batches
  let totalUpdated = 0;
  let totalNotFound = 0;

  for (let i = 0; i < allDescriptions.length; i += BATCH_SIZE) {
    const batch = allDescriptions.slice(i, i + BATCH_SIZE);

    try {
      const result = await sendBatch(batch);
      totalUpdated += result.updated;
      totalNotFound += result.notFound;

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.updated} atualizados, ${result.notFound} não encontrados`);
    } catch (err) {
      console.error(`Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`Total atualizados: ${totalUpdated}`);
  console.log(`Total não encontrados: ${totalNotFound}`);
}

main().catch(console.error);
