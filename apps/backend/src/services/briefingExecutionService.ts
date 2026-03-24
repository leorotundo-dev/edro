import { query } from '../db';
import { getBriefingById } from '../repositories/edroBriefingRepository';

type BriefingLike = {
  id: string;
  title?: string | null;
  status?: string | null;
  payload?: Record<string, any> | null;
  copy_approved_at?: string | Date | null;
  copy_approval_comment?: string | null;
};

export type BriefingApprovedCopy = {
  text: string;
  source: 'execution_snapshot' | 'copy_version' | 'payload';
  approved_at: string | null;
  comment: string | null;
};

export type BriefingExecutionSnapshot = {
  execution_ready: boolean;
  execution_ready_at: string | null;
  blocking_reasons: string[];
  job_mode: 'copy_ready' | 'visual_only';
  requires_copy: boolean;
  objective: string | null;
  format: string | null;
  platform: string | null;
  references: string[];
  visual_instructions: string[];
  mandatory_elements: string[];
  restrictions: string[];
  definition_of_done: string[];
  approved_copy: BriefingApprovedCopy | null;
};

const FREELANCER_VISIBLE_STATUSES = new Set([
  'producao',
  'ajustes',
  'aprovacao_interna',
  'aprovacao_cliente',
  'concluido',
]);

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean) as string[])];
}

function flattenStringish(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    return uniqueStrings(
      value
        .split(/\r?\n|,|;|\|/)
        .map((item) => item.trim()),
    );
  }
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (item && typeof item === 'object') {
          const record = item as Record<string, any>;
          return [
            record.title,
            record.label,
            record.name,
            record.url,
            record.href,
            record.text,
            record.value,
          ].filter(Boolean);
        }
        return [];
      }),
    );
  }
  if (typeof value === 'object') {
    const record = value as Record<string, any>;
    return uniqueStrings([
      record.title,
      record.label,
      record.name,
      record.url,
      record.href,
      record.text,
      record.value,
    ]);
  }
  return [];
}

function pickFirstText(payload: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeText(payload[key]);
    if (value) return value;
  }
  return null;
}

function collectList(payload: Record<string, any>, keys: string[]): string[] {
  return uniqueStrings(keys.flatMap((key) => flattenStringish(payload[key])));
}

function parseExecutionReadyAt(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatStructuredCopy(payload: Record<string, any>): string | null {
  const lines = uniqueStrings([
    pickFirstText(payload, ['headline', 'title_copy', 'hook', 'hook_text']),
    pickFirstText(payload, ['body', 'body_text', 'content_text', 'copy_body']),
    pickFirstText(payload, ['cta', 'cta_text']),
    pickFirstText(payload, ['caption', 'legend', 'copy_caption']),
  ]);
  return lines.length ? lines.join('\n\n') : null;
}

export function inferBriefingRequiresCopy(payloadInput: Record<string, any> | null | undefined): boolean {
  const payload = asRecord(payloadInput);
  const explicit = payload.requires_copy ?? payload.execution_snapshot?.requires_copy ?? null;
  if (typeof explicit === 'boolean') return explicit;

  const directCopyFields = [
    'copy',
    'generated_copy',
    'approved_copy',
    'copy_text',
    'caption',
    'headline',
    'body',
    'cta',
    'hook_text',
    'content_text',
    'cta_text',
  ].some((key) => normalizeText(payload[key]));
  if (directCopyFields) return true;

  const descriptor = uniqueStrings([
    payload.format,
    payload.content_type,
    payload.production_type,
    payload.task_type,
    payload.taskType,
    payload.piece_type,
    payload.asset_type,
    payload.title,
  ])
    .join(' ')
    .toLowerCase();

  if (!descriptor) return false;

  const copySignals = [
    'copy',
    'texto',
    'caption',
    'headline',
    'carrossel',
    'carousel',
    'post',
    'story',
    'stories',
    'reels',
    'reel',
    'anuncio',
    'anúncio',
    'ads',
    'email',
    'landing',
  ];

  const visualOnlySignals = [
    'resize',
    'desdobramento',
    'adaptacao',
    'adaptação',
    'adaptacao visual',
    'adaptação visual',
    'motion',
    'diagrama',
    'diagramação',
    'tratamento de imagem',
    'visual-only',
    'visual only',
  ];

  if (visualOnlySignals.some((signal) => descriptor.includes(signal))) {
    return false;
  }

  return copySignals.some((signal) => descriptor.includes(signal));
}

async function resolveApprovedCopy(briefing: BriefingLike): Promise<BriefingApprovedCopy | null> {
  const payload = asRecord(briefing.payload);
  const existingSnapshot = asRecord(payload.execution_snapshot);
  const existingText = normalizeText(existingSnapshot.approved_copy?.text);
  if (existingText) {
    return {
      text: existingText,
      source: 'execution_snapshot',
      approved_at: parseExecutionReadyAt(existingSnapshot.approved_copy?.approved_at ?? existingSnapshot.execution_ready_at),
      comment: normalizeText(existingSnapshot.approved_copy?.comment),
    };
  }

  const { rows } = await query<{
    output: string;
    status: string | null;
    draft_approved_at?: string | null;
    created_at: string;
  }>(
    `SELECT output, status, draft_approved_at, created_at
       FROM edro_copy_versions
      WHERE briefing_id = $1
        AND status IN ('selected', 'approved')
      ORDER BY
        CASE status
          WHEN 'selected' THEN 0
          WHEN 'approved' THEN 1
          ELSE 2
        END,
        COALESCE(draft_approved_at, created_at) DESC
      LIMIT 1`,
    [briefing.id],
  );

  const preferred = rows[0];
  if (preferred?.output?.trim()) {
    return {
      text: preferred.output.trim(),
      source: 'copy_version',
      approved_at: parseExecutionReadyAt(preferred.draft_approved_at ?? preferred.created_at),
      comment: normalizeText(briefing.copy_approval_comment),
    };
  }

  if (briefing.copy_approved_at) {
    const payloadCopy =
      normalizeText(payload.copy) ||
      normalizeText(payload.generated_copy) ||
      normalizeText(payload.copy_text) ||
      formatStructuredCopy(payload);

    if (payloadCopy) {
      return {
        text: payloadCopy,
        source: 'payload',
        approved_at: parseExecutionReadyAt(briefing.copy_approved_at),
        comment: normalizeText(briefing.copy_approval_comment),
      };
    }
  }

  return null;
}

export async function buildBriefingExecutionSnapshot(
  briefingInput: BriefingLike,
): Promise<BriefingExecutionSnapshot> {
  const briefing = {
    ...briefingInput,
    payload: asRecord(briefingInput.payload),
  };
  const payload = briefing.payload!;
  const existingSnapshot = asRecord(payload.execution_snapshot);
  const requiresCopy = inferBriefingRequiresCopy(payload);
  const approvedCopy = await resolveApprovedCopy(briefing);

  const objective = pickFirstText(payload, ['objective', 'goal', 'context', 'campaign_objective']);
  const format = pickFirstText(payload, ['format', 'piece_type', 'asset_type', 'content_type']);
  const platform = pickFirstText(payload, ['platform', 'channel', 'primary_channel']);
  const references = collectList(payload, [
    'references',
    'reference_links',
    'links',
    'inspiration_links',
    'web_research_articles',
    'web_research_refs',
  ]);
  const visualInstructions = uniqueStrings([
    ...collectList(payload, ['visual_instructions', 'instructions', 'directions', 'design_notes']),
    pickFirstText(payload, ['notes', 'additional_notes', 'visual_direction', 'key_message']),
  ]);
  const mandatoryElements = collectList(payload, ['mandatory_elements', 'must_have', 'assets_required']);
  const restrictions = collectList(payload, ['restrictions', 'do_not', 'avoid']);
  const definitionOfDone = collectList(payload, ['definition_of_done', 'done_criteria']);

  const blockingReasons: string[] = [];
  if (!objective) blockingReasons.push('Objetivo operacional não definido.');
  if (!format && !platform) blockingReasons.push('Formato ou plataforma não definidos.');
  if (visualInstructions.length === 0 && references.length === 0 && mandatoryElements.length === 0) {
    blockingReasons.push('Instruções visuais insuficientes para execução.');
  }
  if (requiresCopy && !approvedCopy?.text) {
    blockingReasons.push('A copy aprovada ainda não está disponível para execução.');
  }

  const executionReady = blockingReasons.length === 0;
  const executionReadyAt =
    executionReady
      ? parseExecutionReadyAt(existingSnapshot.execution_ready_at) || new Date().toISOString()
      : null;

  return {
    execution_ready: executionReady,
    execution_ready_at: executionReadyAt,
    blocking_reasons: blockingReasons,
    job_mode: requiresCopy ? 'copy_ready' : 'visual_only',
    requires_copy: requiresCopy,
    objective,
    format,
    platform,
    references,
    visual_instructions: visualInstructions,
    mandatory_elements: mandatoryElements,
    restrictions,
    definition_of_done: definitionOfDone,
    approved_copy: approvedCopy,
  };
}

export async function syncBriefingExecutionSnapshot(
  briefingId: string,
  briefingInput?: BriefingLike | null,
): Promise<BriefingExecutionSnapshot | null> {
  const briefing = briefingInput ?? await getBriefingById(briefingId);
  if (!briefing) return null;

  const snapshot = await buildBriefingExecutionSnapshot({
    id: briefing.id,
    title: briefing.title,
    status: briefing.status,
    payload: briefing.payload,
    copy_approved_at: (briefing as any).copy_approved_at ?? null,
    copy_approval_comment: (briefing as any).copy_approval_comment ?? null,
  });

  await query(
    `UPDATE edro_briefings
        SET payload = jsonb_set(
          COALESCE(payload, '{}'::jsonb),
          '{execution_snapshot}',
          $2::jsonb,
          true
        ),
            updated_at = now()
      WHERE id = $1`,
    [briefingId, JSON.stringify(snapshot)],
  );

  return snapshot;
}

export async function ensureBriefingExecutionReady(
  briefingId: string,
  briefingInput?: BriefingLike | null,
): Promise<{ ok: boolean; error?: string; snapshot: BriefingExecutionSnapshot | null }> {
  const snapshot = await syncBriefingExecutionSnapshot(briefingId, briefingInput);
  if (!snapshot) {
    return { ok: false, error: 'briefing_not_found', snapshot: null };
  }

  if (!snapshot.execution_ready) {
    return {
      ok: false,
      error: snapshot.blocking_reasons[0] ?? 'briefing_not_ready_for_execution',
      snapshot,
    };
  }

  return { ok: true, snapshot };
}

export function isFreelancerVisibleBriefingStatus(status?: string | null): boolean {
  return FREELANCER_VISIBLE_STATUSES.has(String(status || '').trim().toLowerCase());
}

export function attachExecutionSnapshotToPayload(
  payloadInput: Record<string, any> | null | undefined,
  snapshot: BriefingExecutionSnapshot | null,
): Record<string, any> | null {
  const payload = asRecord(payloadInput);
  if (!snapshot) return Object.keys(payload).length ? payload : null;
  return {
    ...payload,
    execution_snapshot: snapshot,
  };
}
