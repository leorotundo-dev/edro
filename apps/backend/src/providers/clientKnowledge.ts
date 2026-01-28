import type { ClientKnowledge } from './contracts';

type ClientRow = {
  id?: string;
  name?: string;
  segment_primary?: string | null;
  segment_secondary?: string[] | null;
  profile?: Record<string, any> | null;
};

const TONE_LABELS: Record<string, string> = {
  conservative: 'conservador, seguro e institucional',
  balanced: 'equilibrado, claro e confiável',
  bold: 'ousado, criativo e direto',
};

const normalizeList = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const formatSocials = (socials: Record<string, any>) => {
  const pairs = Object.entries(socials || {})
    .map(([key, val]) => [key, String(val || '').trim()])
    .filter(([, val]) => val);
  if (!pairs.length) return '';
  return pairs
    .map(([key, val]) => `${key}: ${val}`)
    .join(' | ');
};

export function buildClientKnowledgeFromRow(row: ClientRow | null): ClientKnowledge {
  if (!row) return { notes: [], tags: [] };

  const profile = row.profile || {};
  const knowledge = profile.knowledge_base || {};
  const socials = knowledge.social_profiles || knowledge.socials || {};

  const notes: string[] = [];
  if (knowledge.website) notes.push(`Site: ${knowledge.website}`);
  if (knowledge.description) notes.push(`Descrição: ${knowledge.description}`);
  if (knowledge.audience) notes.push(`Público-alvo: ${knowledge.audience}`);
  if (knowledge.brand_promise) notes.push(`Proposta de valor: ${knowledge.brand_promise}`);
  if (knowledge.differentiators) notes.push(`Diferenciais: ${knowledge.differentiators}`);

  const mustMentions = normalizeList(knowledge.must_mentions);
  const approvedTerms = normalizeList(knowledge.approved_terms);
  const hashtags = normalizeList(knowledge.hashtags);

  const socialLine = formatSocials(socials);
  if (socialLine) notes.push(`Redes sociais: ${socialLine}`);

  if (knowledge.notes) notes.push(`Observações: ${knowledge.notes}`);
  if (profile.risk_tolerance) notes.push(`Tolerância a risco: ${profile.risk_tolerance}`);

  const tags = new Set<string>();
  normalizeList(profile.keywords).forEach((tag) => tags.add(tag));
  normalizeList(profile.pillars).forEach((tag) => tags.add(tag));
  hashtags.forEach((tag) => tags.add(tag));
  approvedTerms.forEach((tag) => tags.add(tag));
  if (row.segment_primary) tags.add(String(row.segment_primary));
  normalizeList(row.segment_secondary).forEach((tag) => tags.add(tag));

  const toneKey = String(profile.tone_profile || '').toLowerCase();
  const toneDescription = TONE_LABELS[toneKey] || profile.tone_profile || 'equilibrado';

  return {
    tone: { description: toneDescription },
    compliance: {
      forbidden_claims: normalizeList(knowledge.forbidden_claims),
    },
    notes,
    tags: Array.from(tags),
    must_mentions: mustMentions,
    approved_terms: approvedTerms,
    hashtags,
    social_profiles: Object.keys(socials || {}).length ? socials : undefined,
    website: knowledge.website,
    audience: knowledge.audience,
    brand_promise: knowledge.brand_promise,
    differentiators: knowledge.differentiators,
    description: knowledge.description,
  };
}
