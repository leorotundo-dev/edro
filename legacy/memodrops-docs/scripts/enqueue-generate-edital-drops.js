const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';
require('ts-node/register/transpile-only');

const { createJob } = require('../apps/backend/src/services/jobService');

const editalId = process.env.EDITAL_ID || 'f802ac8a-e970-4fcf-b9c8-356a84f174f6';
const maxTopicsPerEdital = Number.parseInt(process.env.MAX_TOPICS_PER_EDITAL || '600', 10);
const maxTotalTopics = Number.parseInt(process.env.MAX_TOTAL_TOPICS || '800', 10);

async function main() {
  const jobId = await createJob({
    name: `generate_edital_drops ${editalId}`,
    type: 'generate_edital_drops',
    data: {
      editalId,
      maxTopicsPerEdital,
      maxTotalTopics,
    },
    priority: 8,
    maxAttempts: 1,
  });

  console.log(JSON.stringify({ jobId, editalId, maxTopicsPerEdital, maxTotalTopics }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
