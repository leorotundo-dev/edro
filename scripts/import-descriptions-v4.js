const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');
const EDRO_DIR = path.join(__dirname, '..');
const PROGRESS_FILE = path.join(__dirname, 'import-progress.json');

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

// Ultra-safe cleaning - only alphanumeric, spaces, periods, commas
function ultraClean(str) {
  return str
    .substring(0, 160)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(str) {
  return str.replace(/'/g, "''").replace(/\\/g, '').trim();
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { completed: [] };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('IMPORTACAO DE DESCRICOES v4 (base64)\n');
  console.log('='.repeat(60));

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
      name: cleanName(name),
      date,
      desc: ultraClean(desc),
      key
    });
  }

  console.log(`Total eventos: ${events.length}`);

  const progress = loadProgress();
  const completedSet = new Set(progress.completed);
  const pending = events.filter(e => !completedSet.has(e.key));

  console.log(`Ja processados: ${progress.completed.length}`);
  console.log(`Pendentes: ${pending.length}\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < pending.length; i++) {
    const e = pending[i];

    // Build the node code
    const sql = `UPDATE events SET payload = COALESCE(payload, '{}'::jsonb) || '{"descricao_ai":"${e.desc}"}'::jsonb WHERE name = '${e.name}' AND date = '${e.date}'`;
    const nodeCode = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\`${sql}\`).then(r=>console.log(r.rowCount||0)).catch(()=>console.log('E')).finally(()=>p.end())`;

    // Encode as base64
    const b64 = Buffer.from(nodeCode).toString('base64');

    try {
      // Use base64 decode on server
      const cmd = `railway ssh "node -e \\"eval(Buffer.from('${b64}','base64').toString())\\"" 2>&1`;
      let result = execSync(cmd, {
        cwd: EDRO_DIR,
        encoding: 'utf-8',
        timeout: 30000,
        windowsHide: true
      }).trim();

      // Strip ANSI color codes
      result = result.replace(/\x1b\[[0-9;]*m/g, '').trim();

      if (result === '1') {
        updated++;
        progress.completed.push(e.key);
      } else if (result === '0') {
        notFound++;
        progress.completed.push(e.key);
      } else {
        errors++;
        if (errors <= 3) console.log(`Err ${i}: ${result.substring(0, 100)}`);
      }
    } catch (err) {
      errors++;
      if (errors <= 3) console.log(`Exception ${i}: ${err.message.substring(0, 100)}`);
    }

    if ((i + 1) % 10 === 0) {
      saveProgress(progress);
    }

    if ((i + 1) % 25 === 0) {
      console.log(`[${i + 1}/${pending.length}] OK: ${updated}, NF: ${notFound}, ERR: ${errors}`);
    }

    await sleep(150);
  }

  saveProgress(progress);

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log(`Atualizados: ${updated}`);
  console.log(`Nao encontrados: ${notFound}`);
  console.log(`Erros: ${errors}`);
}

main().catch(console.error);
