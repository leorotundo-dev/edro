import { readFileSync } from 'fs';
import path from 'path';
import {
  buildClientJarvisHistoricalBenchmark,
  evaluateJarvisCase,
  evaluateJarvisSuite,
  type JarvisEvalCase,
} from '../services/jarvisEvaluationService';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const tenantId = readArg('--tenant');
  const clientId = readArg('--client');
  const message = readArg('--message');
  const suitePath = readArg('--suite');
  const historySuite = process.argv.includes('--history-suite');
  const role = readArg('--role');
  const contextPage = readArg('--context-page');
  const daysBack = Number(readArg('--days-back') || 90);
  const limit = Number(readArg('--limit') || 8);
  const mix = readArg('--mix') as 'balanced' | 'failure_focus' | 'recent' | null;

  if (!tenantId || !clientId || (!message && !suitePath && !historySuite)) {
    throw new Error('Uso: pnpm --filter @edro/backend jarvis:evaluate -- --tenant <tenant> --client <client> --message \"...\" [--role manager] [--context-page /jobs] OU --suite <arquivo.json> OU --history-suite [--days-back 90] [--limit 8] [--mix balanced|failure_focus|recent]');
  }

  if (suitePath) {
    const absolutePath = path.isAbsolute(suitePath) ? suitePath : path.resolve(process.cwd(), suitePath);
    const suite = JSON.parse(readFileSync(absolutePath, 'utf8')) as JarvisEvalCase[];
    if (!Array.isArray(suite) || !suite.length) {
      throw new Error('Suite vazia ou inválida.');
    }
    const results = await evaluateJarvisSuite({ tenantId, clientId }, suite);
    process.stdout.write(`${JSON.stringify({
      suite_path: absolutePath,
      ...results,
    }, null, 2)}\n`);
    return;
  }

  if (historySuite) {
    const results = await buildClientJarvisHistoricalBenchmark({
      tenantId,
      clientId,
      daysBack,
      limit,
      mix: mix || 'balanced',
    });
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }

  const output = await evaluateJarvisCase({ tenantId, clientId }, { message: message!, role, contextPage });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error('[jarvis:evaluate]', error?.message || error);
  process.exit(1);
});
