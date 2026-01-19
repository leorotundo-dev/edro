const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';
require('ts-node/register/transpile-only');

const { createJob, getJobStatus } = require('../apps/backend/src/services/jobService');

const jobIdRaw = process.env.JOB_ID || process.argv[2];
const editalId = process.env.EDITAL_ID || process.argv[3];
const userId = process.env.USER_ID || process.argv[4];

const jobId = Number.parseInt(String(jobIdRaw || ''), 10);
const pollIntervalMs = Number.parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);

const maxTotalQuestions = Number.parseInt(process.env.MAX_TOTAL_QUESTIONS || '600', 10);
const maxTopics = Number.parseInt(process.env.MAX_TOPICS_QUESTIONS || '120', 10);
const maxPerTopic = Number.parseInt(process.env.MAX_PER_TOPIC || '6', 10);

if (!Number.isFinite(jobId) || jobId <= 0 || !editalId || !userId) {
  console.error('Missing JOB_ID, EDITAL_ID, or USER_ID');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompletion() {
  while (true) {
    const job = await getJobStatus(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`[watch] job ${jobId} status: ${job.status}`);

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Job ${jobId} failed: ${job.error || 'unknown error'}`);
    }

    await sleep(pollIntervalMs);
  }
}

async function enqueueQuestions() {
  const newJobId = await createJob({
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
      {
        jobId: newJobId,
        editalId,
        userId,
        maxTotalQuestions,
        maxTopics,
        maxPerTopic,
      },
      null,
      2
    )
  );
}

async function main() {
  await waitForCompletion();
  await enqueueQuestions();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
