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
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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
  const intelligence = knowledge.intelligence?.summary || knowledge.intelligence || null;
  const summaryText = knowledge.intelligence?.summary_text || intelligence?.summary_text;
  if (summaryText) {
    notes.push(`Resumo IA: ${summaryText}`);
  }
  if (intelligence?.industry) notes.push(`Indústria: ${intelligence.industry}`);
  if (intelligence?.business) notes.push(`Negócio: ${intelligence.business}`);
  if (intelligence?.positioning) notes.push(`Posicionamento: ${intelligence.positioning}`);
  const territories = normalizeList(intelligence?.territories);
  if (territories.length) notes.push(`Territórios: ${territories.join(', ')}`);
  const channels = normalizeList(intelligence?.channels);
  if (channels.length) notes.push(`Canais: ${channels.join(', ')}`);
  const products = normalizeList(intelligence?.products);
  if (products.length) notes.push(`Produtos: ${products.join(', ')}`);
  const services = normalizeList(intelligence?.services);
  if (services.length) notes.push(`Serviços: ${services.join(', ')}`);
  const personas = normalizeList(intelligence?.personas);
  if (personas.length) notes.push(`Personas: ${personas.join(', ')}`);
  const qualitative = normalizeList(intelligence?.qualitative_insights);
  if (qualitative.length) notes.push(`Insights qualitativos: ${qualitative.join(' • ')}`);
  const quantitative = normalizeList(intelligence?.quantitative_signals);
  if (quantitative.length) notes.push(`Sinais quantitativos: ${quantitative.join(' • ')}`);
  const opportunities = normalizeList(intelligence?.opportunities);
  if (opportunities.length) notes.push(`Oportunidades: ${opportunities.join(' • ')}`);
  const risks = normalizeList(intelligence?.risks);
  if (risks.length) notes.push(`Riscos: ${risks.join(' • ')}`);

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
  normalizeList(intelligence?.keywords).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.pillars).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.products).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.services).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.channels).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.personas).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.territories).forEach((tag) => tags.add(tag));
  normalizeList(intelligence?.competitors).forEach((tag) => tags.add(tag));
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
