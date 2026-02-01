import { query } from '../db';
import { WORKFLOW_STAGES, WorkflowStage } from '@edro/shared/workflow';

export interface EdroClient {
  id: string;
  name: string;
  segment?: string | null;
  timezone?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EdroBriefing {
  id: string;
  client_id: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
  created_by?: string | null;
  traffic_owner?: string | null;
  meeting_url?: string | null;
  due_at?: Date | null;
  source?: string | null;
  created_at: Date;
  updated_at: Date;
  client_name?: string | null;
  current_stage?: string | null;
}

export interface EdroBriefingStage {
  id: string;
  briefing_id: string;
  stage: WorkflowStage;
  status: string;
  position: number;
  updated_by?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface EdroCopyVersion {
  id: string;
  briefing_id: string;
  language: string;
  model?: string | null;
  prompt?: string | null;
  output: string;
  payload?: Record<string, any> | null;
  created_by?: string | null;
  created_at: Date;
}

export interface EdroTask {
  id: string;
  briefing_id: string;
  type: string;
  status: string;
  assigned_to?: string | null;
  channels: string[];
  payload?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface EdroNotification {
  id: string;
  briefing_id?: string | null;
  task_id?: string | null;
  channel: string;
  recipient: string;
  status: string;
  payload?: Record<string, any> | null;
  error?: string | null;
  created_at: Date;
  sent_at?: Date | null;
}

export async function findClientByName(name: string): Promise<EdroClient | null> {
  const { rows } = await query<EdroClient>(
    `
      SELECT id, name, segment, timezone, created_at, updated_at
      FROM edro_clients
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [name]
  );
  return rows[0] || null;
}

export async function createClient(params: {
  name: string;
  segment?: string | null;
  timezone?: string | null;
}): Promise<EdroClient> {
  const { rows } = await query<EdroClient>(
    `
      INSERT INTO edro_clients (name, segment, timezone)
      VALUES ($1, $2, $3)
      RETURNING id, name, segment, timezone, created_at, updated_at
    `,
    [params.name, params.segment ?? null, params.timezone ?? null]
  );
  return rows[0];
}

export async function getOrCreateClientByName(params: {
  name: string;
  segment?: string | null;
  timezone?: string | null;
}): Promise<EdroClient> {
  const existing = await findClientByName(params.name);
  if (existing) return existing;
  return createClient(params);
}

export async function createBriefing(input: {
  clientId?: string | null;
  title: string;
  status?: string;
  payload: Record<string, any>;
  createdBy?: string | null;
  trafficOwner?: string | null;
  meetingUrl?: string | null;
  dueAt?: Date | null;
  source?: string | null;
}): Promise<EdroBriefing> {
  const { rows } = await query<EdroBriefing>(
    `
      INSERT INTO edro_briefings (
        client_id,
        title,
        status,
        payload,
        created_by,
        traffic_owner,
        meeting_url,
        due_at,
        source
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      input.clientId ?? null,
      input.title,
      input.status ?? 'briefing',
      input.payload ?? {},
      input.createdBy ?? null,
      input.trafficOwner ?? null,
      input.meetingUrl ?? null,
      input.dueAt ?? null,
      input.source ?? 'manual',
    ]
  );
  return rows[0];
}

export async function listBriefings(params?: {
  status?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}): Promise<EdroBriefing[]> {
  const filters: string[] = [];
  const values: any[] = [];

  if (params?.status) {
    values.push(params.status);
    filters.push(`b.status = $${values.length}`);
  }

  if (params?.clientId) {
    values.push(params.clientId);
    filters.push(`b.client_id = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  values.push(limit, offset);

  const { rows } = await query<EdroBriefing>(
    `
      SELECT b.*, c.name AS client_name,
        COALESCE(
          (
            SELECT stage
            FROM edro_briefing_stages s
            WHERE s.briefing_id = b.id AND s.status = 'in_progress'
            ORDER BY position
            LIMIT 1
          ),
          (
            SELECT stage
            FROM edro_briefing_stages s
            WHERE s.briefing_id = b.id AND s.status <> 'done'
            ORDER BY position
            LIMIT 1
          ),
          'done'
        ) AS current_stage
      FROM edro_briefings b
      LEFT JOIN edro_clients c ON c.id = b.client_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );
  return rows;
}

export async function getBriefingById(id: string): Promise<EdroBriefing | null> {
  const { rows } = await query<EdroBriefing>(
    `
      SELECT b.*, c.name AS client_name,
        COALESCE(
          (
            SELECT stage
            FROM edro_briefing_stages s
            WHERE s.briefing_id = b.id AND s.status = 'in_progress'
            ORDER BY position
            LIMIT 1
          ),
          (
            SELECT stage
            FROM edro_briefing_stages s
            WHERE s.briefing_id = b.id AND s.status <> 'done'
            ORDER BY position
            LIMIT 1
          ),
          'done'
        ) AS current_stage
      FROM edro_briefings b
      LEFT JOIN edro_clients c ON c.id = b.client_id
      WHERE b.id = $1
      LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

export async function updateBriefingStatus(id: string, status: string) {
  const { rows } = await query<EdroBriefing>(
    `
      UPDATE edro_briefings
      SET status = $2, updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [id, status]
  );
  return rows[0] ?? null;
}

export async function listCopyVersions(briefingId: string): Promise<EdroCopyVersion[]> {
  const { rows } = await query<EdroCopyVersion>(
    `
      SELECT *
      FROM edro_copy_versions
      WHERE briefing_id = $1
      ORDER BY created_at DESC
    `,
    [briefingId]
  );
  return rows;
}

export async function createCopyVersion(input: {
  briefingId: string;
  language: string;
  model?: string | null;
  prompt?: string | null;
  output: string;
  payload?: Record<string, any> | null;
  createdBy?: string | null;
}): Promise<EdroCopyVersion> {
  const { rows } = await query<EdroCopyVersion>(
    `
      INSERT INTO edro_copy_versions (
        briefing_id,
        language,
        model,
        prompt,
        output,
        payload,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      input.briefingId,
      input.language,
      input.model ?? null,
      input.prompt ?? null,
      input.output,
      input.payload ?? null,
      input.createdBy ?? null,
    ]
  );
  return rows[0];
}

export async function createTask(input: {
  briefingId: string;
  type: string;
  status?: string;
  assignedTo?: string | null;
  channels?: string[];
  payload?: Record<string, any> | null;
}): Promise<EdroTask> {
  const { rows } = await query<EdroTask>(
    `
      INSERT INTO edro_tasks (
        briefing_id,
        type,
        status,
        assigned_to,
        channels,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      input.briefingId,
      input.type,
      input.status ?? 'open',
      input.assignedTo ?? null,
      input.channels ?? [],
      input.payload ?? null,
    ]
  );
  return rows[0];
}

export async function listTasks(briefingId: string): Promise<EdroTask[]> {
  const { rows } = await query<EdroTask>(
    `
      SELECT *
      FROM edro_tasks
      WHERE briefing_id = $1
      ORDER BY created_at DESC
    `,
    [briefingId]
  );
  return rows;
}

export async function createNotification(input: {
  briefingId?: string | null;
  taskId?: string | null;
  channel: string;
  recipient: string;
  status?: string;
  payload?: Record<string, any> | null;
  error?: string | null;
  sentAt?: Date | null;
}): Promise<EdroNotification> {
  const { rows } = await query<EdroNotification>(
    `
      INSERT INTO edro_notifications (
        briefing_id,
        task_id,
        channel,
        recipient,
        status,
        payload,
        error,
        sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      input.briefingId ?? null,
      input.taskId ?? null,
      input.channel,
      input.recipient,
      input.status ?? 'pending',
      input.payload ?? null,
      input.error ?? null,
      input.sentAt ?? null,
    ]
  );
  return rows[0];
}

export async function updateNotificationStatus(params: {
  id: string;
  status: string;
  error?: string | null;
  sentAt?: Date | null;
}): Promise<EdroNotification | null> {
  const { rows } = await query<EdroNotification>(
    `
      UPDATE edro_notifications
      SET status = $2,
          error = $3,
          sent_at = COALESCE($4, sent_at)
      WHERE id = $1
      RETURNING *
    `,
    [params.id, params.status, params.error ?? null, params.sentAt ?? null]
  );
  return rows[0] ?? null;
}

export async function listBriefingStages(briefingId: string): Promise<EdroBriefingStage[]> {
  const { rows } = await query<EdroBriefingStage>(
    `
      SELECT *
      FROM edro_briefing_stages
      WHERE briefing_id = $1
      ORDER BY position ASC
    `,
    [briefingId]
  );
  return rows;
}

export async function ensureBriefingStages(briefingId: string, updatedBy?: string | null) {
  const stages = await listBriefingStages(briefingId);
  if (stages.length) return stages;
  return createBriefingStages(briefingId, updatedBy);
}

export async function createBriefingStages(
  briefingId: string,
  updatedBy?: string | null
): Promise<EdroBriefingStage[]> {
  const values: any[] = [];
  const rowsSql: string[] = [];

  WORKFLOW_STAGES.forEach((stage, index) => {
    const status = index === 0 ? 'in_progress' : 'pending';
    const baseIndex = values.length;
    values.push(briefingId, stage, status, index, updatedBy ?? null, {});
    rowsSql.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}::jsonb)`);
  });

  const { rows } = await query<EdroBriefingStage>(
    `
      INSERT INTO edro_briefing_stages (
        briefing_id,
        stage,
        status,
        position,
        updated_by,
        metadata
      )
      VALUES ${rowsSql.join(', ')}
      RETURNING *
    `,
    values
  );

  await updateBriefingStatus(briefingId, WORKFLOW_STAGES[0]);
  return rows.sort((a, b) => a.position - b.position);
}

export async function updateBriefingStageStatus(params: {
  briefingId: string;
  stage: WorkflowStage;
  status: string;
  updatedBy?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<EdroBriefingStage | null> {
  const { rows } = await query<EdroBriefingStage>(
    `
      UPDATE edro_briefing_stages
      SET status = $3,
          updated_by = $4,
          metadata = COALESCE($5::jsonb, metadata),
          updated_at = now()
      WHERE briefing_id = $1 AND stage = $2
      RETURNING *
    `,
    [
      params.briefingId,
      params.stage,
      params.status,
      params.updatedBy ?? null,
      params.metadata ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function listAllTasks(filters?: {
  briefingId?: string;
  status?: string;
  type?: string;
  assignedTo?: string;
}): Promise<EdroTask[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters?.briefingId) {
    conditions.push(`briefing_id = $${paramIndex++}`);
    values.push(filters.briefingId);
  }

  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }

  if (filters?.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(filters.type);
  }

  if (filters?.assignedTo) {
    conditions.push(`assigned_to = $${paramIndex++}`);
    values.push(filters.assignedTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query<EdroTask>(
    `
      SELECT *
      FROM edro_tasks
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values
  );
  return rows;
}

export async function getTaskById(taskId: string): Promise<EdroTask | null> {
  const { rows } = await query<EdroTask>(
    `
      SELECT *
      FROM edro_tasks
      WHERE id = $1
    `,
    [taskId]
  );
  return rows[0] ?? null;
}

export async function updateTaskStatus(params: {
  taskId: string;
  status: string;
  payload?: Record<string, any> | null;
}): Promise<EdroTask | null> {
  const { rows } = await query<EdroTask>(
    `
      UPDATE edro_tasks
      SET status = $2,
          payload = COALESCE($3::jsonb, payload),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [params.taskId, params.status, params.payload ?? null]
  );
  return rows[0] ?? null;
}
