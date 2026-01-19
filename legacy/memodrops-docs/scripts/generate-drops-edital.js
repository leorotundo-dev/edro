const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';
require('ts-node/register/transpile-only');

const { generateDropsFromEditais } = require('../apps/backend/src/services/dropGenerationFromEditais');

const editalId = process.env.EDITAL_ID || 'f802ac8a-e970-4fcf-b9c8-356a84f174f6';
const maxTopicsPerEdital = Number.parseInt(process.env.MAX_TOPICS_PER_EDITAL || '600', 10);
const maxTotalTopics = Number.parseInt(process.env.MAX_TOTAL_TOPICS || '800', 10);

async function main() {
  const result = await generateDropsFromEditais({
    editalId,
    maxTopicsPerEdital: Number.isFinite(maxTopicsPerEdital) ? maxTopicsPerEdital : 600,
    maxTotalTopics: Number.isFinite(maxTotalTopics) ? maxTotalTopics : 800,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
