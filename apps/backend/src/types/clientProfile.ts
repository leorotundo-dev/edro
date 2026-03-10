export type SocialProfiles = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
  other?: string;
};

export type KnowledgeBase = {
  description?: string;
  website?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  must_mentions?: string[];
  approved_terms?: string[];
  forbidden_claims?: string[];
  hashtags?: string[];
  notes?: string;
  social_profiles?: SocialProfiles;
};

export type Competitor = {
  name: string;
  website?: string;
  monitoring: boolean;
  platforms?: string[];
  suggested_by?: 'ai' | 'user';
};

export type StrategicDate = {
  date: string;
  label: string;
  type: 'seasonal' | 'regulatory' | 'client' | 'veto';
  confirmed: boolean;
  suggested_by?: 'ai' | 'user';
  notes?: string;
};

export type ContentMix = {
  educational: number;
  promotional: number;
  institutional: number;
  entertainment: number;
};

export type ClientProfileConfirmed = {
  tone_profile?: 'conservative' | 'balanced' | 'bold';
  risk_tolerance?: 'low' | 'medium' | 'high';
  keywords?: string[];
  pillars?: string[];
  negative_keywords?: string[];
  knowledge_base?: KnowledgeBase;
  calendar_profile?: Record<string, any>;
  trend_profile?: Record<string, any>;
  platform_preferences?: Record<string, any>;

  logo_url?: string;
  brand_colors?: string[];
  tone_description?: string;
  personality_traits?: string[];
  formality_level?: number;
  emoji_usage?: 'never' | 'rare' | 'moderate' | 'frequent';
  good_copy_examples?: string[];
  bad_copy_examples?: string[];
  competitors?: Competitor[];
  strategic_dates?: StrategicDate[];
  content_mix?: ContentMix;
  brand_directives?: string[];
  forbidden_content?: string[];
};

export type FieldSuggestion = {
  value: any;
  confidence: number;
  source: string;
  reasoning?: string;
  status?: 'pending' | 'confirmed' | 'discarded';
};

export type SectionSuggestion = {
  suggested_at: string;
  status: 'pending' | 'reviewed';
  fields: Record<string, FieldSuggestion>;
};

export type VisualSectionSuggestion = {
  suggested_at: string;
  status: 'pending' | 'done' | 'failed';
  fields: Record<string, FieldSuggestion & { metadata?: Record<string, any> }>;
};

export type ProfileSuggestions = {
  identity?: SectionSuggestion;
  voice?: SectionSuggestion;
  strategy?: SectionSuggestion;
  competitors?: SectionSuggestion;
  calendar?: SectionSuggestion;
  visual?: VisualSectionSuggestion;
};

export type IntelligenceScoreBreakdown = {
  score: number;
  max: number;
  label: string;
  status: 'confirmed' | 'suggested' | 'empty' | 'manual_required';
};

export type IntelligenceScore = {
  total: number;
  breakdown: Record<string, IntelligenceScoreBreakdown>;
};

