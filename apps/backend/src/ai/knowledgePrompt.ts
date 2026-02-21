import type { ClientKnowledge } from '../providers/contracts';

const normalizeList = (value?: string[]) =>
  Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];

const formatSocials = (socials?: Record<string, string>) => {
  const pairs = Object.entries(socials || {})
    .map(([key, val]) => [key, String(val || '').trim()])
    .filter(([, val]) => val);
  if (!pairs.length) return '';
  return pairs.map(([key, val]) => `${key}: ${val}`).join(' | ');
};

export function buildClientKnowledgeBlock(knowledge?: ClientKnowledge | null) {
  if (!knowledge) return '';
  const lines: string[] = [];

  // ── Tom de voz — destacado no topo para orientar toda a geração ──────────
  const toneDesc = knowledge.tone?.description;
  if (toneDesc) {
    lines.push(`TOM DE VOZ OBRIGATÓRIO: ${toneDesc}`);
  }

  // ── Base de conhecimento do cliente ─────────────────────────────────────
  const notes = normalizeList(knowledge.notes);
  if (notes.length) {
    lines.push('BASE DO CLIENTE:');
    notes.forEach((note) => lines.push(`- ${note}`));
  }

  // ── Compliance — restrições absolutas (aparecem com destaque) ───────────
  const forbiddenClaims = normalizeList(knowledge.compliance?.forbidden_claims);
  if (forbiddenClaims.length) {
    lines.push(`AFIRMAÇÕES E TERMOS PROIBIDOS — NUNCA USE NAS COPIES: ${forbiddenClaims.join(' | ')}`);
  }

  // ── Operacional ──────────────────────────────────────────────────────────
  const mustMentions = normalizeList(knowledge.must_mentions);
  if (mustMentions.length) lines.push(`Menções obrigatórias: ${mustMentions.join(', ')}`);

  const approvedTerms = normalizeList(knowledge.approved_terms);
  if (approvedTerms.length) lines.push(`Termos aprovados: ${approvedTerms.join(', ')}`);

  const hashtags = normalizeList(knowledge.hashtags);
  if (hashtags.length) lines.push(`Hashtags oficiais: ${hashtags.join(', ')}`);

  const socialLine = formatSocials(knowledge.social_profiles);
  if (socialLine) lines.push(`Redes sociais: ${socialLine}`);

  const tags = normalizeList(knowledge.tags);
  if (tags.length) lines.push(`Tags/palavras-chave: ${tags.join(', ')}`);

  return lines.join('\n');
}
