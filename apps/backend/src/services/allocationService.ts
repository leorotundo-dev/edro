/**
 * allocationService — Smart allocation engine v2
 *
 * Scores every active freelancer against a job's requirements and returns
 * ranked proposals with estimated availability and completion time.
 * Also tracks punctuality + approval scores after a job is finished.
 *
 * Scoring dimensions (raw → shifted to 0-100):
 *   skillMatch         +40 primary / +15 secondary job-type skill / -30 missing required
 *   platformFit        +15 channel expertise match / +5 partial match
 *   aiToolsBonus       +10 max (3 per AI tool) for content/creative jobs
 *   experienceFit      +25 senior on high / -20 junior on high
 *   capacityAvailable  0-20 based on remaining weekly capacity
 *   loadPenalty        0 / -15 near limit / -40 at limit
 *   historicalPerf     from EMA punctuality + approval (up to ±15 pts)
 */

import { query } from '../db';

// ── Constants ────────────────────────────────────────────────────────────────

// DB complexity is 's' | 'm' | 'l'
const COMPLEXITY_MAP: Record<string, string> = { s: 'low', m: 'medium', l: 'high' };

// Secondary skill implied by job type (complement to required_skill)
const JOB_TYPE_SKILL: Record<string, string> = {
  copy: 'copy',
  design_static: 'design',
  design_carousel: 'design',
  design_post: 'design',
  design_stories: 'design',
  reels: 'video',
  stories: 'social',
  video: 'video',
  campaign: 'estrategia',
  email: 'copy',
  blog: 'copy',
};

// Job types where AI tools add real value
const AI_BENEFIT_TYPES = new Set([
  'copy', 'campaign', 'design_static', 'design_carousel', 'design_post',
  'design_stories', 'stories', 'reels', 'video', 'email', 'blog',
]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  skillMatch: number;
  platformFit: number;
  aiToolsBonus: number;
  experienceFit: number;
  capacityAvailable: number;
  loadPenalty: number;
  historicalPerformance: number;
}

export interface AllocationProposal {
  freelancerId: string;
  name: string;
  specialty: string | null;
  experienceLevel: string | null;
  score: number; // 0-100 capped
  scoreBreakdown: ScoreBreakdown;
  estimatedMinutes: number;
  estimatedAvailableAt: string; // ISO
  estimatedCompletionAt: string; // ISO
  currentActiveJobs: number;
  maxConcurrentJobs: number;
  punctualityScore: number | null;
  approvalRate: number | null;
  jobsCompleted: number;
  rationale: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a job channel to the same keys used in platform_expertise. */
function normalizeChannel(channel: string | null): string | null {
  if (!channel) return null;
  const c = channel.toLowerCase().trim();
  if (c.includes('instagram') || c === 'ig') return 'instagram';
  if (c.includes('tiktok') || c === 'tt') return 'tiktok';
  if (c.includes('linkedin') || c === 'li') return 'linkedin';
  if (c.includes('youtube') || c === 'yt') return 'youtube';
  if (c.includes('facebook') || c === 'fb') return 'facebook';
  if (c.includes('pinterest')) return 'pinterest';
  if (c.includes('twitter') || c.includes('x ') || c === 'x') return 'twitter';
  if (c.includes('threads')) return 'threads';
  return c;
}

const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

/**
 * Returns when this freelancer will next be available to start work.
 * Respects max_concurrent_jobs and available_days.
 */
function estimateAvailableAt(fl: any, now: Date): Date {
  const maxConcurrent = fl.max_concurrent_jobs ?? 3;
  if ((fl.active_jobs ?? 0) < maxConcurrent) return now; // available now

  const daysDelay = (fl.active_jobs - maxConcurrent + 1) * 2;
  let d = new Date(now.getTime() + daysDelay * 24 * 60 * 60 * 1000);

  // Advance past non-working days (skip up to 14 days to prevent infinite loop)
  const workingDays: string[] = fl.available_days?.length > 0
    ? fl.available_days
    : ['mon', 'tue', 'wed', 'thu', 'fri'];
  for (let i = 0; i < 14; i++) {
    if (workingDays.includes(DAY_MAP[d.getDay()])) break;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  return d;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreCandidate(fl: any, job: any): ScoreBreakdown {
  const skills: string[] = fl.skills ?? [];
  const aiTools: string[] = fl.ai_tools ?? [];
  const platformExpertise: string[] = fl.platform_expertise ?? [];
  const level: string = fl.experience_level ?? 'mid';
  const complexity: string = COMPLEXITY_MAP[job.complexity ?? 'm'] ?? 'medium';
  const maxConcurrent = fl.max_concurrent_jobs ?? 3;
  const activeJobs = fl.active_jobs ?? 0;
  const weeklyCapMins = (fl.weekly_capacity_hours ?? 20) * 60;
  const activeMins = fl.active_minutes_this_week ?? 0;

  // ── Skill match ──
  let skillMatch = 0;
  if (job.required_skill) {
    skillMatch = skills.includes(job.required_skill) ? 40 : -30;
  }
  const secondarySkill = JOB_TYPE_SKILL[job.job_type ?? ''];
  if (secondarySkill && secondarySkill !== job.required_skill && skills.includes(secondarySkill)) {
    skillMatch += 15;
  }

  // ── Platform expertise ──
  let platformFit = 0;
  const normalizedChannel = normalizeChannel(job.channel);
  if (normalizedChannel) {
    if (platformExpertise.includes(normalizedChannel)) platformFit = 15;
    else if (platformExpertise.length > 0) platformFit = 5;
  }

  // ── AI tools bonus ──
  let aiToolsBonus = 0;
  if (AI_BENEFIT_TYPES.has(job.job_type ?? '') && aiTools.length > 0) {
    aiToolsBonus = Math.min(10, aiTools.length * 3);
  }

  // ── Experience vs complexity ──
  let experienceFit = 5;
  if (complexity === 'high') {
    if (level === 'senior') experienceFit = 25;
    else if (level === 'mid') experienceFit = 0;
    else experienceFit = -20;
  } else if (complexity === 'medium') {
    if (level === 'junior') experienceFit = -5;
    else experienceFit = 10;
  }

  // ── Remaining capacity (0-20 pts) ──
  const usedRatio = weeklyCapMins > 0 ? Math.min(1, activeMins / weeklyCapMins) : 0.5;
  const capacityAvailable = Math.round(20 * (1 - usedRatio));

  // ── Concurrent load penalty ──
  let loadPenalty = 0;
  if (activeJobs >= maxConcurrent) loadPenalty = -40;
  else if (activeJobs >= maxConcurrent - 1) loadPenalty = -15;

  // ── Historical performance (EMA) — up to ±15 pts ──
  let historicalPerformance = 0;
  if (fl.punctuality_score !== null && fl.punctuality_score !== undefined) {
    historicalPerformance += Math.round((Number(fl.punctuality_score) - 70) * 0.25);
  }
  if (fl.approval_rate !== null && fl.approval_rate !== undefined) {
    historicalPerformance += Math.round((Number(fl.approval_rate) - 70) * 0.2);
  }

  return { skillMatch, platformFit, aiToolsBonus, experienceFit, capacityAvailable, loadPenalty, historicalPerformance };
}

function buildRationale(fl: any, job: any, bd: ScoreBreakdown, remainingMins: number, estMins: number): string {
  const parts: string[] = [];

  if (bd.skillMatch >= 40) parts.push(`skill "${job.required_skill}" ✓`);
  else if (bd.skillMatch > 40) parts.push(`skill "${job.required_skill}" ✓ + secundária`);
  else if (bd.skillMatch < 0) parts.push(`sem "${job.required_skill}" no perfil`);
  else if (bd.skillMatch > 0) parts.push(`skill secundária compatível`);

  if (bd.platformFit >= 15) parts.push(`plataforma ${job.channel} ✓`);
  if (bd.aiToolsBonus > 0) parts.push(`usa IA (+${bd.aiToolsBonus})`);

  if (bd.loadPenalty <= -40) parts.push(`lotado (${fl.active_jobs}/${fl.max_concurrent_jobs ?? 3} jobs)`);
  else parts.push(`${fl.active_jobs ?? 0} jobs ativos`);

  if (fl.experience_level) {
    const levelLabel: Record<string, string> = { junior: 'Jr', mid: 'Pl', senior: 'Sr' };
    parts.push(levelLabel[fl.experience_level] ?? fl.experience_level);
  }

  if (fl.punctuality_score !== null && fl.punctuality_score !== undefined) {
    parts.push(`pontualidade ${Math.round(Number(fl.punctuality_score))}%`);
  }
  if (fl.approval_rate !== null && fl.approval_rate !== undefined) {
    parts.push(`aprovação ${Math.round(Number(fl.approval_rate))}%`);
  }

  const freeH = Math.round(remainingMins / 60);
  if (freeH > 0) parts.push(`~${freeH}h livres`);
  if (estMins > 0) parts.push(`est. ${estMins >= 60 ? `${Math.round(estMins / 60)}h` : `${estMins}min`}`);

  return parts.join(' · ');
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function proposeAllocations(
  tenantId: string,
  jobId: string,
): Promise<AllocationProposal[]> {
  const { rows: jobRows } = await query<any>(
    `SELECT required_skill, job_type, complexity, channel, deadline_at, estimated_minutes
       FROM jobs
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1`,
    [jobId, tenantId],
  );
  if (!jobRows.length) throw new Error('job_not_found');
  const job = jobRows[0];

  const { rows: freelancers } = await query<any>(
    `SELECT
       fp.id,
       fp.display_name,
       fp.specialty,
       fp.skills,
       fp.tools,
       fp.ai_tools,
       fp.experience_level,
       fp.max_concurrent_jobs,
       fp.weekly_capacity_hours,
       fp.available_days,
       fp.available_hours_start,
       fp.available_hours_end,
       fp.punctuality_score,
       fp.approval_rate,
       fp.jobs_completed,
       fp.platform_expertise,
       fp.unavailable_until,
       tu.user_id,
       COALESCE(wl.active_jobs, 0)         AS active_jobs,
       COALESCE(wl.active_minutes, 0)      AS active_minutes_this_week
     FROM freelancer_profiles fp
     JOIN tenant_users tu ON tu.user_id = fp.user_id AND tu.tenant_id = $1
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int                                  AS active_jobs,
         COALESCE(SUM(j.estimated_minutes), 0)::int    AS active_minutes
       FROM jobs j
      WHERE j.tenant_id = $1
        AND j.owner_id  = fp.user_id
        AND j.status NOT IN ('done', 'published', 'archived', 'cancelled')
     ) wl ON true
    WHERE fp.is_active = true
      AND (fp.unavailable_until IS NULL OR fp.unavailable_until < CURRENT_DATE)`,
    [tenantId],
  );

  if (!freelancers.length) return [];

  const now = new Date();
  const estMins: number = job.estimated_minutes ?? 120;
  const proposals: AllocationProposal[] = [];

  for (const fl of freelancers) {
    const bd = scoreCandidate(fl, job);
    const totalRaw =
      bd.skillMatch + bd.platformFit + bd.aiToolsBonus +
      bd.experienceFit + bd.capacityAvailable + bd.loadPenalty + bd.historicalPerformance;

    // Soft floor: filter only truly incompatible candidates (raw < -15)
    if (totalRaw < -15) continue;

    // Shift baseline: neutral candidate (zero extra signals) lands around 50
    const score = Math.round(Math.max(1, Math.min(100, totalRaw + 45)));

    const weeklyCapMins = (fl.weekly_capacity_hours ?? 20) * 60;
    const activeMins = fl.active_minutes_this_week ?? 0;
    const remainingMins = Math.max(0, weeklyCapMins - activeMins);

    const availableAt = estimateAvailableAt(fl, now);
    const completionAt = new Date(availableAt.getTime() + estMins * 60 * 1000);

    proposals.push({
      freelancerId: fl.id,
      name: fl.display_name,
      specialty: fl.specialty,
      experienceLevel: fl.experience_level,
      score,
      scoreBreakdown: bd,
      estimatedMinutes: estMins,
      estimatedAvailableAt: availableAt.toISOString(),
      estimatedCompletionAt: completionAt.toISOString(),
      currentActiveJobs: fl.active_jobs,
      maxConcurrentJobs: fl.max_concurrent_jobs ?? 3,
      punctualityScore: fl.punctuality_score !== null ? Number(fl.punctuality_score) : null,
      approvalRate: fl.approval_rate !== null ? Number(fl.approval_rate) : null,
      jobsCompleted: fl.jobs_completed ?? 0,
      rationale: buildRationale(fl, job, bd, remainingMins, estMins),
    });
  }

  return proposals.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ── Score tracking ─────────────────────────────────────────────────────────────

export async function updateFreelancerScores(
  tenantId: string,
  jobId: string,
  outcome: { wasLate: boolean; wasRevised: boolean },
): Promise<void> {
  const { rows } = await query<{ owner_id: string }>(
    `SELECT owner_id FROM jobs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [jobId, tenantId],
  );
  if (!rows[0]?.owner_id) return;

  const punctualitySample = outcome.wasLate ? 0 : 100;
  const approvalSample = outcome.wasRevised ? 60 : 100;

  // Exponential moving average: 90% history / 10% new sample
  await query(
    `UPDATE freelancer_profiles
        SET jobs_completed    = jobs_completed + 1,
            jobs_late         = jobs_late + $2,
            jobs_revised      = jobs_revised + $3,
            punctuality_score = CASE
              WHEN punctuality_score IS NULL THEN $4
              ELSE ROUND((punctuality_score * 0.9 + $4 * 0.1)::numeric, 2)
            END,
            approval_rate = CASE
              WHEN approval_rate IS NULL THEN $5
              ELSE ROUND((approval_rate * 0.9 + $5 * 0.1)::numeric, 2)
            END,
            updated_at = now()
      WHERE user_id = $1`,
    [
      rows[0].owner_id,
      outcome.wasLate ? 1 : 0,
      outcome.wasRevised ? 1 : 0,
      punctualitySample,
      approvalSample,
    ],
  );
}
