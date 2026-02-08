const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');
const EDRO_DIR = path.join(__dirname, '..');

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

function cleanForSQL(str) {
  return str
    .substring(0, 180)
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/\\/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\$/g, '')
    .replace(/`/g, '');
}

function runSSH(nodeCode) {
  const result = spawnSync('railway', ['ssh', `node -e "${nodeCode}"`], {
    cwd: EDRO_DIR,
    encoding: 'utf-8',
    timeout: 60000,
    shell: true,
  });
  return result.stdout?.trim() || result.stderr?.trim() || '';
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('IMPORTAÇÃO DE DESCRIÇÕES DE IA v2\n');
  console.log('='.repeat(60));
  console.log('Diretório:', EDRO_DIR);
  console.log('CSV:', CSV_PATH);

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descIdx = header.indexOf('descricao_ai');

  const events = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    const dateRaw = fields[dataIdx];
    const name = fields[eventoIdx];
    const desc = fields[descIdx];

    if (!dateRaw || !name || !desc) continue;

    const date = convertDate(dateRaw);
    const key = `${name}|${date}`;

    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      name: cleanForSQL(name),
      date,
      desc: cleanForSQL(desc),
    });
  }

  console.log(`\nTotal eventos: ${events.length}\n`);

  let totalUpdated = 0;
  let totalErrors = 0;

  // Process one at a time
  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    const sql = `UPDATE events SET payload = payload || '{\\"descricao_ai\\":\\"${e.desc}\\"}' ::jsonb WHERE name = '${e.name}' AND date = '${e.date}'`;
    const nodeCode = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\\"${sql}\\").then(r=>console.log(r.rowCount||0)).catch(()=>console.log('E')).finally(()=>p.end())`;

    try {
      const result = runSSH(nodeCode);
      if (result === '1') {
        totalUpdated++;
      } else if (result === 'E') {
        totalErrors++;
      }
    } catch (err) {
      totalErrors++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progresso: ${i + 1}/${events.length} (${totalUpdated} ok, ${totalErrors} err)`);
    }

    await sleep(200);
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO FINAL');
  console.log(`Total atualizados: ${totalUpdated}`);
  console.log(`Total erros: ${totalErrors}`);
}

main().catch(console.error);
