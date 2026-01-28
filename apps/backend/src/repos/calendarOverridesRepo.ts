import { query } from '../db';

export type CalendarOverrideRow = {
  id: string;
  tenant_id: string;
  calendar_event_id: string;
  client_id: string;
  force_include: boolean;
  force_exclude: boolean;
  custom_priority: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listOverridesForClient(params: { tenantId: string; clientId: string }) {
  const { rows } = await query<CalendarOverrideRow>(
    `
    SELECT *
    FROM calendar_event_overrides
    WHERE tenant_id=$1 AND client_id=$2
    ORDER BY updated_at DESC
    `,
    [params.tenantId, params.clientId]
  );
  return rows;
}

export async function upsertOverride(params: {
  tenantId: string;
  clientId: string;
  calendarEventId: string;
  forceInclude: boolean;
  forceExclude: boolean;
  customPriority: number | null;
  notes: string | null;
}) {
  const { rows } = await query<CalendarOverrideRow>(
    `
    INSERT INTO calendar_event_overrides (
      tenant_id,
      calendar_event_id,
      client_id,
      force_include,
      force_exclude,
      custom_priority,
      notes,
      created_at,
      updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
    ON CONFLICT (tenant_id, calendar_event_id, client_id) DO UPDATE SET
      force_include=EXCLUDED.force_include,
      force_exclude=EXCLUDED.force_exclude,
      custom_priority=EXCLUDED.custom_priority,
      notes=EXCLUDED.notes,
      updated_at=NOW()
    RETURNING *
    `,
    [
      params.tenantId,
      params.calendarEventId,
      params.clientId,
      params.forceInclude,
      params.forceExclude,
      params.customPriority,
      params.notes,
    ]
  );
  return rows[0] ?? null;
}
