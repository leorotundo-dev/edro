export type Platform = 'twitter' | 'youtube' | 'tiktok' | 'reddit' | 'linkedin' | 'instagram' | 'facebook';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type RawMention = {
  id: string;
  platform: Platform;
  content: string;
  author?: string;
  authorFollowers?: number;
  authorVerified?: boolean;
  engagementLikes?: number;
  engagementComments?: number;
  engagementShares?: number;
  engagementViews?: number;
  url?: string;
  language?: string;
  country?: string;
  publishedAt?: Date;
};

export type AnalyzedMention = RawMention & {
  sentiment: Sentiment;
  sentimentScore: number;
  keywords: string[];
};

export type CollectorResult = {
  mentions: RawMention[];
  hasMore?: boolean;
  cursor?: string;
};

export type SentimentAnalysisResult = {
  sentiment: Sentiment;
  score: number;
  keywords: string[];
  confidence: number;
};
