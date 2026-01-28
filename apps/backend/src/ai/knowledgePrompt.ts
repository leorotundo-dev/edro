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
  const notes = normalizeList(knowledge.notes);
  if (notes.length) {
    lines.push('BASE DO CLIENTE:');
    notes.forEach((note) => lines.push(`- ${note}`));
  }
  const tags = normalizeList(knowledge.tags);
  if (tags.length) lines.push(`Tags/palavras-chave: ${tags.join(', ')}`);

  const mustMentions = normalizeList(knowledge.must_mentions);
  if (mustMentions.length) lines.push(`Menções obrigatórias: ${mustMentions.join(', ')}`);

  const approvedTerms = normalizeList(knowledge.approved_terms);
  if (approvedTerms.length) lines.push(`Termos aprovados: ${approvedTerms.join(', ')}`);

  const hashtags = normalizeList(knowledge.hashtags);
  if (hashtags.length) lines.push(`Hashtags oficiais: ${hashtags.join(', ')}`);

  const socialLine = formatSocials(knowledge.social_profiles);
  if (socialLine) lines.push(`Redes sociais: ${socialLine}`);

  return lines.join('\n');
}
