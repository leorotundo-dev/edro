const fs = require('fs');
const { execSync } = require('child_process');

const csv = fs.readFileSync('docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());

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

const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
const dataIdx = header.indexOf('data');
const eventoIdx = header.indexOf('evento');
const descIdx = header.indexOf('descricao_ai');

// Get February events
const febEvents = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const fields = parseLine(lines[i]);
  const dateRaw = fields[dataIdx];
  const name = fields[eventoIdx];
  const desc = fields[descIdx];

  if (!dateRaw || !name || !desc) continue;
  if (!dateRaw.includes('/02/2026')) continue;

  const parts = dateRaw.split('/');
  const date = `${parts[2]}-${parts[1]}-${parts[0].padStart(2, '0')}`;

  const key = `${name}|${date}`;
  if (seen.has(key)) continue;
  seen.add(key);

  // Clean description for shell
  const cleanDesc = desc
    .substring(0, 200)
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/`/g, '')
    .replace(/\\/g, '')
    .replace(/\$/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');

  const cleanName = name.replace(/'/g, '');

  febEvents.push({ name: cleanName, date, desc: cleanDesc });
}

console.log('Eventos de fevereiro com descricao:', febEvents.length);

async function main() {
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < febEvents.length; i++) {
    const e = febEvents[i];

    const script = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('UPDATE events SET payload=payload||$1::jsonb WHERE name=$2 AND date=$3 RETURNING id',[JSON.stringify({descricao_ai:'${e.desc}'}),'${e.name}','${e.date}']).then(r=>console.log(r.rowCount)).finally(()=>p.end())`;

    const cmd = `cd "C:\\Users\\leoro\\Documents\\Edro.Digital" && railway ssh "node -e \\"${script}\\""`;

    try {
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
      if (result === '1') {
        updated++;
      }
      console.log(`${i + 1}/${febEvents.length}: ${e.name} -> ${result}`);
    } catch (err) {
      console.error(`${i + 1}/${febEvents.length}: ${e.name} -> ERRO`);
      errors++;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n='.repeat(50));
  console.log(`Atualizados: ${updated}`);
  console.log(`Erros: ${errors}`);
}

main();
