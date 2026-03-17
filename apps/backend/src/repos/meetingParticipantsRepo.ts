import crypto from 'crypto';
import { query } from '../db';
import { PersonIdentityInput, resolveOrCreatePerson } from './peopleRepo';

type InviteParticipantSource = 'client_contact' | 'team';

export type InviteMeetingParticipantInput = {
  id?: string | null;
  person_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp_jid?: string | null;
  role?: string | null;
  source?: InviteParticipantSource;
  send_via?: 'whatsapp' | 'email' | 'both';
};

export type CalendarMeetingParticipantInput = {
  email?: string | null;
  displayName?: string | null;
  responseStatus?: string | null;
};

type TeamReference = {
  edroUserId: string;
  personId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  whatsappJid: string | null;
};

type ClientContactReference = {
  clientContactId: string;
  personId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  whatsappJid: string | null;
};

type UpsertMeetingParticipantParams = {
  meetingId: string;
  tenantId: string;
  clientId: string;
  personId?: string | null;
  clientContactId?: string | null;
  edroUserId?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
  isInternal?: boolean;
  isOrganizer?: boolean;
  isAttendee?: boolean;
  isInvited?: boolean;
  isSpeaker?: boolean;
  responseStatus?: string | null;
  invitedVia?: string | null;
  sourceType?: string | null;
  sourceRefId?: string | null;
  metadata?: Record<string, any> | null;
};

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[^\d+]/g, '').trim();
  if (!compact) return null;
  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = compact.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

function normalizeWhatsappJid(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizeName(value?: string | null): string | null {
  const normalized = value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return normalized || null;
}

function cleanDisplayName(value?: string | null, fallback?: string | null): string {
  const primary = value?.trim();
  if (primary) return primary;
  const secondary = fallback?.trim();
  if (secondary) return secondary;
  return 'Pessoa sem nome';
}

async function findTeamReference(params: {
  tenantId: string;
  edroUserId?: string | null;
  email?: string | null;
}): Promise<TeamReference | null> {
  if (!params.edroUserId && !params.email) return null;

  const { rows } = await query<{
    edro_user_id: string;
    person_id: string | null;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp_jid: string | null;
  }>(
    `SELECT
        u.id::text AS edro_user_id,
        COALESCE(fp.person_id::text, pi.person_id::text) AS person_id,
        COALESCE(NULLIF(BTRIM(fp.display_name), ''), NULLIF(BTRIM(u.name), ''), u.email) AS display_name,
        u.email,
        fp.phone,
        fp.whatsapp_jid
       FROM tenant_users tu
       JOIN edro_users u ON u.id = tu.user_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       LEFT JOIN person_identities pi
         ON pi.tenant_id = tu.tenant_id::text
        AND pi.identity_type = 'edro_user_id'
        AND pi.normalized_value = LOWER(u.id::text)
      WHERE tu.tenant_id = $1
        AND (
          ($2::text IS NOT NULL AND u.id::text = $2::text)
          OR ($3::text IS NOT NULL AND LOWER(u.email) = LOWER($3::text))
        )
      ORDER BY fp.updated_at DESC NULLS LAST
      LIMIT 1`,
    [params.tenantId, params.edroUserId ?? null, params.email ?? null],
  );

  if (!rows[0]) return null;
  return {
    edroUserId: rows[0].edro_user_id,
    personId: rows[0].person_id,
    displayName: rows[0].display_name,
    email: rows[0].email,
    phone: rows[0].phone,
    whatsappJid: rows[0].whatsapp_jid,
  };
}

async function findClientContactReference(params: {
  tenantId: string;
  clientId?: string | null;
  contactId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
}): Promise<ClientContactReference | null> {
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedPhone = normalizePhone(params.phone);
  const normalizedWhatsappJid = normalizeWhatsappJid(params.whatsappJid);

  if (!params.contactId && !normalizedEmail && !normalizedPhone && !normalizedWhatsappJid) {
    return null;
  }

  const { rows } = await query<{
    client_contact_id: string;
    person_id: string | null;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp_jid: string | null;
  }>(
    `SELECT
        cc.id::text AS client_contact_id,
        cc.person_id::text AS person_id,
        cc.name AS display_name,
        cc.email,
        cc.phone,
        cc.whatsapp_jid
       FROM client_contacts cc
      WHERE cc.tenant_id = $1
        AND cc.active = true
        AND ($2::text IS NULL OR cc.client_id = $2)
        AND (
          ($3::text IS NOT NULL AND cc.id::text = $3::text)
          OR ($4::text IS NOT NULL AND LOWER(cc.email) = LOWER($4::text))
          OR ($5::text IS NOT NULL AND cc.phone = $5::text)
          OR ($6::text IS NOT NULL AND LOWER(cc.whatsapp_jid) = LOWER($6::text))
        )
      ORDER BY cc.is_primary DESC, cc.updated_at DESC
      LIMIT 1`,
    [
      params.tenantId,
      params.clientId ?? null,
      params.contactId ?? null,
      normalizedEmail,
      normalizedPhone,
      normalizedWhatsappJid,
    ],
  );

  if (!rows[0]) return null;
  return {
    clientContactId: rows[0].client_contact_id,
    personId: rows[0].person_id,
    displayName: rows[0].display_name,
    email: rows[0].email,
    phone: rows[0].phone,
    whatsappJid: rows[0].whatsapp_jid,
  };
}

async function resolveParticipantPersonId(params: {
  tenantId: string;
  preferredPersonId?: string | null;
  displayName?: string | null;
  isInternal?: boolean;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
  edroUserId?: string | null;
}): Promise<string | null> {
  const identities: PersonIdentityInput[] = [
    { type: 'edro_user_id', value: params.edroUserId, primary: Boolean(params.edroUserId) },
    { type: 'email', value: params.email, primary: !params.edroUserId && Boolean(params.email) },
    { type: 'phone_e164', value: params.phone, primary: !params.edroUserId && !params.email && Boolean(params.phone) },
    { type: 'whatsapp_jid', value: params.whatsappJid, primary: false },
  ];
  const hasIdentity = identities.some((identity) => Boolean(identity.value));
  if (!hasIdentity) return params.preferredPersonId ?? null;

  const person = await resolveOrCreatePerson({
    tenantId: params.tenantId,
    displayName: params.displayName,
    isInternal: Boolean(params.isInternal),
    preferredPersonId: params.preferredPersonId,
    identities,
  });

  return person.personId;
}

async function findExistingParticipantDedupeKey(params: {
  meetingId: string;
  personId?: string | null;
  clientContactId?: string | null;
  edroUserId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
}): Promise<string | null> {
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedPhone = normalizePhone(params.phone);
  const normalizedWhatsappJid = normalizeWhatsappJid(params.whatsappJid);

  if (
    !params.personId &&
    !params.clientContactId &&
    !params.edroUserId &&
    !normalizedEmail &&
    !normalizedPhone &&
    !normalizedWhatsappJid
  ) {
    return null;
  }

  const { rows } = await query<{ dedupe_key: string }>(
    `SELECT dedupe_key
       FROM meeting_participants
      WHERE meeting_id = $1
        AND (
          ($2::uuid IS NOT NULL AND person_id = $2::uuid)
          OR ($3::uuid IS NOT NULL AND client_contact_id = $3::uuid)
          OR ($4::uuid IS NOT NULL AND edro_user_id = $4::uuid)
          OR ($5::text IS NOT NULL AND LOWER(email) = LOWER($5::text))
          OR ($6::text IS NOT NULL AND phone = $6::text)
          OR ($7::text IS NOT NULL AND LOWER(whatsapp_jid) = LOWER($7::text))
        )
      LIMIT 1`,
    [
      params.meetingId,
      params.personId ?? null,
      params.clientContactId ?? null,
      params.edroUserId ?? null,
      normalizedEmail,
      normalizedPhone,
      normalizedWhatsappJid,
    ],
  );

  return rows[0]?.dedupe_key ?? null;
}

function buildParticipantDedupeKey(params: {
  personId?: string | null;
  clientContactId?: string | null;
  edroUserId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappJid?: string | null;
  displayName?: string | null;
}): string {
  if (params.personId) return `person:${params.personId}`;
  if (params.clientContactId) return `client_contact:${params.clientContactId}`;
  if (params.edroUserId) return `team:${params.edroUserId}`;

  const email = normalizeEmail(params.email);
  if (email) return `email:${email}`;

  const phone = normalizePhone(params.phone);
  if (phone) return `phone:${phone}`;

  const whatsappJid = normalizeWhatsappJid(params.whatsappJid);
  if (whatsappJid) return `whatsapp_jid:${whatsappJid}`;

  return `name:${normalizeName(params.displayName) ?? crypto.randomUUID()}`;
}

function mergeInvitedVia(invitedVia?: string | null): string | null {
  if (!invitedVia) return null;
  if (invitedVia === 'email' || invitedVia === 'whatsapp' || invitedVia === 'both' || invitedVia === 'calendar') {
    return invitedVia;
  }
  return invitedVia;
}

export async function upsertMeetingParticipant(params: UpsertMeetingParticipantParams): Promise<void> {
  const personId = await resolveParticipantPersonId({
    tenantId: params.tenantId,
    preferredPersonId: params.personId,
    displayName: params.displayName,
    isInternal: params.isInternal,
    email: params.email,
    phone: params.phone,
    whatsappJid: params.whatsappJid,
    edroUserId: params.edroUserId,
  });

  const dedupeKey =
    await findExistingParticipantDedupeKey({
      meetingId: params.meetingId,
      personId,
      clientContactId: params.clientContactId,
      edroUserId: params.edroUserId,
      email: params.email,
      phone: params.phone,
      whatsappJid: params.whatsappJid,
    })
    ?? buildParticipantDedupeKey({
      personId,
      clientContactId: params.clientContactId,
      edroUserId: params.edroUserId,
      email: params.email,
      phone: params.phone,
      whatsappJid: params.whatsappJid,
      displayName: params.displayName,
    });

  await query(
    `INSERT INTO meeting_participants
       (meeting_id, tenant_id, client_id, dedupe_key, person_id, client_contact_id, edro_user_id,
        display_name, email, phone, whatsapp_jid, is_internal, is_organizer, is_attendee, is_invited, is_speaker,
        response_status, invited_via, source_type, source_ref_id, metadata)
     VALUES
       ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::uuid,
        $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21::jsonb)
     ON CONFLICT (meeting_id, dedupe_key) DO UPDATE
       SET person_id = COALESCE(meeting_participants.person_id, EXCLUDED.person_id),
           client_contact_id = COALESCE(meeting_participants.client_contact_id, EXCLUDED.client_contact_id),
           edro_user_id = COALESCE(meeting_participants.edro_user_id, EXCLUDED.edro_user_id),
           display_name = CASE
             WHEN COALESCE(NULLIF(BTRIM(meeting_participants.display_name), ''), '') = '' THEN EXCLUDED.display_name
             ELSE meeting_participants.display_name
           END,
           email = COALESCE(meeting_participants.email, EXCLUDED.email),
           phone = COALESCE(meeting_participants.phone, EXCLUDED.phone),
           whatsapp_jid = COALESCE(meeting_participants.whatsapp_jid, EXCLUDED.whatsapp_jid),
           is_internal = meeting_participants.is_internal OR EXCLUDED.is_internal,
           is_organizer = meeting_participants.is_organizer OR EXCLUDED.is_organizer,
           is_attendee = meeting_participants.is_attendee OR EXCLUDED.is_attendee,
           is_invited = meeting_participants.is_invited OR EXCLUDED.is_invited,
           is_speaker = meeting_participants.is_speaker OR EXCLUDED.is_speaker,
           response_status = COALESCE(EXCLUDED.response_status, meeting_participants.response_status),
           invited_via = COALESCE(EXCLUDED.invited_via, meeting_participants.invited_via),
           source_type = COALESCE(meeting_participants.source_type, EXCLUDED.source_type),
           source_ref_id = COALESCE(meeting_participants.source_ref_id, EXCLUDED.source_ref_id),
           metadata = COALESCE(meeting_participants.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
           updated_at = now()`,
    [
      params.meetingId,
      params.tenantId,
      params.clientId,
      dedupeKey,
      personId,
      params.clientContactId ?? null,
      params.edroUserId ?? null,
      cleanDisplayName(params.displayName, params.email ?? params.phone ?? params.whatsappJid ?? null),
      normalizeEmail(params.email) ?? params.email ?? null,
      normalizePhone(params.phone) ?? params.phone ?? null,
      normalizeWhatsappJid(params.whatsappJid) ?? params.whatsappJid ?? null,
      Boolean(params.isInternal),
      Boolean(params.isOrganizer),
      params.isAttendee ?? true,
      Boolean(params.isInvited),
      Boolean(params.isSpeaker),
      params.responseStatus ?? null,
      mergeInvitedVia(params.invitedVia),
      params.sourceType ?? null,
      params.sourceRefId ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );
}

export async function syncMeetingOrganizerFromUserEmail(params: {
  meetingId: string;
  tenantId: string;
  clientId: string;
  email?: string | null;
  displayName?: string | null;
  sourceType?: string | null;
}): Promise<void> {
  const email = normalizeEmail(params.email);
  if (!email) return;

  const teamRef = await findTeamReference({
    tenantId: params.tenantId,
    email,
  });

  await upsertMeetingParticipant({
    meetingId: params.meetingId,
    tenantId: params.tenantId,
    clientId: params.clientId,
    personId: teamRef?.personId ?? null,
    edroUserId: teamRef?.edroUserId ?? null,
    displayName: params.displayName ?? teamRef?.displayName ?? email,
    email: teamRef?.email ?? email,
    phone: teamRef?.phone ?? null,
    whatsappJid: teamRef?.whatsappJid ?? null,
    isInternal: true,
    isOrganizer: true,
    isAttendee: true,
    isInvited: false,
    invitedVia: null,
    sourceType: params.sourceType ?? 'meeting_organizer',
    sourceRefId: teamRef?.edroUserId ?? null,
  });
}

export async function syncMeetingParticipantsFromInviteContacts(params: {
  meetingId: string;
  tenantId: string;
  clientId: string;
  inviteContacts: InviteMeetingParticipantInput[];
}): Promise<void> {
  for (const invite of params.inviteContacts) {
    const source = invite.source ?? 'client_contact';
    const teamRef = source === 'team'
      ? await findTeamReference({
        tenantId: params.tenantId,
        edroUserId: invite.id,
        email: invite.email,
      })
      : null;
    const clientContactRef = source === 'client_contact'
      ? await findClientContactReference({
        tenantId: params.tenantId,
        clientId: params.clientId,
        contactId: invite.id,
        email: invite.email,
        phone: invite.phone,
        whatsappJid: invite.whatsapp_jid,
      })
      : null;

    await upsertMeetingParticipant({
      meetingId: params.meetingId,
      tenantId: params.tenantId,
      clientId: params.clientId,
      personId: invite.person_id ?? teamRef?.personId ?? clientContactRef?.personId ?? null,
      clientContactId: clientContactRef?.clientContactId ?? (source === 'client_contact' ? invite.id ?? null : null),
      edroUserId: teamRef?.edroUserId ?? (source === 'team' ? invite.id ?? null : null),
      displayName: invite.name || teamRef?.displayName || clientContactRef?.displayName || null,
      email: invite.email ?? teamRef?.email ?? clientContactRef?.email ?? null,
      phone: invite.phone ?? teamRef?.phone ?? clientContactRef?.phone ?? null,
      whatsappJid: invite.whatsapp_jid ?? teamRef?.whatsappJid ?? clientContactRef?.whatsappJid ?? null,
      isInternal: source === 'team',
      isAttendee: true,
      isInvited: true,
      invitedVia: invite.send_via ?? 'email',
      sourceType: source,
      sourceRefId: invite.id ?? null,
      metadata: {
        role: invite.role ?? null,
        source,
      },
    });
  }
}

export async function syncMeetingParticipantsFromCalendarPayload(params: {
  meetingId: string;
  tenantId: string;
  clientId: string;
  organizerEmail?: string | null;
  organizerName?: string | null;
  attendees?: CalendarMeetingParticipantInput[];
  calendarEventId?: string | null;
}): Promise<void> {
  const organizerEmail = normalizeEmail(params.organizerEmail);
  if (organizerEmail) {
    const teamRef = await findTeamReference({
      tenantId: params.tenantId,
      email: organizerEmail,
    });
    const clientContactRef = teamRef
      ? null
      : await findClientContactReference({
        tenantId: params.tenantId,
        clientId: params.clientId,
        email: organizerEmail,
      });

    await upsertMeetingParticipant({
      meetingId: params.meetingId,
      tenantId: params.tenantId,
      clientId: params.clientId,
      personId: teamRef?.personId ?? clientContactRef?.personId ?? null,
      clientContactId: clientContactRef?.clientContactId ?? null,
      edroUserId: teamRef?.edroUserId ?? null,
      displayName: params.organizerName ?? teamRef?.displayName ?? clientContactRef?.displayName ?? organizerEmail,
      email: teamRef?.email ?? clientContactRef?.email ?? organizerEmail,
      phone: teamRef?.phone ?? clientContactRef?.phone ?? null,
      whatsappJid: teamRef?.whatsappJid ?? clientContactRef?.whatsappJid ?? null,
      isInternal: Boolean(teamRef),
      isOrganizer: true,
      isAttendee: true,
      isInvited: true,
      invitedVia: 'calendar',
      sourceType: 'calendar_organizer',
      sourceRefId: params.calendarEventId ?? null,
      metadata: {
        calendar_event_id: params.calendarEventId ?? null,
      },
    });
  }

  for (const attendee of params.attendees ?? []) {
    const attendeeEmail = normalizeEmail(attendee.email);
    const attendeeDisplayName = attendee.displayName?.trim() ?? null;
    if (!attendeeEmail && !attendeeDisplayName) continue;
    const teamRef = attendeeEmail
      ? await findTeamReference({
        tenantId: params.tenantId,
        email: attendeeEmail,
      })
      : null;
    const clientContactRef = teamRef || !attendeeEmail
      ? null
      : await findClientContactReference({
        tenantId: params.tenantId,
        clientId: params.clientId,
        email: attendeeEmail,
      });

    await upsertMeetingParticipant({
      meetingId: params.meetingId,
      tenantId: params.tenantId,
      clientId: params.clientId,
      personId: teamRef?.personId ?? clientContactRef?.personId ?? null,
      clientContactId: clientContactRef?.clientContactId ?? null,
      edroUserId: teamRef?.edroUserId ?? null,
      displayName: attendeeDisplayName ?? teamRef?.displayName ?? clientContactRef?.displayName ?? attendeeEmail ?? null,
      email: teamRef?.email ?? clientContactRef?.email ?? attendeeEmail ?? null,
      phone: teamRef?.phone ?? clientContactRef?.phone ?? null,
      whatsappJid: teamRef?.whatsappJid ?? clientContactRef?.whatsappJid ?? null,
      isInternal: Boolean(teamRef),
      isAttendee: true,
      isInvited: true,
      responseStatus: attendee.responseStatus ?? null,
      invitedVia: 'calendar',
      sourceType: 'calendar_attendee',
      sourceRefId: params.calendarEventId ?? null,
      metadata: {
        calendar_event_id: params.calendarEventId ?? null,
      },
    });
  }
}

export async function syncMeetingParticipantsFromAutoJoin(params: {
  meetingId: string;
  tenantId: string;
  clientId?: string | null;
  autoJoinId: string;
}): Promise<void> {
  const { rows } = await query<{
    tenant_id: string;
    meeting_id: string | null;
    client_id: string | null;
    calendar_event_id: string;
    organizer_email: string | null;
    organizer_name: string | null;
    attendees: Array<{ email?: string; displayName?: string; responseStatus?: string }> | null;
  }>(
    `SELECT
        tenant_id,
        meeting_id::text AS meeting_id,
        client_id,
        calendar_event_id,
        organizer_email,
        organizer_name,
        attendees
       FROM calendar_auto_joins
      WHERE id = $1
      LIMIT 1`,
    [params.autoJoinId],
  );

  const row = rows[0];
  if (!row) return;

  const clientId = params.clientId ?? row.client_id;
  if (!clientId) return;

  await syncMeetingParticipantsFromCalendarPayload({
    meetingId: params.meetingId,
    tenantId: params.tenantId,
    clientId,
    organizerEmail: row.organizer_email,
    organizerName: row.organizer_name,
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    calendarEventId: row.calendar_event_id,
  });
}
