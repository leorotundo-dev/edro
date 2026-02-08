type ScoreInput = {
  title: string;
  summary?: string | null;
  content?: string | null;
  publishedAt?: Date | string | null;
  tags?: string[] | null;
};

export type ScoreResult = {
  score: number;
  matchedKeywords: string[];
  requiredMatches: string[];
  negativeHits: string[];
  relevanceFactors: {
    keywordMatch: number;
    pillarAlignment: number;
    recency: number;
    contentQuality: number;
    negativePenalty: number;
    requiredGate?: number;
    requiredHits?: number;
  };
  suggestedActions: string[];
};

const WEIGHTS = {
  keywordMatch: 0.4,
  pillarAlignment: 0.3,
  recency: 0.2,
  contentQuality: 0.1,
};

// Large client profiles can have dozens of keywords/pillars. Normalizing by the
// full list length makes scores artificially tiny (and the pipeline "looks
// dead" because nothing clears the relevance threshold). We instead saturate
// after a small number of hits so that 2-3 strong matches can be considered
// relevant regardless of list size.
const KEYWORD_HITS_SATURATION = 3;
const PILLAR_HITS_SATURATION = 2;

function normalizeList(values: string[]) {
  return values.map((value) => value.toLowerCase().trim()).filter(Boolean);
}

function extractText(input: ScoreInput) {
  return `${input.title || ''} ${input.summary || ''} ${input.content || ''}`.toLowerCase();
}

// ── Word-boundary matching ────────────────────────────────────

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a keyword respecting word boundaries.
 * - Multi-word phrases (e.g. "inteligencia artificial"): uses includes()
 *   because \b doesn't work well with accented Portuguese characters.
 * - Single words: uses regex with punctuation/whitespace boundaries.
 */
export function matchesWordBoundary(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  if (kw.includes(' ')) {
    return text.includes(kw);
  }
  const boundary = String.raw`(?:^|[\s.,;:!?()\[\]{}/\"'\-–—])`;
  const pattern = new RegExp(`${boundary}${escapeRegex(kw)}${boundary.replace('^', '$')}`, 'i');
  return pattern.test(` ${text} `);
}

// ── Scoring components ────────────────────────────────────────

function calculateKeywordMatch(text: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  let matchCount = 0;
  keywords.forEach((keyword) => {
    if (matchesWordBoundary(text, keyword)) matchCount += 1;
  });
  const denom = Math.max(1, Math.min(KEYWORD_HITS_SATURATION, keywords.length));
  return Math.min(1, matchCount / denom);
}

function calculatePillarAlignment(text: string, tags: string[], pillars: string[]): number {
  if (!pillars.length) return 0;
  let hits = 0;
  pillars.forEach((pillar) => {
    const inText = matchesWordBoundary(text, pillar);
    const inTags = tags.some((tag) => matchesWordBoundary(tag, pillar));
    if (inText || inTags) hits += 1;
  });
  const denom = Math.max(1, Math.min(PILLAR_HITS_SATURATION, pillars.length));
  return Math.min(1, hits / denom);
}

function calculateRecency(publishedAt?: Date | string | null) {
  if (!publishedAt) return 0.1;
  const date = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 0.1;
  const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays <= 1) return 1.0;
  if (ageInDays <= 3) return 0.8;
  if (ageInDays <= 7) return 0.6;
  if (ageInDays <= 14) return 0.4;
  if (ageInDays <= 30) return 0.2;
  return 0.1;
}

function calculateContentQuality(input: ScoreInput) {
  let score = 0;
  if (input.summary && input.summary.length > 50) score += 0.2;
  const contentLength = (input.content || '').length;
  if (contentLength >= 500 && contentLength <= 5000) {
    score += 0.3;
  } else if (contentLength > 5000) {
    score += 0.2;
  }
  if (input.tags && input.tags.length) score += 0.2;
  if (input.title && input.title.length > 20) score += 0.1;
  return Math.min(1, score);
}

function findMatchedKeywords(text: string, keywords: string[]) {
  const matches: string[] = [];
  keywords.forEach((keyword) => {
    if (matchesWordBoundary(text, keyword)) matches.push(keyword);
  });
  return matches;
}

function findNegativeHits(text: string, negativeKeywords: string[]) {
  const hits: string[] = [];
  negativeKeywords.forEach((nk) => {
    if (matchesWordBoundary(text, nk)) hits.push(nk);
  });
  return hits;
}

function generateSuggestedActions(score: number, matchedKeywords: string[]) {
  const actions: string[] = [];
  if (score >= 0.7) {
    actions.push('CREATE_BRIEF', 'GENERATE_DRAFT', 'ADD_TO_CALENDAR');
  } else if (score >= 0.5) {
    actions.push('CREATE_BRIEF', 'REVIEW_MANUALLY');
  } else if (score >= 0.3) {
    actions.push('REVIEW_MANUALLY');
  }
  if (matchedKeywords.length >= 3) {
    actions.push('HIGH_RELEVANCE');
  }
  return actions;
}

// ── Main scoring function ─────────────────────────────────────

export function scoreClippingItem(
  input: ScoreInput,
  params: { keywords?: string[]; pillars?: string[]; negativeKeywords?: string[]; requiredKeywords?: string[] }
): ScoreResult {
  const keywords = normalizeList(params.keywords || []);
  const pillars = normalizeList(params.pillars || []);
  const negativeKeywords = normalizeList(params.negativeKeywords || []);
  const requiredKeywords = normalizeList(params.requiredKeywords || []);
  const tags = normalizeList(input.tags || []);
  const text = extractText(input);

  const requiredMatches = requiredKeywords.length ? findMatchedKeywords(text, requiredKeywords) : [];
  const requiredGate = requiredKeywords.length ? (requiredMatches.length ? 1 : 0) : 1;

  const keywordMatch = calculateKeywordMatch(text, keywords);
  const pillarAlignment = calculatePillarAlignment(text, tags, pillars);
  const recency = calculateRecency(input.publishedAt || null);
  const contentQuality = calculateContentQuality(input);

  const rawScore =
    keywordMatch * WEIGHTS.keywordMatch +
    pillarAlignment * WEIGHTS.pillarAlignment +
    recency * WEIGHTS.recency +
    contentQuality * WEIGHTS.contentQuality;

  // Negative keyword penalty: -0.15 per hit, max -0.50
  const negativeHits = findNegativeHits(text, negativeKeywords);
  const negativePenalty = Math.min(0.5, negativeHits.length * 0.15);
  const totalScore = requiredGate ? Math.max(0, rawScore - negativePenalty) : 0;

  const matchedKeywords = findMatchedKeywords(text, [...keywords, ...pillars]);
  const suggestedActions = generateSuggestedActions(totalScore, matchedKeywords);

  return {
    score: Math.round(totalScore * 100) / 100,
    matchedKeywords,
    requiredMatches,
    negativeHits,
    relevanceFactors: {
      keywordMatch: Math.round(keywordMatch * 100) / 100,
      pillarAlignment: Math.round(pillarAlignment * 100) / 100,
      recency: Math.round(recency * 100) / 100,
      contentQuality: Math.round(contentQuality * 100) / 100,
      negativePenalty: Math.round(negativePenalty * 100) / 100,
      requiredGate,
      requiredHits: requiredMatches.length,
    },
    suggestedActions,
  };
}
