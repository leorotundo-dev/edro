import type { JarvisExecutionPolicy } from './jarvisExecutionService';

export type JarvisActionSimulation = {
  pass: boolean;
  overall: number;
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
  concerns: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function simulateJarvisAction(params: {
  toolName: string;
  category?: string | null;
  executionPolicy?: JarvisExecutionPolicy | null;
  explicitConfirmation?: boolean;
}) {
  const category = String(params.category || 'read');
  const concerns: string[] = [];
  let overall = category === 'read' ? 96 : 78;

  if (!params.executionPolicy) {
    return {
      pass: true,
      overall,
      risk: 'low',
      recommendation: 'Sem contexto de execução; seguir com fallback conservador.',
      concerns,
    } satisfies JarvisActionSimulation;
  }

  if (category === 'publishing' || category === 'external') {
    overall -= 12;
    concerns.push('Ação com impacto externo real.');
  }
  if (category === 'destructive' || params.toolName.includes('delete') || params.toolName.includes('cancel')) {
    overall -= 18;
    concerns.push('Ação destrutiva ou reversível só com atrito.');
  }
  if (params.executionPolicy.confidence.band === 'medium') {
    overall -= 10;
    concerns.push('Confiança média exige revisão humana.');
  }
  if (params.executionPolicy.confidence.band === 'low') {
    overall -= 22;
    concerns.push('Confiança baixa para agir automaticamente.');
  }
  if (!params.explicitConfirmation && params.executionPolicy.requiresExplicitConfirmation) {
    overall -= 14;
    concerns.push('Falta confirmação explícita para este contexto.');
  }
  if (params.executionPolicy.taskType === 'system_repair' || params.executionPolicy.taskType === 'scheduling') {
    overall -= 8;
    concerns.push('Tarefa sensível no plano operacional.');
  }

  overall = clamp(overall);
  const risk: JarvisActionSimulation['risk'] = overall >= 80 ? 'low' : overall >= 60 ? 'medium' : 'high';
  const pass = overall >= 60 || params.explicitConfirmation === true;
  const recommendation = pass
    ? 'Ação liberada pela simulação operacional.'
    : 'Ação bloqueada pela simulação; confirmar ou escalar antes de executar.';

  return { pass, overall, risk, recommendation, concerns: concerns.slice(0, 5) } satisfies JarvisActionSimulation;
}
