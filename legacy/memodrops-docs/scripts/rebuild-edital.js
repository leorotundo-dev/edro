const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'apps', 'backend', 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = '1';
require('ts-node/register/transpile-only');

const { generateDropsFromEditais } = require('../apps/backend/src/services/dropGenerationFromEditais');
const { generateQuestionsForEdital } = require('../apps/backend/src/services/questionGenerationService');
const { generateAutoFormacao } = require('../apps/backend/src/services/autoFormacaoService');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const editalId = getArg('--edital-id') || process.env.EDITAL_ID;
const userId = getArg('--user-id') || process.env.USER_ID;
const maxTopicsPerEdital = Number(getArg('--max-topics-per-edital') || process.env.MAX_TOPICS_PER_EDITAL || '600');
const maxTotalTopics = Number(getArg('--max-total-topics') || process.env.MAX_TOTAL_TOPICS || '800');
const maxTotalQuestions = Number(getArg('--max-total-questions') || process.env.MAX_TOTAL_QUESTIONS || '');
const maxTopicsQuestions = Number(getArg('--max-topics-questions') || process.env.MAX_TOPICS_QUESTIONS || '');
const maxPerTopic = Number(getArg('--max-per-topic') || process.env.MAX_PER_TOPIC || '');

if (!editalId || !userId) {
  console.error('Missing --edital-id and --user-id');
  process.exit(1);
}

async function main() {
  const dropsResult = await generateDropsFromEditais({
    editalId,
    maxTopicsPerEdital: Number.isFinite(maxTopicsPerEdital) ? maxTopicsPerEdital : 600,
    maxTotalTopics: Number.isFinite(maxTotalTopics) ? maxTotalTopics : 800,
  });

  await generateAutoFormacao({ editalId, userId, force: true });

  const questionsResult = await generateQuestionsForEdital({
    editalId,
    userId,
    maxTotalQuestions: Number.isFinite(maxTotalQuestions) ? maxTotalQuestions : undefined,
    maxTopics: Number.isFinite(maxTopicsQuestions) ? maxTopicsQuestions : undefined,
    maxPerTopic: Number.isFinite(maxPerTopic) ? maxPerTopic : undefined,
    status: 'active',
  });

  console.log(JSON.stringify({ drops: dropsResult, questions: questionsResult }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
