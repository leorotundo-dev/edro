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

type ClientDocumentRow = {
  id: string;
  source_type: string | null;
  title: string | null;
  content_excerpt: string | null;
  content_text: string | null;
  created_at: string | null;
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

function splitDocumentLines(text: string) {
  return String(text || '')
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => shortText(line, 220))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 18);
}

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function detectDirectiveCandidate(line: string) {
  const normalized = normalize(line);
  const avoidPatterns = [
    /\bevitar\b/,
    /\bnao usar\b/,
    /\bnão usar\b/,
    /\bnao queremos\b/,
    /\bnão queremos\b/,
    /\bsem tom\b/,
    /\btom menos\b/,
    /\blinguagem menos\b/,
  ];
  const boostPatterns = [
    /\bprefere(?:mos|ncia)?\b/,
    /\bpriorizar\b/,
    /\benfatizar\b/,
    /\bdestacar\b/,
    /\breforcar\b/,
    /\breforçar\b/,
    /\btom mais\b/,
    /\blinguagem mais\b/,
  ];

  if (avoidPatterns.some((pattern) => pattern.test(normalized))) {
    return { directiveType: 'avoid' as const, confidence: 0.83 };
  }
  if (boostPatterns.some((pattern) => pattern.test(normalized))) {
    return { directiveType: 'boost' as const, confidence: 0.79 };
  }
  return null;
}

function detectDecisionCandidate(line: string) {
  const normalized = normalize(line);
  const patterns = [
    /\bficou decidido\b/,
    /\bdecidimos\b/,
    /\bdefinimos\b/,
    /\balinhado\b/,
    /\baprovado\b/,
    /\bseguiremos\b/,
    /\bvamos seguir\b/,
    /\bok seguir\b/,
    /\bdecisao\b/,
    /\bdecisão\b/,
  ];
  if (!patterns.some((pattern) => pattern.test(normalized))) return null;
  return { confidence: 0.82 };
}

function detectObjectionCandidate(line: string) {
  const normalized = normalize(line);
  const patterns = [
    /\bpreocupacao\b/,
    /\bpreocupação\b/,
    /\breceio\b/,
    /\bobje[cç][aã]o\b/,
    /\bnao faz sentido\b/,
    /\bnão faz sentido\b/,
    /\bnao gostamos\b/,
    /\bnão gostamos\b/,
    /\bnao queremos\b/,
    /\bnão queremos\b/,
    /\brisco\b/,
    /\bdificuldade\b/,
    /\bproblema\b/,
  ];
  if (!patterns.some((pattern) => pattern.test(normalized))) return null;
  return { confidence: 0.78 };
}

function detectEmailCommitmentCandidate(line: string) {
  const normalized = normalize(line);
  const hasDate = Boolean(parseDateCandidate(line));
  const actionPatterns = [
    /\benviar\b/,
    /\bentregar\b/,
    /\bajustar\b/,
    /\baprovar\b/,
    /\bvalidar\b/,
    /\bcompartilhar\b/,
    /\bretornar\b/,
    /\bpublicar\b/,
    /\bsubir\b/,
    /\bficou combinado\b/,
    /\bcombinado\b/,
    /\bprazo\b/,
    /\bate\b/,
    /\baté\b/,
  ];
  if (!hasDate) return null;
  if (!actionPatterns.some((pattern) => pattern.test(normalized))) return null;
  return { confidence: /\bficou combinado\b|\bcombinado\b|\bprazo\b/.test(normalized) ? 0.86 : 0.8 };
}

export async function materializeCanonicalClientMemoryFacts(params: {
  tenantId: string;
  clientId: string;
}) {
  const [insightRes, docRes] = await Promise.all([
    query<WhatsAppInsightRow>(
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
    ).catch(() => ({ rows: [] as WhatsAppInsightRow[] })),
    query<ClientDocumentRow>(
      `SELECT id::text,
              source_type,
              title,
              content_excerpt,
              content_text,
              COALESCE(published_at, created_at)::text AS created_at
         FROM client_documents
        WHERE tenant_id = $1
          AND client_id = $2
          AND source_type = ANY($3::text[])
          AND COALESCE(published_at, created_at) > NOW() - INTERVAL '60 days'
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 30`,
      [params.tenantId, params.clientId, ['gmail_message', 'meeting', 'meeting_chat']],
    ).catch(() => ({ rows: [] as ClientDocumentRow[] })),
  ]);
  const rows = insightRes.rows;
  const docRows = docRes.rows;

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

  for (const doc of docRows) {
    const body = [doc.title, doc.content_excerpt, doc.content_text].filter(Boolean).join('\n');
    const lines = splitDocumentLines(body).slice(0, 10);

    let directivesPromotedForDoc = 0;
    let commitmentPromotedForDoc = false;
    let decisionPromotedForDoc = false;
    let objectionPromotedForDoc = false;

    for (const [index, line] of lines.entries()) {
      if (directivesPromotedForDoc < 2) {
        const directive = detectDirectiveCandidate(line);
        if (directive) {
          const sourceLabel = doc.source_type === 'gmail_message' ? 'email' : 'reuniao';
          const result = await upsertCanonicalClientMemoryFact({
            tenantId: params.tenantId,
            clientId: params.clientId,
            factType: 'directive',
            sourceType: `${sourceLabel}_directive`,
            sourceId: `${doc.id}:directive:${index}`,
            title: shortText(line, 110),
            factText: line,
            summary: shortText(`${doc.title || 'Sem titulo'} | ${line}`, 180),
            relatedAt: doc.created_at,
            confidenceScore: directive.confidence,
            metadata: {
              source_document_type: doc.source_type,
              source_document_title: doc.title,
              directive_type: directive.directiveType,
            },
          });
          if (result) {
            promoted += 1;
            directivesPromotedForDoc += 1;
          }
        }
      }

      if (!decisionPromotedForDoc) {
        const decision = detectDecisionCandidate(line);
        if (decision) {
          const sourceLabel = doc.source_type === 'gmail_message' ? 'email' : 'reuniao';
          const result = await upsertCanonicalClientMemoryFact({
            tenantId: params.tenantId,
            clientId: params.clientId,
            factType: 'evidence',
            sourceType: `${sourceLabel}_decision`,
            sourceId: `${doc.id}:decision:${index}`,
            title: `Decisão registrada: ${shortText(line, 80)}`,
            factText: line,
            summary: shortText(`${doc.title || 'Sem titulo'} | ${line}`, 180),
            relatedAt: doc.created_at,
            confidenceScore: decision.confidence,
            metadata: {
              source_document_type: doc.source_type,
              source_document_title: doc.title,
              semantic_type: 'decision',
            },
          });
          if (result) {
            promoted += 1;
            decisionPromotedForDoc = true;
          }
        }
      }

      if (!objectionPromotedForDoc) {
        const objection = detectObjectionCandidate(line);
        if (objection) {
          const sourceLabel = doc.source_type === 'gmail_message' ? 'email' : 'reuniao';
          const result = await upsertCanonicalClientMemoryFact({
            tenantId: params.tenantId,
            clientId: params.clientId,
            factType: 'evidence',
            sourceType: `${sourceLabel}_objection`,
            sourceId: `${doc.id}:objection:${index}`,
            title: `Objeção/contexto sensível: ${shortText(line, 80)}`,
            factText: line,
            summary: shortText(`${doc.title || 'Sem titulo'} | ${line}`, 180),
            relatedAt: doc.created_at,
            confidenceScore: objection.confidence,
            metadata: {
              source_document_type: doc.source_type,
              source_document_title: doc.title,
              semantic_type: 'objection',
            },
          });
          if (result) {
            promoted += 1;
            objectionPromotedForDoc = true;
          }
        }
      }

      if (!commitmentPromotedForDoc && doc.source_type === 'gmail_message') {
        const commitment = detectEmailCommitmentCandidate(line);
        if (commitment) {
          const result = await upsertCanonicalClientMemoryFact({
            tenantId: params.tenantId,
            clientId: params.clientId,
            factType: 'commitment',
            sourceType: 'gmail_commitment',
            sourceId: `${doc.id}:commitment:${index}`,
            title: `Compromisso por email: ${shortText(line, 70)}`,
            factText: line,
            summary: shortText(`${doc.title || 'Sem titulo'} | ${line}`, 180),
            relatedAt: doc.created_at,
            deadline: parseDateCandidate(line),
            priority: 'medium',
            confidenceScore: commitment.confidence,
            metadata: {
              source_document_type: doc.source_type,
              source_document_title: doc.title,
            },
          });
          if (result) {
            promoted += 1;
            commitmentPromotedForDoc = true;
          }
        }
      }
    }
  }

  return {
    scanned: rows.length + docRows.length,
    promoted,
  };
}
