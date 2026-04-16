import { readFileSync } from 'fs';
import path from 'path';
import { buildClientKnowledgeBase } from '../services/clientKnowledgeBaseService';
import { buildClientState } from '../services/jarvisDecisionEngine';
import {
  buildJarvisExecutionPolicy,
  buildJarvisExecutionPromptBlock,
  detectJarvisTaskType,
  resolveJarvisActorProfile,
  assessJarvisConfidence,
} from '../services/jarvisExecutionService';
import { buildJarvisRoutingDecision, detectJarvisIntent } from '../services/jarvisPolicyService';

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

type EvalCase = {
  label?: string;
  tenantId?: string;
  clientId?: string;
  role?: string | null;
  contextPage?: string | null;
  message: string;
};

async function runCase(base: { tenantId: string; clientId: string }, item: EvalCase) {
  const tenantId = item.tenantId || base.tenantId;
  const clientId = item.clientId || base.clientId;
  const intent = detectJarvisIntent(item.message, item.contextPage || undefined, undefined);
  const decision = buildJarvisRoutingDecision(intent);
  const taskType = detectJarvisTaskType({ message: item.message, intent });
  const actorProfile = resolveJarvisActorProfile({ role: item.role || null });
  const [knowledgeBase, clientState] = await Promise.all([
    buildClientKnowledgeBase({
      tenantId,
      clientId,
      question: item.message,
      daysBack: 60,
      limitDocuments: 6,
      intent: decision.route === 'operations' ? 'ops' : 'relationship',
    }),
    buildClientState(tenantId, clientId),
  ]);
  const confidence = assessJarvisConfidence({
    decision,
    taskType,
    actorProfile,
    knowledgeBase,
    clientState,
  });
  const policy = buildJarvisExecutionPolicy({
    decision,
    taskType,
    actorProfile,
    confidence,
  });

  return {
    label: item.label || item.message.slice(0, 60),
    tenant_id: tenantId,
    client_id: clientId,
    intent,
    route: decision.route,
    task_type: taskType,
    actor_profile: actorProfile,
    confidence,
    governance: knowledgeBase.governance,
    communication_radar: knowledgeBase.radar,
    packet_preview: buildJarvisExecutionPromptBlock(policy),
  };
}

async function main() {
  const tenantId = readArg('--tenant');
  const clientId = readArg('--client');
  const message = readArg('--message');
  const suitePath = readArg('--suite');
  const role = readArg('--role');
  const contextPage = readArg('--context-page');

  if (!tenantId || !clientId || (!message && !suitePath)) {
    throw new Error('Uso: pnpm --filter @edro/backend jarvis:evaluate -- --tenant <tenant> --client <client> --message \"...\" [--role manager] [--context-page /jobs] OU --suite <arquivo.json>');
  }

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
    const avgConfidence = total
      ? results.reduce((sum, item) => sum + Number(item.confidence?.score || 0), 0) / total
      : 0;
    const actRate = total ? results.filter((item) => item.confidence?.mode === 'act').length / total : 0;
    const escalateRate = total ? results.filter((item) => item.confidence?.mode === 'escalate').length / total : 0;

    process.stdout.write(`${JSON.stringify({
      suite_path: absolutePath,
      total_cases: total,
      avg_confidence: Number(avgConfidence.toFixed(3)),
      act_rate: Number(actRate.toFixed(3)),
      escalate_rate: Number(escalateRate.toFixed(3)),
      cases: results,
    }, null, 2)}\n`);
    return;
  }

  const output = await runCase({ tenantId, clientId }, { message: message!, role, contextPage });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error('[jarvis:evaluate]', error?.message || error);
  process.exit(1);
});
