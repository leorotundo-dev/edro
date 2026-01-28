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
  relevanceFactors: {
    keywordMatch: number;
    pillarAlignment: number;
    recency: number;
    contentQuality: number;
  };
  suggestedActions: string[];
};

const WEIGHTS = {
  keywordMatch: 0.4,
  pillarAlignment: 0.3,
  recency: 0.2,
  contentQuality: 0.1,
};

function normalizeList(values: string[]) {
  return values.map((value) => value.toLowerCase().trim()).filter(Boolean);
}

function extractText(input: ScoreInput) {
  return `${input.title || ''} ${input.summary || ''} ${input.content || ''}`.toLowerCase();
}

function calculateKeywordMatch(text: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  let matchCount = 0;
  keywords.forEach((keyword) => {
    if (text.includes(keyword)) matchCount += 1;
  });
  return Math.min(1, matchCount / keywords.length);
}

function calculatePillarAlignment(text: string, tags: string[], pillars: string[]): number {
  if (!pillars.length) return 0;
  let score = 0;
  pillars.forEach((pillar) => {
    if (text.includes(pillar)) score += 0.5;
    if (tags.some((tag) => tag.includes(pillar))) score += 0.5;
  });
  return Math.min(1, score / pillars.length);
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
    if (text.includes(keyword)) matches.push(keyword);
  });
  return matches;
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

export function scoreClippingItem(
  input: ScoreInput,
  params: { keywords?: string[]; pillars?: string[] }
): ScoreResult {
  const keywords = normalizeList(params.keywords || []);
  const pillars = normalizeList(params.pillars || []);
  const tags = normalizeList(input.tags || []);
  const text = extractText(input);

  const keywordMatch = calculateKeywordMatch(text, keywords);
  const pillarAlignment = calculatePillarAlignment(text, tags, pillars);
  const recency = calculateRecency(input.publishedAt || null);
  const contentQuality = calculateContentQuality(input);

  const totalScore =
    keywordMatch * WEIGHTS.keywordMatch +
    pillarAlignment * WEIGHTS.pillarAlignment +
    recency * WEIGHTS.recency +
    contentQuality * WEIGHTS.contentQuality;

  const matchedKeywords = findMatchedKeywords(text, [...keywords, ...pillars]);
  const suggestedActions = generateSuggestedActions(totalScore, matchedKeywords);

  return {
    score: Math.round(totalScore * 100) / 100,
    matchedKeywords,
    relevanceFactors: {
      keywordMatch: Math.round(keywordMatch * 100) / 100,
      pillarAlignment: Math.round(pillarAlignment * 100) / 100,
      recency: Math.round(recency * 100) / 100,
      contentQuality: Math.round(contentQuality * 100) / 100,
    },
    suggestedActions,
  };
}
