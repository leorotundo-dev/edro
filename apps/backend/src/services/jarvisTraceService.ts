import { query } from '../db';
import type { ClientKnowledgeBaseSnapshot } from './clientKnowledgeBaseService';
import type { JarvisConfidenceAssessment } from './jarvisExecutionService';

export type JarvisTracePreviewItem = {
  fact_type: string | null;
  fingerprint: string | null;
  title: string;
  summary: string | null;
  source_type: string | null;
  source_id: string | null;
  related_at: string | null;
  confidence_score: number | null;
};

export function buildJarvisTraceEvidence(snapshot?: ClientKnowledgeBaseSnapshot | null): JarvisTracePreviewItem[] {
  if (!snapshot) return [];
  return [
    ...(snapshot.directives || []).slice(0, 2).map((item) => ({
      fact_type: item.fact_type,
      fingerprint: item.fingerprint,
      title: item.title,
      summary: item.summary || item.fact_text || null,
      source_type: item.source_type,
      source_id: item.source_id,
      related_at: item.related_at,
      confidence_score: Number(item.confidence_score ?? 0),
    })),
    ...(snapshot.commitments || []).slice(0, 2).map((item) => ({
      fact_type: item.fact_type,
      fingerprint: item.fingerprint,
      title: item.title,
      summary: item.summary || item.fact_text || null,
      source_type: item.source_type,
      source_id: item.source_id,
      related_at: item.related_at,
      confidence_score: Number(item.confidence_score ?? 0),
    })),
    ...(snapshot.evidence || []).slice(0, 3).map((item) => ({
      fact_type: item.fact_type,
      fingerprint: item.fingerprint,
      title: item.title,
      summary: item.summary || item.fact_text || null,
      source_type: item.source_type,
      source_id: item.source_id,
      related_at: item.related_at,
      confidence_score: Number(item.confidence_score ?? 0),
    })),
  ].filter((item) => item.title);
}

export function buildJarvisSuppressedFacts(snapshot?: ClientKnowledgeBaseSnapshot | null) {
  if (!snapshot?.governance?.suppressed_facts) return [];
  const previews = (snapshot.governance.suppressed_fact_previews || []).slice(0, 3);
  if (previews.length) {
    return previews.map((item) => ({
      fact_type: item.fact_type,
      fingerprint: item.fingerprint,
      title: item.title,
      summary: item.summary || item.fact_text || null,
      source_type: item.source_type,
      source_id: item.source_id,
      related_at: item.related_at,
      confidence_score: Number(item.confidence_score ?? 0),
    }));
  }
  return [
    {
      fact_type: 'governance',
      fingerprint: null,
      title: `${snapshot.governance.suppressed_facts} fatos suprimidos por governança`,
      summary: 'Fatos atenuados para evitar conflito, staleness ou deriva operacional.',
      source_type: 'memory_governance',
      source_id: null,
      related_at: snapshot.generated_at,
      confidence_score: null,
    },
  ];
}

export async function recordJarvisDecisionTrace(params: {
  tenantId: string;
  clientId?: string | null;
  edroClientId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
  route: 'operations' | 'planning';
  intent: string;
  taskType: string;
  actorProfile: string;
  confidence: JarvisConfidenceAssessment;
  message: string;
  response: string;
  evidence: JarvisTracePreviewItem[];
  suppressedFacts: JarvisTracePreviewItem[];
  governance?: Record<string, any> | null;
  toolSummary?: Array<Record<string, any>>;
  artifacts?: Array<Record<string, any>>;
  metadata?: Record<string, any> | null;
}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO jarvis_decision_traces (
       tenant_id, client_id, edro_client_id, conversation_id, user_id,
       route, intent, task_type, actor_profile, confidence_score,
       confidence_band, confidence_mode, message_excerpt, response_excerpt,
       evidence, suppressed_facts, governance, tool_summary, artifacts, metadata
     )
     VALUES (
       $1, $2, $3::uuid, $4::uuid, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $13, $14,
       $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb
     )
     RETURNING id`,
    [
      params.tenantId,
      params.clientId || null,
      params.edroClientId || null,
      params.conversationId || null,
      params.userId || null,
      params.route,
      params.intent,
      params.taskType,
      params.actorProfile,
      params.confidence.score,
      params.confidence.band,
      params.confidence.mode,
      String(params.message || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
      String(params.response || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
      JSON.stringify(params.evidence || []),
      JSON.stringify(params.suppressedFacts || []),
      JSON.stringify(params.governance || {}),
      JSON.stringify(params.toolSummary || []),
      JSON.stringify(params.artifacts || []),
      JSON.stringify(params.metadata || {}),
    ],
  );
  return rows[0]?.id || null;
}
