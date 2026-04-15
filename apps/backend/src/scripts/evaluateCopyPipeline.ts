import { buildClientKnowledgeBase } from '../services/clientKnowledgeBaseService';
import { generateAndSelectBestCopy } from '../services/ai/copyService';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const tenantId = readArg('--tenant');
  const clientId = readArg('--client');
  const prompt = readArg('--prompt');

  if (!tenantId || !clientId || !prompt) {
    throw new Error('Uso: pnpm --filter @edro/backend copy:evaluate -- --tenant <uuid> --client <uuid> --prompt "..." [--platform instagram] [--objective "..."] [--format "..."] [--momento problema|solucao|decisao] [--instructions "..."]');
  }

  const platform = readArg('--platform');
  const objective = readArg('--objective');
  const format = readArg('--format');
  const momento = readArg('--momento') as 'problema' | 'solucao' | 'decisao' | null;
  const instructions = readArg('--instructions');

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

  const output = {
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

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error('[copy:evaluate]', error?.message || error);
  process.exit(1);
});
