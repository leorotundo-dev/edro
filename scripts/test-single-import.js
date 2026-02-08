const fs = require('fs');
const { spawnSync, execSync } = require('child_process');
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

async function main() {
  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descIdx = header.indexOf('descricao_ai');

  // Get first event with description
  const fields = parseLine(lines[1]);
  const name = cleanName(fields[eventoIdx]);
  const date = convertDate(fields[dataIdx]);
  const desc = ultraClean(fields[descIdx]);

  console.log('Name:', name);
  console.log('Date:', date);
  console.log('Desc:', desc);

  // Try with execSync approach
  const sql = `UPDATE events SET payload = COALESCE(payload, '{}'::jsonb) || '{\\\"descricao_ai\\\":\\\"${desc}\\\"}'::jsonb WHERE name = '${name}' AND date = '${date}'`;

  console.log('\nSQL:', sql);

  const nodeCode = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query("${sql}").then(r=>console.log('OK',r.rowCount)).catch(e=>console.log('ERR',e.message)).finally(()=>p.end())`;

  console.log('\nNode code length:', nodeCode.length);

  try {
    const cmd = `railway ssh "node -e \\"${nodeCode}\\""`;
    console.log('\nCommand:', cmd.substring(0, 200) + '...');

    const result = execSync(cmd, {
      cwd: EDRO_DIR,
      encoding: 'utf-8',
      timeout: 30000
    });
    console.log('\nResult:', result);
  } catch (err) {
    console.log('\nError:', err.message);
    console.log('Stdout:', err.stdout);
    console.log('Stderr:', err.stderr);
  }
}

main().catch(console.error);
