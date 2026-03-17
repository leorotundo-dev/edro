import { query } from '../db';

export type PersonIdentityType = 'email' | 'phone_e164' | 'whatsapp_jid' | 'edro_user_id';

export type PersonIdentityInput = {
  type: PersonIdentityType;
  value?: string | null;
  primary?: boolean;
};

type ResolvedPersonIdentity = {
  type: PersonIdentityType;
  value: string;
  normalizedValue: string;
  primary: boolean;
};

function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizePhoneE164(value: string): string | null {
  const compact = value.replace(/[^\d+]/g, '').trim();
  if (!compact) return null;
  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = compact.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

function normalizeWhatsappJid(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizeEdroUserId(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function normalizePersonIdentityValue(type: PersonIdentityType, value?: string | null): string | null {
  if (!value) return null;
  if (type === 'email') return normalizeEmail(value);
  if (type === 'phone_e164') return normalizePhoneE164(value);
  if (type === 'whatsapp_jid') return normalizeWhatsappJid(value);
  return normalizeEdroUserId(value);
}

function sanitizeDisplayName(displayName?: string | null, identities: ResolvedPersonIdentity[] = []): string {
  const cleaned = displayName?.trim();
  if (cleaned) return cleaned;
  const primary = identities.find((identity) => identity.primary) ?? identities[0];
  if (!primary) return 'Pessoa sem nome';
  return primary.value;
}

function resolveIdentities(identities?: PersonIdentityInput[]): ResolvedPersonIdentity[] {
  const seen = new Set<string>();
  const resolved: ResolvedPersonIdentity[] = [];

  for (const identity of identities ?? []) {
    const normalizedValue = normalizePersonIdentityValue(identity.type, identity.value);
    if (!normalizedValue) continue;
    const key = `${identity.type}:${normalizedValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push({
      type: identity.type,
      value: identity.value!.trim(),
      normalizedValue,
      primary: Boolean(identity.primary),
    });
  }

  if (resolved.length === 1 && !resolved[0].primary) {
    resolved[0].primary = true;
  }

  return resolved;
}

async function chooseExistingPersonId(
  tenantId: string,
  identities: ResolvedPersonIdentity[],
  preferredPersonId?: string | null,
): Promise<string | null> {
  if (!identities.length) return preferredPersonId ?? null;

  const clauses: string[] = [];
  const params: any[] = [tenantId];

  for (const identity of identities) {
    params.push(identity.type, identity.normalizedValue);
    clauses.push(`(identity_type = $${params.length - 1} AND normalized_value = $${params.length})`);
  }

  const { rows } = await query<{ person_id: string }>(
    `SELECT person_id
       FROM person_identities
      WHERE tenant_id = $1
        AND (${clauses.join(' OR ')})`,
    params,
  );

  if (!rows.length) return preferredPersonId ?? null;

  const scores = new Map<string, number>();
  for (const row of rows) {
    scores.set(row.person_id, (scores.get(row.person_id) ?? 0) + 1);
  }

  const ranked = Array.from(scores.entries()).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    if (preferredPersonId && left[0] === preferredPersonId) return -1;
    if (preferredPersonId && right[0] === preferredPersonId) return 1;
    return left[0].localeCompare(right[0]);
  });

  return ranked[0]?.[0] ?? preferredPersonId ?? null;
}

async function updatePersonMetadata(personId: string, displayName: string, isInternal: boolean) {
  await query(
    `UPDATE people
        SET display_name = CASE
              WHEN COALESCE(NULLIF(BTRIM(display_name), ''), '') = '' THEN $2
              WHEN display_name ILIKE 'Pessoa sem nome%' THEN $2
              WHEN display_name LIKE '+%' THEN $2
              WHEN position('@' in display_name) > 0 THEN $2
              ELSE display_name
            END,
            is_internal = is_internal OR $3,
            updated_at = now()
      WHERE id = $1`,
    [personId, displayName, isInternal],
  );
}

async function ensurePersonRow(params: {
  tenantId: string;
  personId?: string | null;
  displayName: string;
  isInternal: boolean;
}): Promise<{ personId: string; created: boolean }> {
  if (params.personId) {
    await updatePersonMetadata(params.personId, params.displayName, params.isInternal);
    return { personId: params.personId, created: false };
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO people (tenant_id, display_name, is_internal)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [params.tenantId, params.displayName, params.isInternal],
  );

  return { personId: rows[0].id, created: true };
}

async function ensurePersonIdentities(params: {
  tenantId: string;
  personId: string;
  identities: ResolvedPersonIdentity[];
}) {
  for (const identity of params.identities) {
    await query(
      `INSERT INTO person_identities
         (tenant_id, person_id, identity_type, identity_value, normalized_value, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, identity_type, normalized_value) DO UPDATE
         SET identity_value = EXCLUDED.identity_value,
             is_primary = person_identities.is_primary OR EXCLUDED.is_primary,
             updated_at = now()
       WHERE person_identities.person_id = EXCLUDED.person_id`,
      [
        params.tenantId,
        params.personId,
        identity.type,
        identity.value,
        identity.normalizedValue,
        identity.primary,
      ],
    );
  }
}

export async function resolveOrCreatePerson(params: {
  tenantId: string;
  displayName?: string | null;
  isInternal?: boolean;
  preferredPersonId?: string | null;
  identities?: PersonIdentityInput[];
}): Promise<{ personId: string; created: boolean }> {
  const identities = resolveIdentities(params.identities);
  const personId = await chooseExistingPersonId(params.tenantId, identities, params.preferredPersonId);
  const displayName = sanitizeDisplayName(params.displayName, identities);
  const person = await ensurePersonRow({
    tenantId: params.tenantId,
    personId,
    displayName,
    isInternal: Boolean(params.isInternal),
  });

  if (identities.length) {
    await ensurePersonIdentities({
      tenantId: params.tenantId,
      personId: person.personId,
      identities,
    });
  }

  return person;
}

export async function syncClientContactPerson(params: {
  contactId: string;
  tenantId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
  existingPersonId?: string | null;
}): Promise<string> {
  const person = await resolveOrCreatePerson({
    tenantId: params.tenantId,
    displayName: params.name,
    preferredPersonId: params.existingPersonId,
    identities: [
      { type: 'email', value: params.email, primary: Boolean(params.email) },
      { type: 'phone_e164', value: params.phone, primary: !params.email && Boolean(params.phone) },
      { type: 'whatsapp_jid', value: params.whatsappJid, primary: !params.email && !params.phone && Boolean(params.whatsappJid) },
    ],
  });

  await query(
    `UPDATE client_contacts
        SET person_id = $1,
            updated_at = now()
      WHERE id = $2 AND tenant_id = $3`,
    [person.personId, params.contactId, params.tenantId],
  );

  return person.personId;
}

export async function syncFreelancerPerson(params: {
  freelancerId: string;
  tenantId: string;
  displayName?: string | null;
  userId?: string | null;
  email?: string | null;
  emailPersonal?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
  existingPersonId?: string | null;
}): Promise<string> {
  const person = await resolveOrCreatePerson({
    tenantId: params.tenantId,
    displayName: params.displayName,
    isInternal: true,
    preferredPersonId: params.existingPersonId,
    identities: [
      { type: 'edro_user_id', value: params.userId, primary: Boolean(params.userId) },
      { type: 'email', value: params.email, primary: !params.userId && Boolean(params.email) },
      { type: 'email', value: params.emailPersonal, primary: !params.userId && !params.email && Boolean(params.emailPersonal) },
      { type: 'phone_e164', value: params.phone, primary: false },
      { type: 'whatsapp_jid', value: params.whatsappJid, primary: false },
    ],
  });

  await query(
    `UPDATE freelancer_profiles
        SET person_id = $1,
            updated_at = now()
      WHERE id = $2`,
    [person.personId, params.freelancerId],
  );

  return person.personId;
}
