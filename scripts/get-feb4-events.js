const fs = require('fs');

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

// Get events for Feb 4
const events = [];
for (let i = 1; i < lines.length; i++) {
  const fields = parseLine(lines[i]);
  const dateRaw = fields[dataIdx];
  const name = fields[eventoIdx];
  const desc = fields[descIdx];

  if (!dateRaw || !name || !desc) continue;
  if (dateRaw !== '04/02/2026') continue;

  // Clean for SQL
  const cleanDesc = desc
    .substring(0, 180)
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/\\/g, '')
    .replace(/\n/g, ' ');
  const cleanName = name.replace(/'/g, '');

  events.push({name: cleanName, date: '2026-02-04', desc: cleanDesc});
}

console.log('Eventos em 04/02/2026:', events.length);
events.forEach(e => console.log(` - ${e.name}: ${e.desc.substring(0,50)}...`));

// Output JSON for import
fs.writeFileSync('scripts/feb4-events.json', JSON.stringify(events, null, 2));
console.log('\nSalvo em scripts/feb4-events.json');
