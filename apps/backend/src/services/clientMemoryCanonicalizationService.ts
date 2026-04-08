import { query } from '../db';
import { upsertCanonicalClientMemoryFact } from './clientMemoryFactsService';

type WhatsAppInsightRow = {
  id: string;
  insight_type: string;
  effective_summary: string;
  sentiment: string | null;
  urgency: string | null;
  entities: Record<string, any> | null;
  confidence: number | null;
  created_at: string | null;
  confirmation_status: string | null;
};

function shortText(value: string, max = 140) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function mapUrgencyToPriority(urgency: string | null) {
  if (urgency === 'urgent') return 'high';
  if (urgency === 'low') return 'low';
  return 'medium';
}

function parseDateCandidate(raw: string | null | undefined) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return null;
}

function extractDeadline(insight: WhatsAppInsightRow) {
  const entityDates = Array.isArray(insight.entities?.dates) ? insight.entities?.dates : [];
  for (const candidate of entityDates) {
    const parsed = parseDateCandidate(candidate);
    if (parsed) return parsed;
  }
  return parseDateCandidate(insight.effective_summary);
}

function extractDeliverableTitle(insight: WhatsAppInsightRow) {
  const deliverables = Array.isArray(insight.entities?.deliverables) ? insight.entities?.deliverables : [];
  const topics = Array.isArray(insight.entities?.topics) ? insight.entities?.topics : [];
  const first = String(deliverables[0] || topics[0] || '').trim();
  return first ? shortText(first, 80) : '';
}

export async function materializeCanonicalClientMemoryFacts(params: {
  tenantId: string;
  clientId: string;
}) {
  const { rows } = await query<WhatsAppInsightRow>(
    `SELECT id::text,
            insight_type,
            COALESCE(NULLIF(corrected_summary, ''), summary) AS effective_summary,
            sentiment,
            urgency,
            entities,
            confidence::float,
            created_at::text,
            confirmation_status
       FROM whatsapp_message_insights
      WHERE tenant_id = $1
        AND client_id = $2
        AND COALESCE(confirmation_status, 'pending') IN ('confirmed', 'corrected')
        AND created_at > NOW() - INTERVAL '120 days'
      ORDER BY created_at DESC
      LIMIT 60`,
    [params.tenantId, params.clientId],
  ).catch(() => ({ rows: [] as WhatsAppInsightRow[] }));

  let promoted = 0;

  for (const insight of rows) {
    const summary = String(insight.effective_summary || '').trim();
    if (!summary) continue;

    if (insight.insight_type === 'deadline') {
      const deliverable = extractDeliverableTitle(insight);
      const title = deliverable
        ? `Prazo combinado: ${deliverable}`
        : `Prazo sinalizado via WhatsApp`;
      const result = await upsertCanonicalClientMemoryFact({
        tenantId: params.tenantId,
        clientId: params.clientId,
        factType: 'commitment',
        sourceType: 'whatsapp_insight_deadline',
        sourceId: insight.id,
        title,
        factText: summary,
        summary,
        relatedAt: insight.created_at,
        deadline: extractDeadline(insight),
        priority: mapUrgencyToPriority(insight.urgency),
        confidenceScore: insight.confidence ?? 0.88,
        metadata: {
          insight_type: insight.insight_type,
          confirmation_status: insight.confirmation_status,
        },
      });
      if (result) promoted += 1;
      continue;
    }

    if (insight.insight_type === 'request') {
      const deliverable = extractDeliverableTitle(insight);
      const title = deliverable
        ? `Pedido do cliente: ${deliverable}`
        : `Pedido do cliente via WhatsApp`;
      const result = await upsertCanonicalClientMemoryFact({
        tenantId: params.tenantId,
        clientId: params.clientId,
        factType: 'commitment',
        sourceType: 'whatsapp_insight_request',
        sourceId: insight.id,
        title,
        factText: summary,
        summary,
        relatedAt: insight.created_at,
        deadline: extractDeadline(insight),
        priority: mapUrgencyToPriority(insight.urgency),
        confidenceScore: insight.confidence ?? 0.84,
        metadata: {
          insight_type: insight.insight_type,
          confirmation_status: insight.confirmation_status,
          sentiment: insight.sentiment,
        },
      });
      if (result) promoted += 1;
    }
  }

  return {
    scanned: rows.length,
    promoted,
  };
}

