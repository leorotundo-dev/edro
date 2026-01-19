const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';
require('ts-node/register/transpile-only');

const { createJob } = require('../apps/backend/src/services/jobService');

const editalId = process.env.EDITAL_ID;
const userId = process.env.USER_ID;
const maxTotalQuestions = Number.parseInt(process.env.MAX_TOTAL_QUESTIONS || '600', 10);
const maxTopics = Number.parseInt(process.env.MAX_TOPICS_QUESTIONS || '120', 10);
const maxPerTopic = Number.parseInt(process.env.MAX_PER_TOPIC || '6', 10);

if (!editalId || !userId) {
  console.error('Missing EDITAL_ID or USER_ID');
  process.exit(1);
}

async function main() {
  const jobId = await createJob({
    name: `generate_questions ${editalId}`,
    type: 'generate_questions',
    data: {
      editalId,
      userId,
      maxTotalQuestions,
      maxTopics,
      maxPerTopic,
      status: 'active',
    },
    priority: 8,
    maxAttempts: 1,
  });

  console.log(
    JSON.stringify(
      { jobId, editalId, userId, maxTotalQuestions, maxTopics, maxPerTopic },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
