function daysUntil(deadline?: string | Date | null) {
  if (!deadline) return null;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  return diffMs / 86400000;
}

function scoreUrgency(deadline?: string | Date | null) {
  const days = daysUntil(deadline);
  if (days === null) return 0;
  if (days <= 0) return 5;
  if (days <= 1) return 4;
  if (days <= 3) return 3;
  if (days <= 7) return 2;
  return 1;
}

function toBand(score: number) {
  if (score >= 18) return 'p0';
  if (score >= 14) return 'p1';
  if (score >= 10) return 'p2';
  if (score >= 6) return 'p3';
  return 'p4';
}

export function calculatePriority(input: {
  deadlineAt?: string | Date | null;
  impactLevel?: number | null;
  dependencyLevel?: number | null;
  clientWeight?: number | null;
  isUrgent?: boolean | null;
  intakeComplete?: boolean | null;
  blocked?: boolean | null;
}) {
  const sla = input.deadlineAt ? 4 : 1;
  const urgency = scoreUrgency(input.deadlineAt);
  const impact = Math.max(0, Math.min(5, Number(input.impactLevel ?? 2)));
  const dependency = Math.max(0, Math.min(5, Number(input.dependencyLevel ?? 2)));
  const clientWeight = Math.max(1, Math.min(5, Number(input.clientWeight ?? 3)));

  let score = sla + urgency + impact + dependency + clientWeight;

  if (input.isUrgent) score += 2;
  if (input.intakeComplete === false) score -= 4;
  if (input.blocked) score -= 5;

  score = Math.max(0, Math.round(score));

  return {
    priorityScore: score,
    priorityBand: toBand(score),
  };
}
