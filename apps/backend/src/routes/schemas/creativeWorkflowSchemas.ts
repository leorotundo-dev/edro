import { z } from 'zod';

export const creativeSessionStatusSchema = z.enum([
  'active',
  'blocked',
  'in_review',
  'awaiting_approval',
  'ready_to_publish',
  'done',
  'archived',
]);

export const creativeStageSchema = z.enum([
  'briefing',
  'copy',
  'arte',
  'refino_canvas',
  'revisao',
  'aprovacao',
  'exportacao',
]);

export const creativeVersionTypeSchema = z.enum([
  'copy',
  'caption',
  'layout',
  'image_prompt',
  'video_script',
  'review_note',
]);

export const creativeSourceSchema = z.enum([
  'studio',
  'canvas',
  'ai',
  'human',
]);

export const creativeAssetTypeSchema = z.enum([
  'image',
  'carousel',
  'video',
  'mockup',
  'thumbnail',
  'export',
]);

export const creativeReviewTypeSchema = z.enum([
  'internal',
  'client_approval',
]);

export const openCreativeSessionSchema = z.object({
  owner_id: z.string().uuid().optional().nullable(),
  briefing_id: z.string().uuid().optional().nullable(),
});

export const updateCreativeStageSchema = z.object({
  current_stage: creativeStageSchema,
  reason: z.string().trim().max(500).optional().nullable(),
});

export const updateCreativeMetadataSchema = z.object({
  metadata: z.record(z.string(), z.any()),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const saveBriefSchema = z.object({
  briefing_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3),
  objective: z.string().trim().min(1),
  message: z.string().trim().min(1),
  tone: z.string().trim().min(1),
  event: z.string().trim().optional().nullable(),
  date: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  platforms: z.array(z.string().trim().min(1)).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const addCreativeVersionSchema = z.object({
  version_type: creativeVersionTypeSchema,
  source: creativeSourceSchema,
  payload: z.record(z.string(), z.any()),
  select: z.boolean().optional().default(false),
});

export const selectCreativeVersionSchema = z.object({
  version_id: z.string().uuid(),
});

export const addCreativeAssetSchema = z.object({
  asset_type: creativeAssetTypeSchema,
  source: z.enum(['studio', 'canvas', 'ai', 'human', 'upload']),
  file_url: z.string().url(),
  thumb_url: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
  select: z.boolean().optional().default(false),
});

export const selectCreativeAssetSchema = z.object({
  asset_id: z.string().uuid(),
});

export const sendCreativeReviewSchema = z.object({
  review_type: creativeReviewTypeSchema,
  payload: z.record(z.string(), z.any()).optional(),
});

export const resolveCreativeReviewSchema = z.object({
  review_id: z.string().uuid(),
  status: z.enum(['approved', 'changes_requested', 'rejected', 'cancelled']),
  feedback: z.record(z.string(), z.any()).optional(),
});

export const readyToPublishSchema = z.object({
  channel: z.string().trim().optional().nullable(),
  scheduled_for: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const canvasSaveDraftSchema = z.object({
  snapshot: z.record(z.string(), z.any()),
  draft_asset: z.object({
    asset_type: creativeAssetTypeSchema,
    file_url: z.string().url(),
    thumb_url: z.string().url().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

export const studioHandoffAcceptSchema = z.object({
  job_id: z.string().uuid(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const studioHandoffReturnSchema = z.object({
  job_id: z.string().uuid(),
  note: z.string().trim().max(1000).optional().nullable(),
  next_actor: z.enum(['da', 'traffic']).optional().nullable(),
});

export const studioHandoffExportedSchema = z.object({
  job_id: z.string().uuid(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const studioHandoffSentSchema = z.object({
  job_id: z.string().uuid(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const studioHandoffListQuerySchema = z.object({
  role: z.enum(['da', 'traffic']).optional(),
  mine: z.coerce.boolean().optional(),
  status: z.enum(['needs_da_review', 'ready_for_traffic', 'accepted', 'returned_for_changes', 'exported', 'sent']).optional(),
  overdue: z.coerce.boolean().optional(),
  client_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
