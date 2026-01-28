import { query } from '../db';
import type { CalendarEvent } from '../types';

type EventStatus = 'approved' | 'pending' | 'rejected';

function extractYear(event: CalendarEvent) {
  const recurrence = (event.recurrence || '').toLowerCase().trim();
  if (['annual', 'yearly', 'anual', 'monthly', 'mensal'].includes(recurrence)) {
    return null;
  }
  const dateValue = event.date || event.start_date || '';
  if (typeof dateValue === 'string' && dateValue.length >= 4) {
    const year = Number(dateValue.slice(0, 4));
    return Number.isNaN(year) ? null : year;
  }
  return null;
}

export async function upsertEvents(
  events: CalendarEvent[],
  seedVersion: string,
  options?: {
    tenantId?: string | null;
    status?: EventStatus;
    reviewedBy?: string | null;
    sourceUrl?: string | null;
  }
) {
  const status = options?.status ?? 'approved';
  const reviewedBy = options?.reviewedBy ?? null;
  const reviewedAt = reviewedBy ? new Date().toISOString() : null;
  const sourceUrl = options?.sourceUrl ?? null;
  const tenantId = options?.tenantId ?? null;

  for (const event of events) {
    const year = extractYear(event);
    await query(
      `
      INSERT INTO events (
        id, name, slug, date_type, date, rule, start_date, end_date,
        scope, country, uf, city, categories, tags, base_relevance,
        segment_boosts, platform_affinity, avoid_segments, is_trend_sensitive,
        source, payload, status, reviewed_by, reviewed_at, source_url, year, tenant_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,
        $16::jsonb,$17::jsonb,$18,$19,
        $20,$21::jsonb,$22,$23,$24,$25,$26,$27
      )
      ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name,
        slug=EXCLUDED.slug,
        date_type=EXCLUDED.date_type,
        date=EXCLUDED.date,
        rule=EXCLUDED.rule,
        start_date=EXCLUDED.start_date,
        end_date=EXCLUDED.end_date,
        scope=EXCLUDED.scope,
        country=EXCLUDED.country,
        uf=EXCLUDED.uf,
        city=EXCLUDED.city,
        categories=EXCLUDED.categories,
        tags=EXCLUDED.tags,
        base_relevance=EXCLUDED.base_relevance,
        segment_boosts=EXCLUDED.segment_boosts,
        platform_affinity=EXCLUDED.platform_affinity,
        avoid_segments=EXCLUDED.avoid_segments,
        is_trend_sensitive=EXCLUDED.is_trend_sensitive,
        source=EXCLUDED.source,
        payload=EXCLUDED.payload,
        status=EXCLUDED.status,
        reviewed_by=EXCLUDED.reviewed_by,
        reviewed_at=EXCLUDED.reviewed_at,
        source_url=EXCLUDED.source_url,
        year=EXCLUDED.year,
        tenant_id=EXCLUDED.tenant_id,
        updated_at=NOW()
      `,
      [
        event.id,
        event.name,
        event.slug,
        event.date_type,
        event.date ?? null,
        event.rule ?? null,
        event.start_date ?? null,
        event.end_date ?? null,
        event.scope,
        event.country ?? null,
        event.uf ?? null,
        event.city ?? null,
        event.categories ?? [],
        event.tags ?? [],
        event.base_relevance ?? 50,
        JSON.stringify(event.segment_boosts ?? {}),
        JSON.stringify(event.platform_affinity ?? {}),
        event.avoid_segments ?? [],
        event.is_trend_sensitive ?? true,
        event.source ?? `seed:${seedVersion}`,
        JSON.stringify(event),
        status,
        reviewedBy,
        reviewedAt,
        sourceUrl,
        year,
        tenantId,
      ]
    );
  }
}

export async function getEventsForCountry(country: string) {
  const { rows } = await query<any>(`SELECT payload FROM events WHERE country=$1 OR country IS NULL`, [
    country,
  ]);
  return rows;
}

export async function listEvents(params: {
  tenantId?: string | null;
  status?: EventStatus;
  year?: number | null;
  source?: string | null;
  limit?: number;
}) {
  const where: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.tenantId) {
    where.push(`(tenant_id=$${idx++} OR tenant_id IS NULL)`);
    values.push(params.tenantId);
  }

  if (params.status) {
    where.push(`status=$${idx++}`);
    values.push(params.status);
  }

  if (params.year) {
    where.push(`year=$${idx++}`);
    values.push(params.year);
  }

  if (params.source) {
    where.push(`source=$${idx++}`);
    values.push(params.source);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(params.limit ?? 200, 500);

  const { rows } = await query<any>(
    `
    SELECT id, name, slug, date_type, date, rule, start_date, end_date,
           scope, country, uf, city, categories, tags, base_relevance,
           segment_boosts, platform_affinity, avoid_segments, is_trend_sensitive,
           source, source_url, status, reviewed_by, reviewed_at, year, payload, tenant_id
    FROM events
    ${whereClause}
    ORDER BY date NULLS LAST, name ASC
    LIMIT ${limit}
    `,
    values
  );
  return rows;
}

export async function countEvents(params?: { tenantId?: string | null }) {
  const values: any[] = [];
  let whereClause = '';

  if (params?.tenantId) {
    whereClause = 'WHERE tenant_id=$1 OR tenant_id IS NULL';
    values.push(params.tenantId);
  }

  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM events ${whereClause}`,
    values
  );
  return Number(rows[0]?.count || 0);
}

export async function reviewEvent(params: {
  id: string;
  status: EventStatus;
  reviewer: string | null;
  tenantId?: string | null;
}) {
  const { rows } = await query<any>(
    `UPDATE events
     SET status=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
     WHERE id=$1 AND ($4::uuid IS NULL OR tenant_id=$4)
     RETURNING *`,
    [params.id, params.status, params.reviewer, params.tenantId ?? null]
  );
  return rows[0] ?? null;
}

export async function listApprovedEventsForYear(params: {
  tenantId?: string | null;
  year: number;
  country: string;
}) {
  const values: any[] = [params.year, params.country];
  let idx = 3;
  let tenantClause = '';
  if (params.tenantId) {
    tenantClause = `AND (tenant_id=$${idx} OR tenant_id IS NULL)`;
    values.push(params.tenantId);
  }

  const { rows } = await query<any>(
    `
    SELECT payload, id, name, slug, date_type, date, rule, start_date, end_date,
           scope, country, uf, city, categories, tags, base_relevance,
           segment_boosts, platform_affinity, avoid_segments, is_trend_sensitive,
           source
    FROM events
    WHERE status='approved'
      AND (
        year=$1
        OR year IS NULL
        OR payload->>'recurrence' IN ('annual','yearly','anual','monthly','mensal')
      )
      AND (country=$2 OR country IS NULL)
      ${tenantClause}
    `,
    values
  );

  return rows.map((row) => {
    if (row.payload) return row.payload;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      date_type: row.date_type,
      date: row.date,
      rule: row.rule,
      start_date: row.start_date,
      end_date: row.end_date,
      scope: row.scope,
      country: row.country,
      uf: row.uf,
      city: row.city,
      categories: row.categories ?? [],
      tags: row.tags ?? [],
      base_relevance: row.base_relevance ?? 50,
      segment_boosts: row.segment_boosts ?? {},
      platform_affinity: row.platform_affinity ?? {},
      avoid_segments: row.avoid_segments ?? [],
      is_trend_sensitive: row.is_trend_sensitive ?? true,
      source: row.source,
    };
  });
}
