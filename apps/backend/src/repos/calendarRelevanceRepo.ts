import { query } from '../db';

export type CalendarRelevanceRow = {
  id: string;
  tenant_id: string;
  calendar_event_id: string;
  client_id: string;
  relevance_score: number;
  is_relevant: boolean;
  relevance_reason: any;
  calculated_at: string;
};

export async function upsertRelevance(params: {
  tenantId: string;
  clientId: string;
  calendarEventId: string;
  relevanceScore: number;
  isRelevant: boolean;
  relevanceReason: any;
}) {
  const { rows } = await query<CalendarRelevanceRow>(
    `
    INSERT INTO calendar_event_relevance (
      tenant_id,
      calendar_event_id,
      client_id,
      relevance_score,
      is_relevant,
      relevance_reason,
      calculated_at
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
    ON CONFLICT (tenant_id, calendar_event_id, client_id) DO UPDATE SET
      relevance_score=EXCLUDED.relevance_score,
      is_relevant=EXCLUDED.is_relevant,
      relevance_reason=EXCLUDED.relevance_reason,
      calculated_at=NOW()
    RETURNING *
    `,
    [
      params.tenantId,
      params.calendarEventId,
      params.clientId,
      params.relevanceScore,
      params.isRelevant,
      JSON.stringify(params.relevanceReason ?? {}),
    ]
  );
  return rows[0] ?? null;
}
