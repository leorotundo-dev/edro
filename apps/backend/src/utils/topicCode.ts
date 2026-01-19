const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

export const normalizeTopicPart = (value?: string | null): string => {
  if (!value) return '';
  const cleaned = normalizeWhitespace(String(value));
  if (!cleaned) return '';
  return removeDiacritics(cleaned);
};

export const buildTopicCode = (discipline?: string | null, subtopic?: string | null): string => {
  const disc = normalizeTopicPart(discipline);
  const topic = normalizeTopicPart(subtopic);
  if (disc && topic) return `${disc}::${topic}`;
  return disc || topic;
};

export const buildTopicCodeKey = (discipline?: string | null, subtopic?: string | null): string =>
  buildTopicCode(discipline, subtopic).toLowerCase();
