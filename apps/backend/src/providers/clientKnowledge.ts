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

  // Brand Voice DNA — saved from Analytics tab
  const brandVoiceDna = profile.brand_voice;
  if (brandVoiceDna && typeof brandVoiceDna === 'object') {
    if (brandVoiceDna.personality) notes.push(`Personalidade da marca: ${brandVoiceDna.personality}`);
    const dnaTonerr = normalizeList(brandVoiceDna.tone);
    if (dnaTonerr.length) notes.push(`Tom de voz (DNA): ${dnaTonerr.join(', ')}`);
    const dnaPreferred = normalizeList(brandVoiceDna.vocabulary?.preferred);
    if (dnaPreferred.length) notes.push(`Vocabulário preferido: ${dnaPreferred.join(', ')}`);
    const dnaAvoid = normalizeList(brandVoiceDna.vocabulary?.avoid);
    if (dnaAvoid.length) notes.push(`Vocabulário a evitar: ${dnaAvoid.join(', ')}`);
    const dnaDos = normalizeList(brandVoiceDna.dos);
    if (dnaDos.length) notes.push(`Práticas recomendadas: ${dnaDos.join(' • ')}`);
    const dnaDonts = normalizeList(brandVoiceDna.donts);
    if (dnaDonts.length) notes.push(`Práticas a evitar: ${dnaDonts.join(' • ')}`);
    if (brandVoiceDna.brand_promise) notes.push(`Promessa central da marca: ${brandVoiceDna.brand_promise}`);
    const contentThemes = normalizeList(brandVoiceDna.content_themes);
    if (contentThemes.length) notes.push(`Temas de conteúdo: ${contentThemes.join(', ')}`);
  }

  // Rejection Patterns — aggregated from rejected copy reasons via AI analysis
  const rejectionPatterns = normalizeList(profile.rejection_patterns);
  if (rejectionPatterns.length) {
    notes.push(`Padrões de rejeição históricos deste cliente (EVITAR): ${rejectionPatterns.join(' | ')}`);
  }

  // Perfil criativo detalhado — campos de direção editorial
  if (profile.personality_traits) notes.push(`Traços de personalidade da marca: ${profile.personality_traits}`);
  if (profile.formality_level) notes.push(`Nível de formalidade: ${profile.formality_level}`);
  if (profile.emoji_usage) notes.push(`Política de uso de emojis: ${profile.emoji_usage}`);
  const contentMix = normalizeList(profile.content_mix);
  if (contentMix.length) notes.push(`Mix de conteúdo: ${contentMix.join(', ')}`);
  const strategicDates = normalizeList(profile.strategic_dates);
  if (strategicDates.length) notes.push(`Datas estratégicas da marca: ${strategicDates.join(' | ')}`);
  const competitorsList = normalizeList(intelligence?.competitors);
  if (competitorsList.length) notes.push(`Concorrentes (NÃO mencionar positivamente): ${competitorsList.join(', ')}`);

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

  // Prefer rich AI-generated tone description from enrichment (voice section)
  // over the preset enum → TONE_LABELS mapping
  const toneKey = String(profile.tone_profile || '').toLowerCase();
  const toneDescription =
    (typeof profile.tone_description === 'string' && profile.tone_description.trim()) ||
    TONE_LABELS[toneKey] ||
    profile.tone_profile ||
    'equilibrado';

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
