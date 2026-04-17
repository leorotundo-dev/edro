import { createHash } from 'crypto';
import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';

export type DemandSourceType =
  | 'trello_webhook'
  | 'portal_briefing'
  | 'ai_opportunity'
  | 'meeting_action'
  | 'whatsapp_insight'
  | 'gmail_thread'
  | 'calendar_signal';
export type DemandIntakeStatus = 'eligible' | 'needs_internal_triage' | 'ignored';

type DemandSourceRef = Record<string, string | number | boolean | null | undefined>;

export type DemandSource = {
  type: DemandSourceType;
  id: string;
  occurredAt?: string | null;
  refs?: DemandSourceRef;
};

export type DemandSummary = {
  title: string;
  description?: string | null;
  objective?: string | null;
  platform?: string | null;
  deadline?: string | null;
  priorityHint?: string | null;
};

export type DemandIntakeInput = {
  tenantId: string;
  clientId?: string | null;
  source: DemandSource;
  summary: DemandSummary;
  payload?: Record<string, any> | null;
};

type DemandQueuePayload = {
  version: 1;
  fingerprint: string;
  received_at: string;
  source: DemandSource;
  client_id: string | null;
  summary: DemandSummary;
  payload: Record<string, any> | null;
};

export type DemandCandidate = {
  status: DemandIntakeStatus;
  demandKind: string;
  title: string;
  summary: string;
  clientId: string | null;
  priorityHint: string | null;
  platform: string | null;
  deadline: string | null;
  nextStep: 'briefing_compile' | 'internal_triage' | 'ignore';
  reasons: string[];
};

function normalizeText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function buildFingerprint(input: DemandIntakeInput) {
  const parts = [
    input.tenantId,
    input.source.type,
    input.source.id,
    normalizeText(input.summary.title),
    normalizeText(input.summary.description),
    normalizeText(input.summary.objective),
    input.clientId ?? '',
  ];
  return createHash('sha1').update(parts.join('|')).digest('hex');
}

async function findExistingDemandJob(tenantId: string, fingerprint: string) {
  const { rows } = await query<{ id: string; status: string }>(
    `SELECT id, status
       FROM job_queue
      WHERE tenant_id = $1
        AND type = 'demand_intake'
        AND payload->>'fingerprint' = $2
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 1`,
    [tenantId, fingerprint],
  );
  return rows[0] ?? null;
}

async function resolveTrelloBoardClientId(tenantId: string, source: DemandSource) {
  const boardId = normalizeText(source.refs?.trello_board_id);
  if (!boardId) return null;
  const { rows } = await query<{ client_id: string | null }>(
    `SELECT client_id
       FROM project_boards
      WHERE tenant_id = $1
        AND trello_board_id = $2
      LIMIT 1`,
    [tenantId, boardId],
  );
  return rows[0]?.client_id ?? null;
}

function buildDemandSummary(summary: DemandSummary) {
  return normalizeText(summary.description || summary.objective || summary.title);
}

async function classifyDemand(tenantId: string, payload: DemandQueuePayload): Promise<DemandCandidate> {
  const title = normalizeText(payload.summary.title, 'Demanda sem título');
  const summaryText = buildDemandSummary(payload.summary);
  const reasons: string[] = [];
  let clientId = payload.client_id ?? null;

  if (payload.source.type === 'trello_webhook') {
    clientId = clientId || await resolveTrelloBoardClientId(tenantId, payload.source);
  }

  switch (payload.source.type) {
    case 'portal_briefing': {
      if (!summaryText || summaryText.length < 10) {
        reasons.push('briefing_submit_sem_objetivo_suficiente');
        return {
          status: 'needs_internal_triage',
          demandKind: 'client_briefing',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('briefing_cliente_submetido');
      return {
        status: 'eligible',
        demandKind: 'client_briefing',
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
    case 'ai_opportunity': {
      reasons.push('oportunidade_detectada_pelo_sistema');
      return {
        status: 'eligible',
        demandKind: 'detected_opportunity',
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
    case 'trello_webhook': {
      const actionType = normalizeText(payload.source.refs?.action_type);
      const closed = String(payload.source.refs?.card_closed || '').trim() === 'true';
      if (!['createCard', 'copyCard', 'convertToCardFromCheckItem', 'updateCard'].includes(actionType) || closed) {
        reasons.push('evento_trello_sem_demanda_criativa_elegivel');
        return {
          status: 'ignored',
          demandKind: 'trello_event',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'ignore',
          reasons,
        };
      }
      if (!clientId) {
        reasons.push('card_trello_sem_cliente_vinculado');
        return {
          status: 'needs_internal_triage',
          demandKind: 'trello_card',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('card_trello_detectado_como_demanda');
      return {
        status: 'eligible',
        demandKind: 'trello_card',
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
    case 'meeting_action': {
      if (!clientId) {
        reasons.push('acao_de_reuniao_sem_cliente_vinculado');
        return {
          status: 'needs_internal_triage',
          demandKind: 'meeting_action',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('acao_de_reuniao_compilada');
      return {
        status: 'eligible',
        demandKind: `meeting_${normalizeText(payload.source.refs?.meeting_action_type, 'action')}`,
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
    case 'whatsapp_insight': {
      const insightType = normalizeText(payload.source.refs?.insight_type, 'request');
      if (!clientId) {
        reasons.push('insight_whatsapp_sem_cliente_vinculado');
        return {
          status: 'needs_internal_triage',
          demandKind: 'whatsapp_signal',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('sinal_whatsapp_detectado');
      return {
        status: insightType === 'request' || insightType === 'deadline' ? 'eligible' : 'needs_internal_triage',
        demandKind: `whatsapp_${insightType}`,
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: insightType === 'request' || insightType === 'deadline' ? 'briefing_compile' : 'internal_triage',
        reasons,
      };
    }
    case 'gmail_thread': {
      if (!clientId || !summaryText || summaryText.length < 15) {
        reasons.push('email_sem_contexto_suficiente_para_compilar');
        return {
          status: 'needs_internal_triage',
          demandKind: 'gmail_thread',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('email_cliente_detectado_como_demanda');
      return {
        status: 'eligible',
        demandKind: 'gmail_thread',
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
    case 'calendar_signal': {
      if (!clientId) {
        reasons.push('sinal_de_calendario_sem_cliente_vinculado');
        return {
          status: 'needs_internal_triage',
          demandKind: 'calendar_signal',
          title,
          summary: summaryText,
          clientId,
          priorityHint: payload.summary.priorityHint ?? null,
          platform: payload.summary.platform ?? null,
          deadline: payload.summary.deadline ?? null,
          nextStep: 'internal_triage',
          reasons,
        };
      }
      reasons.push('data_relevante_detectada_no_calendario');
      return {
        status: 'eligible',
        demandKind: 'calendar_signal',
        title,
        summary: summaryText,
        clientId,
        priorityHint: payload.summary.priorityHint ?? null,
        platform: payload.summary.platform ?? null,
        deadline: payload.summary.deadline ?? null,
        nextStep: 'briefing_compile',
        reasons,
      };
    }
  }
}

export async function enqueueDemandIntake(input: DemandIntakeInput) {
  const fingerprint = buildFingerprint(input);
  const existing = await findExistingDemandJob(input.tenantId, fingerprint);
  if (existing) {
    return { jobId: existing.id, deduped: true, fingerprint, status: existing.status };
  }

  const payload: DemandQueuePayload = {
    version: 1,
    fingerprint,
    received_at: new Date().toISOString(),
    source: input.source,
    client_id: input.clientId ?? null,
    summary: input.summary,
    payload: input.payload ?? null,
  };

  const job = await enqueueJob(input.tenantId, 'demand_intake', payload);
  return { jobId: String(job.id), deduped: false, fingerprint, status: 'queued' as const };
}

export async function processDemandIntakePayload(tenantId: string, payload: DemandQueuePayload) {
  const candidate = await classifyDemand(tenantId, payload);
  return {
    processed_at: new Date().toISOString(),
    fingerprint: payload.fingerprint,
    candidate,
  };
}
