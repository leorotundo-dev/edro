type Complexity = 's' | 'm' | 'l';

const ESTIMATE_MATRIX: Record<string, Record<Complexity, number>> = {
  briefing: { s: 30, m: 60, l: 120 },
  copy: { s: 30, m: 90, l: 180 },
  design_static: { s: 60, m: 120, l: 240 },
  design_carousel: { s: 120, m: 240, l: 360 },
  video_edit: { s: 120, m: 360, l: 720 },
  campaign: { s: 180, m: 480, l: 960 },
  meeting: { s: 30, m: 60, l: 120 },
  approval: { s: 15, m: 30, l: 60 },
  publication: { s: 15, m: 30, l: 60 },
  urgent_request: { s: 60, m: 180, l: 360 },
};

const CHANNEL_MULTIPLIER: Record<string, number> = {
  instagram: 1,
  linkedin: 1,
  stories: 0.85,
  reels: 1.25,
  tiktok: 1.35,
  youtube: 1.4,
  blog: 1.3,
  site: 1.2,
  whatsapp: 0.8,
  email: 0.9,
};

export function estimateMinutes(input: {
  jobType: string;
  complexity: string;
  channel?: string | null;
}) {
  const jobType = String(input.jobType || '').trim();
  const complexity = String(input.complexity || 'm').toLowerCase() as Complexity;
  const channel = String(input.channel || '').trim().toLowerCase();

  const baseByType = ESTIMATE_MATRIX[jobType] || ESTIMATE_MATRIX.copy;
  const base = baseByType[complexity] ?? baseByType.m;
  const channelMultiplier = channel ? CHANNEL_MULTIPLIER[channel] ?? 1 : 1;

  return Math.max(15, Math.round(base * channelMultiplier));
}
