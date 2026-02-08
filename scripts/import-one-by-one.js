/**
 * Script para importar descrições uma por vez via Railway SSH
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');
const START_FROM = parseInt(process.env.START || '0', 10);
const LIMIT = parseInt(process.env.LIMIT || '100', 10);

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ';' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function convertDate(dateStr) {
  const parts = dateStr.split('/');
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('IMPORTAÇÃO DE DESCRIÇÕES (1 POR VEZ)\n');
  console.log(`Iniciando do índice ${START_FROM}, limite ${LIMIT}\n`);

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descIdx = header.indexOf('descricao_ai');

  // Parse events
  const events = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    const name = fields[eventoIdx];
    const dateRaw = fields[dataIdx];
    const desc = fields[descIdx];

    if (!desc || !name || !dateRaw) continue;

    const date = convertDate(dateRaw);
    const key = `${name}|${date}`;

    if (seen.has(key)) continue;
    seen.add(key);

    events.push({ name, date, desc: desc.substring(0, 300) });
  }

  console.log(`Total eventos: ${events.length}`);
  console.log(`Processando: ${START_FROM} a ${Math.min(START_FROM + LIMIT, events.length)}\n`);

  let updated = 0;
  let notFound = 0;

  for (let i = START_FROM; i < Math.min(START_FROM + LIMIT, events.length); i++) {
    const e = events[i];

    // Escape description for shell - remove problematic chars
    const safeDesc = e.desc
      .replace(/['"\\`$]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');

    const cmd = `cd "C:\\Users\\leoro\\Documents\\Edro.Digital" && railway ssh "node -e \\"const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('UPDATE events SET payload=payload||\\\\\\$1::jsonb WHERE name=\\\\\\$2 AND date=\\\\\\$3 RETURNING id',[JSON.stringify({descricao_ai:'${safeDesc}'}),'${e.name.replace(/'/g, '')}','${e.date}']).then(r=>console.log(r.rowCount)).finally(()=>p.end())\\""`;

    try {
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
      if (result === '1') {
        updated++;
      } else {
        notFound++;
      }

      if ((i - START_FROM + 1) % 10 === 0) {
        console.log(`Progresso: ${i - START_FROM + 1}/${LIMIT} (${updated} ok, ${notFound} nf)`);
      }
    } catch (err) {
      console.error(`Erro em ${i}: ${e.name} - ${err.message.substring(0, 100)}`);
      notFound++;
    }

    await sleep(200);
  }

  console.log('\n='.repeat(50));
  console.log(`Atualizados: ${updated}`);
  console.log(`Não encontrados: ${notFound}`);
  console.log(`Próximo: START=${START_FROM + LIMIT} LIMIT=${LIMIT}`);
}

main().catch(console.error);
