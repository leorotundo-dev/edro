import { buildClientKnowledgeBase } from '../services/clientKnowledgeBaseService';
import { generateAndSelectBestCopy } from '../services/ai/copyService';
import { readFileSync } from 'fs';
import path from 'path';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

type EvalCase = {
  label?: string;
  tenantId?: string;
  clientId?: string;
  prompt: string;
  platform?: string | null;
  objective?: string | null;
  format?: string | null;
  momento?: 'problema' | 'solucao' | 'decisao' | null;
  instructions?: string | null;
};

async function runCase(base: {
  tenantId: string;
  clientId: string;
}, item: EvalCase) {
  const tenantId = item.tenantId || base.tenantId;
  const clientId = item.clientId || base.clientId;
  const prompt = item.prompt;
  const platform = item.platform || null;
  const objective = item.objective || null;
  const format = item.format || null;
  const momento = item.momento || null;
  const instructions = item.instructions || null;

  const knowledgeBase = await buildClientKnowledgeBase({
    tenantId,
    clientId,
    question: [prompt, objective, instructions].filter(Boolean).join(' '),
    daysBack: 60,
    limitDocuments: 6,
    intent: 'copy',
    platform,
    objective,
    format,
    momento,
  });

  const result = await generateAndSelectBestCopy({
    prompt,
    knowledgeBlock: knowledgeBase.knowledge_base_block,
    instructions: instructions || undefined,
    tenantId,
    clientId,
    platform,
    momento,
    usageContext: { tenant_id: tenantId, feature: 'copy_evaluation_harness' },
  });

  return {
    label: item.label || prompt.slice(0, 60),
    client_id: clientId,
    intent_profile: knowledgeBase.intent_profile,
    copy_policy: knowledgeBase.copy_policy,
    model: result.model,
    simulation_id: result.simulation_id,
    winner_index: result.winner_index,
    winner_resonance: result.winner_resonance,
    prediction_confidence_label: result.prediction_confidence_label,
    critic_gate: result.payload?.critic_gate || null,
    preview: String(result.output || '').slice(0, 1200),
  };
}

async function main() {
  const tenantId = readArg('--tenant');
  const clientId = readArg('--client');
  const prompt = readArg('--prompt');
  const suitePath = readArg('--suite');

  if (!tenantId || !clientId || (!prompt && !suitePath)) {
    throw new Error('Uso: pnpm --filter @edro/backend copy:evaluate -- --tenant <uuid> --client <uuid> --prompt "..." [--platform instagram] [--objective "..."] [--format "..."] [--momento problema|solucao|decisao] [--instructions "..."] OU --suite <arquivo.json>');
  }

  const platform = readArg('--platform');
  const objective = readArg('--objective');
  const format = readArg('--format');
  const momento = readArg('--momento') as 'problema' | 'solucao' | 'decisao' | null;
  const instructions = readArg('--instructions');

  if (suitePath) {
    const absolutePath = path.isAbsolute(suitePath) ? suitePath : path.resolve(process.cwd(), suitePath);
    const suite = JSON.parse(readFileSync(absolutePath, 'utf8')) as EvalCase[];
    if (!Array.isArray(suite) || !suite.length) {
      throw new Error('Suite vazia ou inválida.');
    }
    const results = [];
    for (const item of suite) {
      results.push(await runCase({ tenantId, clientId }, item));
    }
    const total = results.length;
    const avgResonance = total ? results.reduce((sum, item) => sum + Number(item.winner_resonance || 0), 0) / total : 0;
    const criticScores = results.map((item) => Number(item.critic_gate?.overall || 0)).filter((value) => value > 0);
    const avgCritic = criticScores.length ? criticScores.reduce((sum, value) => sum + value, 0) / criticScores.length : null;
    const revisedRate = total
      ? results.filter((item) => item.critic_gate?.revised_applied === true).length / total
      : 0;
    const passRate = total
      ? results.filter((item) => item.critic_gate?.pass !== false).length / total
      : 0;

    process.stdout.write(`${JSON.stringify({
      suite_path: absolutePath,
      total_cases: total,
      avg_winner_resonance: Number(avgResonance.toFixed(2)),
      avg_critic_overall: avgCritic != null ? Number(avgCritic.toFixed(2)) : null,
      critic_pass_rate: Number(passRate.toFixed(3)),
      critic_revision_rate: Number(revisedRate.toFixed(3)),
      cases: results,
    }, null, 2)}\n`);
    return;
  }

  const output = await runCase(
    { tenantId, clientId },
    {
      prompt: prompt!,
      platform,
      objective,
      format,
      momento,
      instructions,
    },
  );

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error('[copy:evaluate]', error?.message || error);
  process.exit(1);
});
