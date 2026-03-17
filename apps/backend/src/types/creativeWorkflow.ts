export type CreativeSessionStatus =
  | 'active'
  | 'blocked'
  | 'in_review'
  | 'awaiting_approval'
  | 'ready_to_publish'
  | 'done'
  | 'archived';

export type CreativeStage =
  | 'briefing'
  | 'copy'
  | 'arte'
  | 'refino_canvas'
  | 'revisao'
  | 'aprovacao'
  | 'exportacao';

export type CreativeVersionType =
  | 'copy'
  | 'caption'
  | 'layout'
  | 'image_prompt'
  | 'video_script'
  | 'review_note';

export type CreativeSource =
  | 'studio'
  | 'canvas'
  | 'ai'
  | 'human';

export type CreativeAssetType =
  | 'image'
  | 'carousel'
  | 'video'
  | 'mockup'
  | 'thumbnail'
  | 'export';

export type CreativeAssetStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'selected'
  | 'rejected'
  | 'exported';

export type CreativeReviewType =
  | 'internal'
  | 'client_approval';

export type CreativeReviewStatus =
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'cancelled';

export type CreativePublicationStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'failed';

export interface CreativeSessionRow {
  id: string;
  tenant_id: string;
  job_id: string;
  briefing_id: string | null;
  status: CreativeSessionStatus;
  current_stage: CreativeStage;
  owner_id: string | null;
  selected_copy_version_id: string | null;
  selected_asset_id: string | null;
  last_canvas_snapshot: Record<string, any>;
  metadata: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeVersionRow {
  id: string;
  tenant_id: string;
  creative_session_id: string;
  job_id: string;
  version_type: CreativeVersionType;
  source: CreativeSource;
  payload: Record<string, any>;
  selected: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CreativeAssetRow {
  id: string;
  tenant_id: string;
  creative_session_id: string;
  job_id: string;
  asset_type: CreativeAssetType;
  source: CreativeSource | 'upload';
  file_url: string;
  thumb_url: string | null;
  status: CreativeAssetStatus;
  selected: boolean;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export interface CreativeReviewRow {
  id: string;
  tenant_id: string;
  creative_session_id: string;
  job_id: string;
  review_type: CreativeReviewType;
  status: CreativeReviewStatus;
  feedback: Record<string, any>;
  sent_by: string | null;
  resolved_by: string | null;
  sent_at: string;
  resolved_at: string | null;
}

export interface CreativePublicationIntentRow {
  id: string;
  tenant_id: string;
  creative_session_id: string;
  job_id: string;
  channel: string | null;
  scheduled_for: string | null;
  status: CreativePublicationStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreativeSessionContextDto {
  session: CreativeSessionRow;
  job: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    priority_band: string;
    deadline_at: string | null;
    client_id: string | null;
    client_name?: string | null;
    client_logo_url?: string | null;
    client_brand_color?: string | null;
    owner_id: string | null;
    owner_name?: string | null;
    required_skill?: string | null;
    metadata: Record<string, any>;
  };
  briefing: Record<string, any> | null;
  selected_copy_version: CreativeVersionRow | null;
  selected_asset: CreativeAssetRow | null;
  versions: CreativeVersionRow[];
  assets: CreativeAssetRow[];
  reviews: CreativeReviewRow[];
  publication_intents: CreativePublicationIntentRow[];
}
