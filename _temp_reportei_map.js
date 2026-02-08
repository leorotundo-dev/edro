const { Client } = require('pg');

const mappings = [
  { label: 'VIP Leiloes', accountId: '746553' },
  { label: 'Ciclus Amazonia', accountId: '633509' },
  { label: 'CS Mobi Leste', accountId: '1060333' },
  { label: 'CS Graos', accountId: '618502' },
  { label: 'CS Infra', accountId: '683609' },
  { label: 'Ciclus Ambiental', accountId: '830611' },
  { label: 'CS Mobi Cuiaba', accountId: '598678' },
  { label: 'CS Rodovias', accountId: '1157639' },
  { label: 'CS Portos', accountId: '1010546' },
  { label: 'BBC Digital', accountId: '799054' },
];

const APPLY = process.argv.includes('--apply');

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const scoreMatch = (label, name) => {
  const normLabel = normalize(label);
  const normName = normalize(name);
  if (!normLabel || !normName) return 0;
  if (normLabel === normName) return 100;
  if (normName.includes(normLabel) || normLabel.includes(normName)) return 80;

  const tokens = normLabel.split(' ').filter((t) => t.length > 2);
  if (!tokens.length) return 0;
  let score = 0;
  for (const t of tokens) {
    if (normName.includes(t)) score += 10;
  }
  return Math.min(score, 70);
};

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows: clients } = await db.query(
    'SELECT id, name, reportei_account_id, tenant_id FROM clients ORDER BY name ASC'
  );

  const updates = [];

  console.log('Reportei account mapping check');
  for (const entry of mappings) {
    const scored = clients
      .map((client) => ({
        client,
        score: scoreMatch(entry.label, client.name),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const top = scored.slice(0, 3);

    console.log(`\n- ${entry.label} -> ${entry.accountId}`);
    if (!best) {
      console.log('  No match found.');
      continue;
    }

    top.forEach((item, idx) => {
      console.log(
        `  [${idx + 1}] ${item.client.name} (id: ${item.client.id}) score=${item.score} current=${item.client.reportei_account_id || '-'} `
      );
    });

    if (best.score >= 60) {
      updates.push({
        id: best.client.id,
        name: best.client.name,
        accountId: entry.accountId,
        current: best.client.reportei_account_id,
      });
    }
  }

  if (APPLY && updates.length) {
    console.log('\nApplying updates:');
    for (const item of updates) {
      await db.query('UPDATE clients SET reportei_account_id=$2, updated_at=now() WHERE id=$1', [
        item.id,
        item.accountId,
      ]);
      console.log(`- ${item.name} (${item.id}) => ${item.accountId}`);
    }
  } else if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to update reportei_account_id.');
  }

  await db.end();
})();
