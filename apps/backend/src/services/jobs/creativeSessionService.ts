import type { PoolClient } from 'pg';
import { pool, query } from '../../db';
import { syncOperationalRuntimeForJob } from './operationsRuntimeService';
import { deriveCreativeStageFromJobStatus, mapCreativeStageToJobStatus } from './creativeStageMapping';
import { canTransitionCreativeStage } from './creativeWorkflowRules';
import type {
  CreativeAssetRow,
  CreativePublicationIntentRow,
  CreativeReviewRow,
  CreativeSessionContextDto,
  CreativeSessionRow,
  CreativeStage,
  CreativeVersionRow,
} from '../../types/creativeWorkflow';

type OpenCreativeSessionInput = {
  owner_id?: string | null;
  briefing_id?: string | null;
};

type SaveCreativeBriefInput = {
  briefing_id?: string | null;
  title: string;
  objective: string;
  message: string;
  tone: string;
  event?: string | null;
  date?: string | null;
  notes?: string | null;
  platforms: string[];
  metadata?: Record<string, any>;
};

type AddCreativeVersionInput = {
  version_type: 'copy' | 'caption' | 'layout' | 'image_prompt' | 'video_script' | 'review_note';
  source: 'studio' | 'canvas' | 'ai' | 'human';
  payload: Record<string, any>;
  select?: boolean;
};

type AddCreativeAssetInput = {
  asset_type: 'image' | 'carousel' | 'video' | 'mockup' | 'thumbnail' | 'export';
  source: 'studio' | 'canvas' | 'ai' | 'human' | 'upload';
  file_url: string;
  thumb_url?: string | null;
  metadata?: Record<string, any>;
  select?: boolean;
};

type SendCreativeReviewInput = {
  review_type: 'internal' | 'client_approval';
  payload?: Record<string, any>;
};

type ResolveCreativeReviewInput = {
  review_id: string;
  status: 'approved' | 'changes_requested' | 'rejected' | 'cancelled';
  feedback?: Record<string, any>;
};

type ReadyToPublishInput = {
  channel?: string | null;
  scheduled_for?: string | null;
  metadata?: Record<string, any>;
};

type SaveCanvasDraftInput = {
  snapshot: Record<string, any>;
  draft_asset?: {
    asset_type: 'image' | 'carousel' | 'video' | 'mockup' | 'thumbnail' | 'export';
    file_url: string;
    thumb_url?: string | null;
    metadata?: Record<string, any>;
  };
};

type UpdateCreativeSessionMetadataInput = {
  metadata: Record<string, any>;
  reason?: string | null;
};

type JobRow = {
  id: string;
  tenant_id: string;
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

function stageToSessionStatus(stage: CreativeStage) {
  switch (stage) {
    case 'revisao':
      return 'in_review' as const;
    case 'aprovacao':
      return 'awaiting_approval' as const;
    case 'exportacao':
      return 'ready_to_publish' as const;
    default:
      return 'active' as const;
  }
}

function mergeJson(base?: Record<string, any> | null, patch?: Record<string, any> | null) {
  return { ...(base || {}), ...(patch || {}) };
}

async function appendJobStatusHistory(
  client: PoolClient,
  jobId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy?: string | null,
  reason?: string | null
) {
  await client.query(
    `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [jobId, fromStatus, toStatus, changedBy || null, reason || null]
  );
}

async function fetchJobForTenant(client: PoolClient, tenantId: string, jobId: string) {
  const { rows } = await client.query<JobRow>(
    `SELECT
       j.id,
       j.tenant_id,
       j.title,
       j.summary,
       j.status,
       j.priority_band,
       j.deadline_at,
       j.client_id,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       j.owner_id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       j.required_skill,
       COALESCE(j.metadata, '{}'::jsonb) AS metadata
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
    WHERE j.tenant_id = $1
      AND j.id = $2
    LIMIT 1`,
    [tenantId, jobId]
  );

  return rows[0] || null;
}

async function setJobStatusIfChanged(
  client: PoolClient,
  job: JobRow,
  nextStatus: string,
  userId?: string | null,
  reason?: string | null
) {
  if (!nextStatus || job.status === nextStatus) return;
  await client.query(
    `UPDATE jobs
        SET status = $2,
            completed_at = CASE WHEN $2 = 'done' THEN now() ELSE completed_at END
      WHERE id = $1`,
    [job.id, nextStatus]
  );
  await appendJobStatusHistory(client, job.id, job.status, nextStatus, userId, reason);
  job.status = nextStatus;
}

async function getBriefingContext(tenantId: string, briefingId?: string | null) {
  if (!briefingId) return null;
  const { rows } = await query<any>(
    `SELECT id, title, payload, due_at, status, main_client_id
       FROM edro_briefings
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, briefingId]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    title: rows[0].title,
    due_at: rows[0].due_at,
    status: rows[0].status,
    client_id: rows[0].main_client_id || null,
    payload: rows[0].payload || {},
  };
}

async function syncLegacyPipelineClientApproval(session: CreativeSessionRow, job: JobRow) {
  if (!session.briefing_id) return;

  const client = await pool.connect();
  let shouldSyncRuntime = false;
  try {
    await client.query('BEGIN');

    const legacyRes = await client.query<{
      id: string;
      decision: 'approved' | 'rejected';
      feedback: string | null;
      section: string | null;
      client_name: string | null;
      client_email: string | null;
      created_at: string;
    }>(
      `SELECT id, decision, feedback, section, client_name, client_email, created_at
         FROM pipeline_client_approvals
        WHERE briefing_id = $1
          AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [session.briefing_id, job.tenant_id]
    );

    const legacy = legacyRes.rows[0];
    if (!legacy) {
      await client.query('COMMIT');
      return;
    }

    const reviewRes = await client.query<CreativeReviewRow & { feedback: any }>(
      `SELECT *
         FROM creative_reviews
        WHERE creative_session_id = $1
          AND review_type = 'client_approval'
        ORDER BY sent_at DESC
        LIMIT 1`,
      [session.id]
    );
    const existing = reviewRes.rows[0];
    const feedbackPayload = {
      ...(existing?.feedback || {}),
      source: 'pipeline_client_approval',
      legacy_approval_id: legacy.id,
      decision: legacy.decision,
      section: legacy.section || 'final',
      note: legacy.feedback || null,
      client_name: legacy.client_name || null,
      client_email: legacy.client_email || null,
      decided_at: legacy.created_at,
    };

    const alreadySynced = existing?.feedback?.legacy_approval_id === legacy.id
      && existing.status === legacy.decision;

    if (!alreadySynced) {
      if (existing) {
        await client.query(
          `UPDATE creative_reviews
              SET status = $2,
                  feedback = $3::jsonb,
                  resolved_at = COALESCE(resolved_at, $4::timestamptz)
            WHERE id = $1`,
          [existing.id, legacy.decision, JSON.stringify(feedbackPayload), legacy.created_at]
        );
      } else {
        await client.query(
          `INSERT INTO creative_reviews (
             tenant_id, creative_session_id, job_id, review_type, status, feedback, sent_at, resolved_at
           ) VALUES ($1, $2, $3, 'client_approval', $4, $5::jsonb, $6::timestamptz, $6::timestamptz)`,
          [job.tenant_id, session.id, job.id, legacy.decision, JSON.stringify(feedbackPayload), legacy.created_at]
        );
      }

      const nextStage = legacy.decision === 'approved' ? 'exportacao' : 'arte';
      const nextSessionStatus = legacy.decision === 'approved' ? 'ready_to_publish' : 'active';
      await client.query(
        `UPDATE creative_sessions
            SET current_stage = $2,
                status = $3
          WHERE id = $1`,
        [session.id, nextStage, nextSessionStatus]
      );

      const liveJob = await fetchJobForTenant(client, job.tenant_id, job.id);
      if (liveJob) {
        await setJobStatusIfChanged(
          client,
          liveJob,
          legacy.decision === 'approved' ? 'approved' : 'in_progress',
          null,
          'pipeline_client_approval_synced'
        );
      }

      shouldSyncRuntime = true;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (shouldSyncRuntime) {
    await syncOperationalRuntimeForJob(job.tenant_id, job.id);
  }
}

async function buildCreativeSessionContextByRow(session: CreativeSessionRow, job: JobRow): Promise<CreativeSessionContextDto> {
  await syncLegacyPipelineClientApproval(session, job);
  const [versionsRes, assetsRes, reviewsRes, publicationRes, briefing] = await Promise.all([
    query<CreativeVersionRow>(
      `SELECT * FROM creative_versions
        WHERE creative_session_id = $1
        ORDER BY created_at DESC`,
      [session.id]
    ),
    query<CreativeAssetRow>(
      `SELECT * FROM creative_assets
        WHERE creative_session_id = $1
        ORDER BY created_at DESC`,
      [session.id]
    ),
    query<CreativeReviewRow>(
      `SELECT * FROM creative_reviews
        WHERE creative_session_id = $1
        ORDER BY sent_at DESC`,
      [session.id]
    ),
    query<CreativePublicationIntentRow>(
      `SELECT * FROM creative_publication_intents
        WHERE creative_session_id = $1
        ORDER BY created_at DESC`,
      [session.id]
    ),
    getBriefingContext(job.tenant_id, session.briefing_id),
  ]);

  const versions = versionsRes.rows || [];
  const assets = assetsRes.rows || [];

  return {
    session,
    job,
    briefing: briefing || (session.metadata?.brief || null),
    selected_copy_version: versions.find((item) => item.id === session.selected_copy_version_id) || null,
    selected_asset: assets.find((item) => item.id === session.selected_asset_id) || null,
    versions,
    assets,
    reviews: reviewsRes.rows || [],
    publication_intents: publicationRes.rows || [],
  };
}

export async function getCreativeSessionContext(tenantId: string, jobId: string) {
  const { rows } = await query<CreativeSessionRow>(
    `SELECT *
       FROM creative_sessions
      WHERE tenant_id = $1
        AND job_id = $2
      LIMIT 1`,
    [tenantId, jobId]
  );
  if (!rows[0]) return null;

  const job = await query<JobRow>(
    `SELECT
       j.id,
       j.tenant_id,
       j.title,
       j.summary,
       j.status,
       j.priority_band,
       j.deadline_at,
       j.client_id,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       j.owner_id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       j.required_skill,
       COALESCE(j.metadata, '{}'::jsonb) AS metadata
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
    WHERE j.tenant_id = $1
      AND j.id = $2
    LIMIT 1`,
    [tenantId, jobId]
  );

  if (!job.rows[0]) return null;
  return buildCreativeSessionContextByRow(rows[0], job.rows[0]);
}

export async function getCreativeSessionContextBySessionId(tenantId: string, sessionId: string) {
  const { rows } = await query<CreativeSessionRow>(
    `SELECT *
       FROM creative_sessions
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, sessionId]
  );
  if (!rows[0]) return null;
  return getCreativeSessionContext(tenantId, rows[0].job_id);
}

export async function openCreativeSession(
  tenantId: string,
  jobId: string,
  userId?: string | null,
  input: OpenCreativeSessionInput = {}
) {
  const client = await pool.connect();
  let sessionId = '';
  try {
    await client.query('BEGIN');

    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (!job) throw new Error('Demanda não encontrada.');

    const existing = await client.query<CreativeSessionRow>(
      `SELECT *
         FROM creative_sessions
        WHERE tenant_id = $1
          AND job_id = $2
        LIMIT 1`,
      [tenantId, jobId]
    );

    const stage = deriveCreativeStageFromJobStatus(job.status);
    const ownerId = input.owner_id ?? job.owner_id ?? userId ?? null;
    const briefingId = input.briefing_id ?? (job.metadata?.briefing_id as string | null) ?? null;

    if (existing.rows[0]) {
      sessionId = existing.rows[0].id;
      await client.query(
        `UPDATE creative_sessions
            SET owner_id = COALESCE($2, owner_id),
                briefing_id = COALESCE($3, briefing_id),
                current_stage = COALESCE(current_stage, $4),
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('job_id', $1)
          WHERE id = $5`,
        [jobId, ownerId, briefingId, stage, sessionId]
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO creative_sessions (
           tenant_id, job_id, briefing_id, status, current_stage, owner_id, metadata
         ) VALUES ($1, $2, $3, 'active', $4, $5, jsonb_build_object('job_id', $2))
         RETURNING id`,
        [tenantId, jobId, briefingId, stage, ownerId]
      );
      sessionId = inserted.rows[0].id;
    }

    if (['intake', 'planned', 'ready', 'allocated'].includes(job.status)) {
      await setJobStatusIfChanged(client, job, mapCreativeStageToJobStatus(stage), userId, 'creative_session_opened');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  const context = await getCreativeSessionContext(tenantId, jobId);
  if (!context) throw new Error('Falha ao abrir sessão criativa.');
  return context;
}

export async function updateCreativeStage(
  tenantId: string,
  sessionId: string,
  userId: string | null | undefined,
  input: { current_stage: CreativeStage; reason?: string | null }
) {
  const client = await pool.connect();
  let jobId = '';
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, sessionId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');
    if (!canTransitionCreativeStage(session.current_stage, input.current_stage)) {
      throw new Error('Transição de etapa criativa inválida.');
    }

    const job = await fetchJobForTenant(client, tenantId, session.job_id);
    if (!job) throw new Error('Demanda não encontrada.');
    jobId = job.id;

    await client.query(
      `UPDATE creative_sessions
          SET current_stage = $2,
              status = $3
        WHERE id = $1`,
      [session.id, input.current_stage, stageToSessionStatus(input.current_stage)]
    );

    await setJobStatusIfChanged(
      client,
      job,
      mapCreativeStageToJobStatus(input.current_stage),
      userId,
      input.reason || 'creative_stage_changed'
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (jobId) await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function updateCreativeSessionMetadata(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: UpdateCreativeSessionMetadataInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 AND job_id = $3 LIMIT 1`,
      [tenantId, sessionId, jobId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');

    const nextMetadata = mergeJson(session.metadata, input.metadata || {});
    await client.query(
      `UPDATE creative_sessions
          SET metadata = $2::jsonb
        WHERE id = $1`,
      [sessionId, JSON.stringify(nextMetadata)]
    );

    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (job && ['intake', 'planned', 'ready', 'allocated'].includes(job.status)) {
      await setJobStatusIfChanged(client, job, 'in_progress', userId, input.reason || 'creative_session_metadata_updated');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function saveCreativeBrief(
  tenantId: string,
  sessionId: string,
  userId: string | null | undefined,
  input: SaveCreativeBriefInput
) {
  const client = await pool.connect();
  let jobId = '';
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, sessionId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');
    jobId = session.job_id;

    const metadata = mergeJson(session.metadata, {
      brief: {
        title: input.title,
        objective: input.objective,
        message: input.message,
        tone: input.tone,
        event: input.event || null,
        date: input.date || null,
        notes: input.notes || null,
        platforms: input.platforms || [],
        ...(input.metadata || {}),
      },
      briefing_id: input.briefing_id || session.briefing_id || null,
    });

    await client.query(
      `UPDATE creative_sessions
          SET briefing_id = COALESCE($2, briefing_id),
              metadata = $3::jsonb
        WHERE id = $1`,
      [sessionId, input.briefing_id || null, JSON.stringify(metadata)]
    );

    const job = await fetchJobForTenant(client, tenantId, session.job_id);
    if (job && ['intake', 'planned', 'ready', 'allocated'].includes(job.status)) {
      await setJobStatusIfChanged(client, job, 'in_progress', userId, 'creative_brief_saved');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (jobId) await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function addCreativeVersion(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: AddCreativeVersionInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 AND job_id = $3 LIMIT 1`,
      [tenantId, sessionId, jobId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');

    if (input.select) {
      await client.query(
        `UPDATE creative_versions
            SET selected = false
          WHERE creative_session_id = $1
            AND version_type = $2`,
        [sessionId, input.version_type]
      );
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO creative_versions (
         tenant_id, creative_session_id, job_id, version_type, source, payload, selected, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING id`,
      [tenantId, sessionId, jobId, input.version_type, input.source, JSON.stringify(input.payload || {}), Boolean(input.select), userId || null]
    );

    if (input.select && ['copy', 'caption'].includes(input.version_type)) {
      await client.query(
        `UPDATE creative_sessions
            SET selected_copy_version_id = $2
          WHERE id = $1`,
        [sessionId, inserted.rows[0].id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function selectCreativeVersion(
  tenantId: string,
  sessionId: string,
  jobId: string,
  versionId: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const versionRes = await client.query<CreativeVersionRow>(
      `SELECT * FROM creative_versions
        WHERE tenant_id = $1
          AND id = $2
          AND creative_session_id = $3
          AND job_id = $4
        LIMIT 1`,
      [tenantId, versionId, sessionId, jobId]
    );
    const version = versionRes.rows[0];
    if (!version) throw new Error('Versão criativa não encontrada.');

    await client.query(
      `UPDATE creative_versions
          SET selected = false
        WHERE creative_session_id = $1
          AND version_type = $2`,
      [sessionId, version.version_type]
    );
    await client.query(`UPDATE creative_versions SET selected = true WHERE id = $1`, [version.id]);

    if (['copy', 'caption'].includes(version.version_type)) {
      await client.query(
        `UPDATE creative_sessions SET selected_copy_version_id = $2 WHERE id = $1`,
        [sessionId, version.id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function addCreativeAsset(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: AddCreativeAssetInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 AND job_id = $3 LIMIT 1`,
      [tenantId, sessionId, jobId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');

    if (input.select) {
      await client.query(
        `UPDATE creative_assets
            SET selected = false
          WHERE creative_session_id = $1`,
        [sessionId]
      );
    }

    const assetStatus = input.select ? 'selected' : 'draft';
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO creative_assets (
         tenant_id, creative_session_id, job_id, asset_type, source, file_url, thumb_url, status, selected, metadata, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       RETURNING id`,
      [
        tenantId,
        sessionId,
        jobId,
        input.asset_type,
        input.source,
        input.file_url,
        input.thumb_url || null,
        assetStatus,
        Boolean(input.select),
        JSON.stringify(input.metadata || {}),
        userId || null,
      ]
    );

    if (input.select) {
      await client.query(
        `UPDATE creative_sessions SET selected_asset_id = $2 WHERE id = $1`,
        [sessionId, inserted.rows[0].id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function selectCreativeAsset(
  tenantId: string,
  sessionId: string,
  jobId: string,
  assetId: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assetRes = await client.query<CreativeAssetRow>(
      `SELECT * FROM creative_assets
        WHERE tenant_id = $1
          AND id = $2
          AND creative_session_id = $3
          AND job_id = $4
        LIMIT 1`,
      [tenantId, assetId, sessionId, jobId]
    );
    const asset = assetRes.rows[0];
    if (!asset) throw new Error('Asset criativo não encontrado.');

    await client.query(`UPDATE creative_assets SET selected = false WHERE creative_session_id = $1`, [sessionId]);
    await client.query(`UPDATE creative_assets SET selected = true, status = 'selected' WHERE id = $1`, [asset.id]);
    await client.query(`UPDATE creative_sessions SET selected_asset_id = $2 WHERE id = $1`, [sessionId, asset.id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function sendCreativeReview(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: SendCreativeReviewInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (!job) throw new Error('Demanda não encontrada.');

    await client.query(
      `INSERT INTO creative_reviews (
         tenant_id, creative_session_id, job_id, review_type, status, feedback, sent_by
       ) VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6)`,
      [tenantId, sessionId, jobId, input.review_type, JSON.stringify(input.payload || {}), userId || null]
    );

    const nextStage = input.review_type === 'internal' ? 'revisao' : 'aprovacao';
    const nextSessionStatus = input.review_type === 'internal' ? 'in_review' : 'awaiting_approval';
    await client.query(
      `UPDATE creative_sessions
          SET current_stage = $2,
              status = $3
        WHERE id = $1`,
      [sessionId, nextStage, nextSessionStatus]
    );

    await setJobStatusIfChanged(
      client,
      job,
      input.review_type === 'internal' ? 'in_review' : 'awaiting_approval',
      userId,
      input.review_type === 'internal' ? 'creative_review_sent' : 'creative_approval_sent'
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function resolveCreativeReview(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: ResolveCreativeReviewInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reviewRes = await client.query<CreativeReviewRow>(
      `SELECT * FROM creative_reviews
        WHERE tenant_id = $1
          AND id = $2
          AND creative_session_id = $3
          AND job_id = $4
        LIMIT 1`,
      [tenantId, input.review_id, sessionId, jobId]
    );
    const review = reviewRes.rows[0];
    if (!review) throw new Error('Revisão não encontrada.');

    await client.query(
      `UPDATE creative_reviews
          SET status = $2,
              feedback = COALESCE(feedback, '{}'::jsonb) || $3::jsonb,
              resolved_by = $4,
              resolved_at = now()
        WHERE id = $1`,
      [review.id, input.status, JSON.stringify(input.feedback || {}), userId || null]
    );

    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (!job) throw new Error('Demanda não encontrada.');

    let nextStage: CreativeStage = 'arte';
    let nextSessionStatus: CreativeSessionRow['status'] = 'active';
    let nextJobStatus = 'in_progress';

    if (input.status === 'approved') {
      if (review.review_type === 'internal') {
        nextStage = 'aprovacao';
        nextSessionStatus = 'awaiting_approval';
        nextJobStatus = 'awaiting_approval';
      } else {
        nextStage = 'exportacao';
        nextSessionStatus = 'ready_to_publish';
        nextJobStatus = 'approved';
      }
    }

    await client.query(
      `UPDATE creative_sessions
          SET current_stage = $2,
              status = $3
        WHERE id = $1`,
      [sessionId, nextStage, nextSessionStatus]
    );
    await setJobStatusIfChanged(client, job, nextJobStatus, userId, 'creative_review_resolved');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function markReadyToPublish(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: ReadyToPublishInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (!job) throw new Error('Demanda não encontrada.');

    await client.query(
      `INSERT INTO creative_publication_intents (
         tenant_id, creative_session_id, job_id, channel, scheduled_for, status, metadata
       ) VALUES ($1, $2, $3, $4, $5, 'ready', $6::jsonb)`,
      [tenantId, sessionId, jobId, input.channel || null, input.scheduled_for || null, JSON.stringify(input.metadata || {})]
    );

    await client.query(
      `UPDATE creative_sessions
          SET current_stage = 'exportacao',
              status = 'ready_to_publish'
        WHERE id = $1`,
      [sessionId]
    );
    await setJobStatusIfChanged(client, job, 'approved', userId, 'creative_ready_to_publish');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}

export async function saveCanvasDraft(
  tenantId: string,
  sessionId: string,
  jobId: string,
  userId: string | null | undefined,
  input: SaveCanvasDraftInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query<CreativeSessionRow>(
      `SELECT * FROM creative_sessions WHERE tenant_id = $1 AND id = $2 AND job_id = $3 LIMIT 1`,
      [tenantId, sessionId, jobId]
    );
    const session = sessionRes.rows[0];
    if (!session) throw new Error('Sessão criativa não encontrada.');

    const snapshot = mergeJson(session.last_canvas_snapshot, input.snapshot || {});
    await client.query(
      `UPDATE creative_sessions
          SET last_canvas_snapshot = $2::jsonb,
              current_stage = 'refino_canvas',
              status = 'active'
        WHERE id = $1`,
      [sessionId, JSON.stringify(snapshot)]
    );

    if (input.draft_asset?.file_url) {
      await client.query(
        `INSERT INTO creative_assets (
           tenant_id, creative_session_id, job_id, asset_type, source, file_url, thumb_url, status, selected, metadata, created_by
         ) VALUES ($1, $2, $3, $4, 'canvas', $5, $6, 'draft', false, $7::jsonb, $8)`,
        [
          tenantId,
          sessionId,
          jobId,
          input.draft_asset.asset_type,
          input.draft_asset.file_url,
          input.draft_asset.thumb_url || null,
          JSON.stringify(input.draft_asset.metadata || {}),
          userId || null,
        ]
      );
    }

    const job = await fetchJobForTenant(client, tenantId, jobId);
    if (job && ['intake', 'planned', 'ready', 'allocated', 'in_review', 'awaiting_approval'].includes(job.status)) {
      await setJobStatusIfChanged(client, job, 'in_progress', userId, 'canvas_draft_saved');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await syncOperationalRuntimeForJob(tenantId, jobId);
  return getCreativeSessionContextBySessionId(tenantId, sessionId);
}
