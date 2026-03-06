'use client';
import { createContext, useContext } from 'react';

export type NodeStatus = 'done' | 'active' | 'running' | 'locked';

export type ParsedOption = {
  title: string;
  body: string;
  cta: string;
  legenda: string;
  hashtags: string;
  raw: string;
  slides?: { title: string; body: string }[];
};

export type ArtDirectorLayout = {
  eyebrow?: string;
  headline?: string;
  accentWord?: string;
  accentColor?: string;
  cta?: string;
  body?: string;
  overlayStrength?: number;
};

export type PipelineBriefing = {
  id: string;
  title: string;
  client_name?: string | null;
  payload?: Record<string, any>;
};

export type PipelineFormat = {
  id?: string;
  platform?: string;
  format?: string;
  production_type?: string;
};

export type FunnelPhase = 'awareness' | 'consideracao' | 'conversao';

export type PipelineOcasiao = {
  id: string;
  label: string;
  emoji: string;
  days?: number;
  suggestedTrigger?: string;
  suggestedTone?: string;
};

export type NodeStatusMap = {
  ocasiao?: NodeStatus;
  briefing: NodeStatus;
  copy: NodeStatus;
  trigger: NodeStatus;
  arte: NodeStatus;
  export: NodeStatus;
};

export interface PipelineContextValue {
  // Briefing
  briefing: PipelineBriefing | null;
  activeFormat: PipelineFormat | null;
  clientBrandColor: string;
  briefingConfirmed: boolean;
  confirmBriefing: () => void;

  // Creative settings (set in BriefingNode, used by Copy + Arte)
  tone: string;
  setTone: (t: string) => void;
  amd: string;
  setAmd: (a: string) => void;

  // Target platforms — selected in CopyNode, used by Otimizador de Canal + MultiFormat
  targetPlatforms: string[];
  setTargetPlatforms: (platforms: string[]) => void;

  // Copy
  copyGenerating: boolean;
  copyOptions: ParsedOption[];
  selectedCopyIdx: number;
  setSelectedCopyIdx: (idx: number) => void;
  copyApproved: boolean;
  copyVersionId: string | null;
  copyError: string;
  handleGenerateCopy: (params: { pipeline: string; count: number; taskType: string; provider?: string; extraInstructions?: string }) => Promise<void>;
  rerunCopy: (extraInstructions: string) => Promise<void>;
  approveCopy: (idx: number) => void;
  editCopy: () => void;

  // Funnel phase
  funnelPhase: FunnelPhase;
  setFunnelPhase: (p: FunnelPhase) => void;

  // Ocasiao (Momento Zero)
  ocasiao: PipelineOcasiao | null;
  setOcasiao: (o: PipelineOcasiao | null) => void;
  ocasiaoConfirmed: boolean;
  confirmOcasiao: () => void;

  // Trigger
  selectedTrigger: string | null;
  setSelectedTrigger: (t: string | null) => void;
  triggerConfirmed: boolean;
  confirmTrigger: () => void;
  editTrigger: () => void;

  // Stale tracking — copy needs regeneration when params change
  copyIsStale: boolean;

  // Arte
  arteGenerating: boolean;
  artDirLayout: ArtDirectorLayout | null;
  arteImageUrl: string | null;
  arteImageUrls: string[];
  selectedArteIdx: number;
  setSelectedArteIdx: (idx: number) => void;
  arteApproved: boolean;
  arteError: string;
  handleGenerateArte: (withImage: boolean, opts?: { aspectRatio?: string; negativePrompt?: string; refinement?: string; provider?: string; model?: string }) => Promise<void>;
  useArte: (url: string) => void;
  editArte: () => void;

  // Derived status
  nodeStatus: NodeStatusMap;

  // Chef recommendations — AI hint for each active step
  recommendations: Record<string, { text: string; confidence: 'high' | 'medium' | 'low' } | undefined>;

  // Trigger curation — ranked triggers from AI
  triggerRanking: { id: string; score: number; reason: string }[];

  // Recipes
  suggestedRecipes: CreativeRecipe[];
  saveRecipe: (name: string) => Promise<void>;
  applyRecipe: (recipe: CreativeRecipe) => void;

  // Learning rules count (for BriefingNode mise en place)
  learningRulesCount: number | null;

  // Optional node management — lets any node add sibling nodes to the canvas
  activeNodeIds: string[];
  addOptionalNode: (nodeId: string) => void;

  // Agente Redator — 5-plugin chain
  copyChainResult: CopyChainResult | null;
  copyChainStep: number;         // 0=idle 1-5=plugin running
  handleGenerateCopyChain: (params: CopyChainParams) => Promise<void>;

  // Agente Diretor de Arte — 6-plugin chain
  arteChainResult: ArteChainResult | null;
  arteChainStep: number;         // 0=idle 1-6=plugin running
  handleGenerateArteChain: (params: ArteChainParams) => Promise<void>;
}

export type CopyChainBrandVoice = {
  tom: string;
  palavras_proibidas: string[];
  persona: string;
  estilo: string;
  emocao_alvo: string;
};

export type CopyChainStrategy = {
  structure: string;
  hooks: string[];
  angles: string[];
  key_tension: string;
};

export type CopyChainVariant = {
  appeal: 'dor' | 'logica' | 'prova_social';
  title: string;
  body: string;
  cta: string;
  legenda: string;
  hashtags: string[];
  audit: { approved: boolean; score: number; issues: string[]; final_text: string };
  flagged: boolean;
};

export type CopyChainResult = {
  brandVoice: CopyChainBrandVoice;
  strategy: CopyChainStrategy;
  variants: CopyChainVariant[];
  pluginTimings: Record<string, number>;
};

export type CopyChainParams = {
  brandVoiceOverride?: Partial<CopyChainBrandVoice>;
  strategyOverride?: Partial<CopyChainStrategy>;
  appealsOverride?: Array<'dor' | 'logica' | 'prova_social'>;
};

// ── Agente Diretor de Arte types ─────────────────────────────────────────────
export type ArteBrandVisual = {
  primaryColor: string;
  styleKeywords: string[];
  moodKeywords: string[];
  avoidElements: string[];
  loraId: string | null;
  loraScale: number;
  referenceStyle: string;
  typography: string;
};

export type ArteFalPayload = {
  concept: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  aspectRatio: string;
  guidanceScale: number;
  numInferenceSteps: number;
  loras: Array<{ path: string; scale: number; name?: string }>;
};

export type ArteChainCritique = {
  pass: boolean;
  score: number;
  dimensions: Array<{ label: string; score: number; note?: string }>;
  issues: string[];
  promptRefinements: string;
};

export type ArteChainResult = {
  brandVisual: ArteBrandVisual;
  payload: ArteFalPayload;
  imageUrl: string;
  imageUrls: string[];
  seed?: number;
  critique: ArteChainCritique;
  attempts: number;
  multiFormat?: Array<{ format: string; aspectRatio: string; imageUrl: string }>;
  pluginTimings: Record<string, number>;
};

export type ArteChainParams = {
  brandVisualOverride?: Partial<ArteBrandVisual>;
  payloadOverride?: Partial<ArteFalPayload>;
  generateMultiFormat?: boolean;
};

export type CreativeRecipe = {
  id: string;
  name: string;
  objective?: string | null;
  platform?: string | null;
  format?: string | null;
  pipeline_type: string;
  trigger_id?: string | null;
  provider?: string | null;
  model?: string | null;
  tone_notes?: string | null;
  use_count: number;
  last_used_at?: string | null;
};

export const PipelineContext = createContext<PipelineContextValue | null>(null);

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used inside PipelineContext.Provider');
  return ctx;
}
