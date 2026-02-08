/**
 * Script para importar descrições via Railway SSH
 *
 * USO: node scripts/import-via-ssh.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');
const BATCH_SIZE = 20;

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

function escapeForShell(str) {
  // Escape for JSON inside shell command
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

async function main() {
  console.log('IMPORTAÇÃO DE DESCRIÇÕES VIA SSH\n');
  console.log('='.repeat(60));

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  const header = parseLine(lines[0].replace(/^\uFEFF+/, ''));
  const dataIdx = header.indexOf('data');
  const eventoIdx = header.indexOf('evento');
  const descIdx = header.indexOf('descricao_ai');
  const origemIdx = header.indexOf('origem_ai');
  const curiosidadeIdx = header.indexOf('curiosidade_ai');

  // Parse all events
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

    events.push({
      name,
      date,
      descricao_ai: desc,
      origem_ai: fields[origemIdx] || '',
      curiosidade_ai: fields[curiosidadeIdx] || '',
    });
  }

  console.log(`Total eventos: ${events.length}\n`);

  let totalUpdated = 0;
  let totalNotFound = 0;

  // Process in batches
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(events.length / BATCH_SIZE);

    // Create JSON for batch
    const batchData = batch.map(e => ({
      n: e.name,
      d: e.date,
      desc: e.descricao_ai.substring(0, 400), // Limit to avoid shell issues
    }));

    const jsonStr = JSON.stringify(batchData).replace(/'/g, "'\\''");

    const nodeScript = `
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
const data=${JSON.stringify(batchData)};
(async()=>{
  let u=0,nf=0;
  for(const e of data){
    const r=await p.query(
      'UPDATE events SET payload=payload||$1::jsonb WHERE name=$2 AND date=$3 RETURNING id',
      [JSON.stringify({descricao_ai:e.desc}),e.n,e.d]
    );
    if(r.rowCount>0)u++;else nf++;
  }
  console.log(JSON.stringify({u,nf}));
  await p.end();
})();
`.replace(/\n/g, '').replace(/"/g, '\\"');

    try {
      const result = execSync(
        `cd "C:\\Users\\leoro\\Documents\\Edro.Digital" && railway ssh "node -e \\"${nodeScript}\\""`,
        { encoding: 'utf-8', timeout: 60000 }
      );

      const parsed = JSON.parse(result.trim());
      totalUpdated += parsed.u;
      totalNotFound += parsed.nf;

      console.log(`Batch ${batchNum}/${totalBatches}: ${parsed.u} updated, ${parsed.nf} not found`);
    } catch (err) {
      console.error(`Batch ${batchNum} error:`, err.message);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < events.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log(`Total atualizado: ${totalUpdated}`);
  console.log(`Não encontrado: ${totalNotFound}`);
}

main().catch(console.error);
