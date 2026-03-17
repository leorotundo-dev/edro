'use client';

import { apiGet, apiPost } from '@/lib/api';

type SearchParamsLike = {
  get(name: string): string | null;
} | null | undefined;

export type StudioWorkflowContext = {
  jobId: string;
  sessionId: string;
};

export type CreativeStage =
  | 'briefing'
  | 'copy'
  | 'arte'
  | 'refino_canvas'
  | 'revisao'
  | 'aprovacao'
  | 'exportacao';

export type CreativeSessionContextDto = {
  session: {
    id: string;
    job_id: string;
    briefing_id?: string | null;
    current_stage: CreativeStage;
    status: string;
    metadata?: Record<string, any>;
    last_canvas_snapshot?: Record<string, any>;
  };
  job: {
    id: string;
    title: string;
    summary?: string | null;
    status: string;
    deadline_at?: string | null;
    client_id?: string | null;
    client_name?: string | null;
    client_logo_url?: string | null;
    client_brand_color?: string | null;
    owner_id?: string | null;
    owner_name?: string | null;
    required_skill?: string | null;
    metadata?: Record<string, any>;
  };
  briefing?: Record<string, any> | null;
  selected_copy_version?: {
    id: string;
    payload?: Record<string, any>;
  } | null;
  selected_asset?: {
    id: string;
    file_url?: string | null;
    thumb_url?: string | null;
    metadata?: Record<string, any>;
  } | null;
  versions?: Array<{
    id: string;
    version_type: string;
    payload?: Record<string, any>;
    selected?: boolean;
    created_at?: string;
  }>;
  assets?: Array<{
    id: string;
    asset_type: string;
    file_url?: string | null;
    thumb_url?: string | null;
    metadata?: Record<string, any>;
    selected?: boolean;
    status?: string;
    created_at?: string;
  }>;
  reviews?: Array<{
    id: string;
    review_type: string;
    status: string;
    feedback?: Record<string, any>;
  }>;
  publication_intents?: Array<{
    id: string;
    channel?: string | null;
    scheduled_for?: string | null;
    status: string;
    metadata?: Record<string, any>;
  }>;
};

export type CreativePipelineMetadata = {
  selectedTrigger?: string | null;
  tone?: string;
  amd?: string;
  funnelPhase?: string;
  targetPlatforms?: string[];
  activeFormat?: {
    id?: string;
    platform?: string;
    format?: string;
    production_type?: string;
  } | null;
};

export type StudioInventoryItem = {
  id?: string;
  platform?: string;
  platformId?: string;
  format?: string;
  production_type?: string;
  index?: number;
  total?: number;
  name?: string;
};

export function readStudioWorkflowContext(): StudioWorkflowContext {
  if (typeof window === 'undefined') {
    return { jobId: '', sessionId: '' };
  }
  return {
    jobId: window.localStorage.getItem('edro_job_id') || '',
    sessionId: window.localStorage.getItem('edro_creative_session_id') || '',
  };
}

export function persistStudioWorkflowContext(context: Partial<StudioWorkflowContext>) {
  if (typeof window === 'undefined') return;
  if (context.jobId) window.localStorage.setItem('edro_job_id', context.jobId);
  if (context.sessionId) window.localStorage.setItem('edro_creative_session_id', context.sessionId);
}

export function readStudioInventoryFromSession(
  context?: CreativeSessionContextDto | null
): StudioInventoryItem[] {
  const rawInventory = context?.session?.metadata?.platforms?.inventory;
  if (!Array.isArray(rawInventory)) return [];
  return rawInventory
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return {
        id: typeof item.id === 'string' ? item.id : undefined,
        platform: typeof item.platform === 'string' ? item.platform : undefined,
        platformId: typeof item.platformId === 'string' ? item.platformId : undefined,
        format: typeof item.format === 'string' ? item.format : undefined,
        production_type: typeof item.production_type === 'string' ? item.production_type : undefined,
        index: typeof item.index === 'number' ? item.index : undefined,
        total: typeof item.total === 'number' ? item.total : undefined,
        name: typeof item.name === 'string' ? item.name : undefined,
      };
    })
    .filter(Boolean) as StudioInventoryItem[];
}

export function syncLegacyStudioStorageFromCreativeContext(
  context?: CreativeSessionContextDto | null
) {
  if (typeof window === 'undefined' || !context?.session || !context?.job) return;

  persistStudioWorkflowContext({
    jobId: context.job.id,
    sessionId: context.session.id,
  });

  if (context.session.briefing_id) {
    window.localStorage.setItem('edro_briefing_id', context.session.briefing_id);
  }

  const clientId = context.job.client_id || '';
  const clientName = context.job.client_name || '';
  if (clientId) {
    window.localStorage.setItem('edro_active_client_id', clientId);
    window.localStorage.setItem(
      'edro_selected_clients',
      JSON.stringify([
        {
          id: clientId,
          name: clientName || 'Cliente',
          segment: null,
          city: null,
          uf: null,
        },
      ])
    );
  }

  const brief = (context.briefing || context.session.metadata?.brief || {}) as Record<string, any>;
  let currentStudioContext: Record<string, any> = {};
  try {
    currentStudioContext = JSON.parse(window.localStorage.getItem('edro_studio_context') || '{}');
  } catch {
    currentStudioContext = {};
  }
  const nextStudioContext = {
    ...currentStudioContext,
    title:
      typeof brief.title === 'string' && brief.title
        ? brief.title
        : context.job.title || '',
    clientId: clientId || undefined,
    client: clientName || undefined,
    objective:
      typeof brief.objective === 'string' && brief.objective
        ? brief.objective
        : context.job.metadata?.objective || '',
    tone: typeof brief.tone === 'string' ? brief.tone : '',
    message:
      typeof brief.message === 'string' && brief.message
        ? brief.message
        : context.job.summary || '',
    notes: typeof brief.notes === 'string' ? brief.notes : '',
    event: typeof brief.event === 'string' ? brief.event : '',
    date: typeof brief.date === 'string' ? brief.date : '',
    tags: Array.isArray(brief.tags) ? brief.tags.join(', ') : (brief.tags || ''),
    categories: Array.isArray(brief.categories) ? brief.categories.join(', ') : (brief.categories || ''),
    source:
      typeof context.job.metadata?.source === 'string'
        ? context.job.metadata.source
        : typeof brief.source === 'string'
        ? brief.source
        : '',
  };
  window.localStorage.setItem('edro_studio_context', JSON.stringify(nextStudioContext));

  if (context.selected_copy_version?.id) {
    window.localStorage.setItem('edro_copy_version_id', context.selected_copy_version.id);
  }

  const inventory = readStudioInventoryFromSession(context);
  if (inventory.length) {
    const formatsByPlatform = inventory.reduce<Record<string, string[]>>((acc, item) => {
      const platform = item.platform || item.platformId || 'Plataforma';
      const format = item.format || item.name || 'Formato';
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(format);
      return acc;
    }, {});
    window.localStorage.setItem('edro_selected_inventory', JSON.stringify(inventory));
    window.localStorage.setItem('edro_selected_formats_by_platform', JSON.stringify(formatsByPlatform));
    window.localStorage.setItem(
      'edro_selected_platforms',
      JSON.stringify(Object.keys(formatsByPlatform))
    );
    window.localStorage.setItem(
      'edro_selected_formats',
      JSON.stringify(
        inventory.map((item) => `${item.platform || item.platformId || 'Plataforma'}: ${item.format || item.name || 'Formato'}`)
      )
    );
    if (Object.keys(formatsByPlatform).length) {
      window.localStorage.setItem('edro_active_platform', Object.keys(formatsByPlatform)[0]);
    }
  }

  window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
}

export function resolveStudioWorkflowContext(
  searchParams?: SearchParamsLike,
  override?: Partial<StudioWorkflowContext>
): StudioWorkflowContext {
  const stored = readStudioWorkflowContext();
  return {
    jobId: override?.jobId ?? searchParams?.get('jobId') ?? stored.jobId,
    sessionId: override?.sessionId ?? searchParams?.get('sessionId') ?? stored.sessionId,
  };
}

export function buildStudioQuery(
  searchParams?: SearchParamsLike,
  override?: Partial<StudioWorkflowContext>
) {
  const stored = resolveStudioWorkflowContext(searchParams, override);
  const params = new URLSearchParams();
  const jobId = stored.jobId;
  const sessionId = stored.sessionId;

  if (jobId) params.set('jobId', jobId);
  if (sessionId) params.set('sessionId', sessionId);
  return params;
}

export function buildStudioHref(
  path: string,
  searchParams?: SearchParamsLike,
  override?: Partial<StudioWorkflowContext>
) {
  const params = buildStudioQuery(searchParams, override);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function persistContextFromSession(data?: CreativeSessionContextDto | null) {
  if (!data?.session?.id || !data?.job?.id) return;
  persistStudioWorkflowContext({
    jobId: data.job.id,
    sessionId: data.session.id,
  });
}

export async function openStudioCreativeSession(
  jobId: string,
  input?: { owner_id?: string | null; briefing_id?: string | null }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/jobs/${jobId}/creative-session/open`,
    input || {}
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function loadStudioCreativeSession(jobId: string) {
  const response = await apiGet<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/jobs/${jobId}/creative-session`
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function updateStudioCreativeStage(sessionId: string, payload: { current_stage: CreativeStage; reason?: string | null }) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/stage`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function updateStudioCreativeMetadata(
  sessionId: string,
  payload: {
    job_id: string;
    metadata: Record<string, any>;
    reason?: string | null;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/update-metadata`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function addStudioCreativeVersion(
  sessionId: string,
  payload: {
    job_id: string;
    version_type: 'copy' | 'caption' | 'layout' | 'image_prompt' | 'video_script' | 'review_note';
    source: 'studio' | 'canvas' | 'ai' | 'human';
    payload: Record<string, any>;
    select?: boolean;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/add-version`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function addStudioCreativeAsset(
  sessionId: string,
  payload: {
    job_id: string;
    asset_type: 'image' | 'carousel' | 'video' | 'mockup' | 'thumbnail' | 'export';
    source: 'studio' | 'canvas' | 'ai' | 'human' | 'upload';
    file_url: string;
    thumb_url?: string | null;
    metadata?: Record<string, any>;
    select?: boolean;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/add-asset`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function sendStudioCreativeReview(
  sessionId: string,
  payload: {
    job_id: string;
    review_type: 'internal' | 'client_approval';
    payload?: Record<string, any>;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/send-review`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function resolveStudioCreativeReview(
  sessionId: string,
  payload: {
    job_id: string;
    review_id: string;
    status: 'approved' | 'changes_requested' | 'rejected' | 'cancelled';
    feedback?: Record<string, any>;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/resolve-review`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}

export async function markStudioReadyToPublish(
  sessionId: string,
  payload: {
    job_id: string;
    channel?: string | null;
    scheduled_for?: string | null;
    metadata?: Record<string, any>;
  }
) {
  const response = await apiPost<{ success?: boolean; data?: CreativeSessionContextDto }>(
    `/creative-sessions/${sessionId}/ready-to-publish`,
    payload
  );
  const data = response?.data || null;
  persistContextFromSession(data);
  return data;
}
