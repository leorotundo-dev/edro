const fs = require('fs');
const { execSync } = require('child_process');

const CSV_PATH = 'docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv';

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
    .substring(0, 200)
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/\\/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\$/g, '');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('IMPORTAÇÃO DE DESCRIÇÕES DE IA\n');
  console.log('='.repeat(60));

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descIdx = header.indexOf('descricao_ai');

  // Parse all events
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

  console.log(`Total eventos: ${events.length}\n`);

  // Process in batches of 5 events per SSH call
  const BATCH_SIZE = 5;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(events.length / BATCH_SIZE);

    // Build SQL updates
    const updates = batch.map(e =>
      `UPDATE events SET payload = payload || '{"descricao_ai":"${e.desc}"}' ::jsonb WHERE name = '${e.name}' AND date = '${e.date}'`
    ).join('; ');

    const script = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query("${updates.replace(/"/g, '\\"')}").then(r=>console.log(r.rowCount||0)).catch(e=>console.log('ERR')).finally(()=>p.end())`;

    try {
      const cmd = `cd "C:\\Users\\leoro\\Documents\\Edro.Digital" && railway ssh "node -e \\"${script}\\""`;
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 60000 }).trim();

      if (result === 'ERR') {
        totalErrors += batch.length;
      } else {
        const count = parseInt(result, 10) || 0;
        totalUpdated += count;
      }

      if (batchNum % 20 === 0 || batchNum === totalBatches) {
        console.log(`Progresso: ${batchNum}/${totalBatches} batches (${totalUpdated} atualizados, ${totalErrors} erros)`);
      }
    } catch (err) {
      totalErrors += batch.length;
      console.error(`Batch ${batchNum} erro`);
    }

    await sleep(300);
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO FINAL');
  console.log(`Total atualizados: ${totalUpdated}`);
  console.log(`Total erros: ${totalErrors}`);
}

main().catch(console.error);
