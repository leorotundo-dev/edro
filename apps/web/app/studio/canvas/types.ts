/** Layout layer — mirrors backend LayoutLayer from layoutEngine.ts */
export type LayoutLayer = {
  id: string;
  type: 'image' | 'text' | 'logo' | 'shape' | 'cta_button';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  content?: string;
  imagePrompt?: string;
  imageUrl?: string;
  style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
    letterSpacing?: number;
    borderRadius?: number;
    padding?: number;
    textTransform?: 'none' | 'uppercase' | 'lowercase';
    textShadow?: string;
  };
};

export type GeneratedLayout = {
  width: number;
  height: number;
  backgroundColor: string;
  layers: LayoutLayer[];
  imagePrompt: string;
  spatialDirective: string;
  compositionType: string;
};

export type GenerateLayoutResponse = {
  success: boolean;
  layout: GeneratedLayout;
  copy: { headline: string; body?: string; cta: string };
  image_url?: string;
  art_direction: Record<string, any>;
  provider: string;
};

export type CampaignPieceResult = {
  pieceIndex: number;
  format: string;
  platform: string;
  behavior_intent_id?: string;
  layout: GeneratedLayout;
  copy: { headline: string; body?: string; cta: string };
  image_url?: string;
  error?: string;
};

export type GenerateCampaignResponse = {
  success: boolean;
  campaign_id: string;
  campaign_name: string;
  art_direction: Record<string, any>;
  pieces: CampaignPieceResult[];
  total: number;
  generated: number;
};
