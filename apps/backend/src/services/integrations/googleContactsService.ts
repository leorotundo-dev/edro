/**
 * Google Contacts Service
 * Syncs Google People API contacts into the people + person_identities tables.
 *
 * Requires scope: https://www.googleapis.com/auth/contacts.readonly
 * Uses the same OAuth token stored in gmail_connections.
 */

import { query } from '../../db';
import { getValidAccessToken } from './gmailService';

const PEOPLE_API = 'https://people.googleapis.com/v1';

type GooglePerson = {
  resourceName: string;
  names?: Array<{ displayName?: string; unstructuredName?: string }>;
  emailAddresses?: Array<{ value?: string; metadata?: { primary?: boolean } }>;
  phoneNumbers?: Array<{ value?: string; canonicalForm?: string }>;
  photos?: Array<{ url?: string; default?: boolean }>;
  organizations?: Array<{ name?: string; title?: string }>;
};

function normalizeEmail(raw?: string): string | null {
  const e = (raw || '').trim().toLowerCase();
  return e.includes('@') ? e : null;
}

function normalizePhone(raw?: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `+${digits}`;
}

async function fetchAllContacts(accessToken: string): Promise<GooglePerson[]> {
  const all: GooglePerson[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${PEOPLE_API}/people/me/connections`);
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,photos,organizations');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 403) {
      throw new Error('needs_reauth: contacts.readonly scope not authorized. Reconecte o Gmail.');
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`People API ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json() as { connections?: GooglePerson[]; nextPageToken?: string };
    all.push(...(data.connections ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

export async function syncGoogleContacts(tenantId: string): Promise<{
  upserted: number;
  skipped: number;
}> {
  const accessToken = await getValidAccessToken(tenantId);
  const contacts = await fetchAllContacts(accessToken);

  let upserted = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const rawName = contact.names?.[0]?.displayName?.trim() || contact.names?.[0]?.unstructuredName?.trim() || '';
    const emails = (contact.emailAddresses ?? [])
      .map((e) => normalizeEmail(e.value))
      .filter((e): e is string => Boolean(e));
    const phones = (contact.phoneNumbers ?? [])
      .map((p) => normalizePhone(p.canonicalForm || p.value))
      .filter((p): p is string => Boolean(p));
    const photoUrl = contact.photos?.find((ph) => !ph.default)?.url ?? null;
    const resourceName = contact.resourceName;

    // Skip contacts with no useful data
    if (!rawName && !emails.length) { skipped++; continue; }

    const displayName = rawName || emails[0];

    // ── Find existing person ──────────────────────────────────────────────

    let personId: string | null = null;

    // 1. By email identity
    if (emails.length) {
      const { rows } = await query(
        `SELECT person_id FROM person_identities
         WHERE tenant_id = $1 AND identity_type = 'email' AND normalized_value = ANY($2)
         LIMIT 1`,
        [tenantId, emails],
      );
      if (rows.length) personId = rows[0].person_id;
    }

    // 2. By google_resource_name
    if (!personId && resourceName) {
      const { rows } = await query(
        `SELECT id FROM people WHERE tenant_id = $1 AND google_resource_name = $2 LIMIT 1`,
        [tenantId, resourceName],
      );
      if (rows.length) personId = rows[0].id;
    }

    // ── Upsert person record ──────────────────────────────────────────────

    if (personId) {
      // Enrich existing — only fill in blank fields, never overwrite real data
      await query(
        `UPDATE people SET
           display_name = CASE
             WHEN COALESCE(TRIM(display_name), '') = '' OR display_name = 'Pessoa sem nome'
             THEN $2 ELSE display_name
           END,
           avatar_url = COALESCE(avatar_url, $3),
           google_resource_name = COALESCE(google_resource_name, $4),
           google_contacts_synced_at = now(),
           updated_at = now()
         WHERE id = $1 AND tenant_id = $5`,
        [personId, displayName, photoUrl, resourceName, tenantId],
      );
    } else {
      // Create new person
      const { rows: inserted } = await query(
        `INSERT INTO people (tenant_id, display_name, avatar_url, google_resource_name, google_contacts_synced_at)
         VALUES ($1, $2, $3, $4, now())
         RETURNING id`,
        [tenantId, displayName, photoUrl, resourceName],
      );
      personId = inserted[0].id;
    }

    // ── Upsert identities ─────────────────────────────────────────────────

    for (let i = 0; i < emails.length; i++) {
      await query(
        `INSERT INTO person_identities
           (tenant_id, person_id, identity_type, identity_value, normalized_value, is_primary)
         VALUES ($1, $2, 'email', $3, $3, $4)
         ON CONFLICT (tenant_id, identity_type, normalized_value) DO NOTHING`,
        [tenantId, personId, emails[i], i === 0],
      );
    }

    for (const phone of phones) {
      await query(
        `INSERT INTO person_identities
           (tenant_id, person_id, identity_type, identity_value, normalized_value, is_primary)
         VALUES ($1, $2, 'phone_e164', $3, $3, false)
         ON CONFLICT (tenant_id, identity_type, normalized_value) DO NOTHING`,
        [tenantId, personId, phone],
      );
    }

    upserted++;
  }

  // Update last sync timestamp on the gmail_connections row
  await query(
    `UPDATE gmail_connections SET last_sync_at = now() WHERE tenant_id = $1`,
    [tenantId],
  );

  return { upserted, skipped };
}
