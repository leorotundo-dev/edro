import { PoolClient } from 'pg';
import { pool, query } from '../../db';

const DEFAULT_PREFIX = 'JOB';
const MAX_PREFIX_LENGTH = 8;
const JOB_CODE_PATTERN = /^[A-Z0-9]{2,8}-\d{4}-\d{4}\s*\|\s*/i;
const JOB_CODE_CAPTURE_PATTERN = /^([A-Z0-9]{2,8})-(\d{4})-(\d{4})\s*\|\s*/i;
const CLIENT_CODE_STOPWORDS = new Set([
  'A',
  'AGENCIA',
  'AGENCY',
  'BANCO',
  'BRASIL',
  'CLIENTE',
  'COM',
  'DA',
  'DE',
  'DIGITAL',
  'DO',
  'DOS',
  'E',
  'EDRO',
  'GRUPO',
  'LTDA',
  'O',
  'OS',
  'PARA',
  'THE',
]);

type JobCodeRow = {
  id: string;
  title: string;
  client_id: string | null;
  job_code: string | null;
  canonical_title: string | null;
  trello_card_id: string | null;
  client_name: string | null;
  client_profile: Record<string, unknown> | null;
};

export type EnsuredJobCode = {
  jobId: string;
  jobCode: string | null;
  canonicalTitle: string | null;
  plainTitle: string;
  trelloCardId: string | null;
  created: boolean;
  reason?: 'missing_client' | 'not_found';
};

function normalizeCodeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function normalizePrefix(value: string): string {
  return normalizeCodeText(value)
    .replace(/\s+/g, '')
    .slice(0, MAX_PREFIX_LENGTH);
}

function getProfileString(profile: Record<string, unknown> | null, keys: string[]): string | null {
  if (!profile) return null;
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function deriveClientCodePrefix(
  clientName: string | null | undefined,
  profile?: Record<string, unknown> | null,
  clientId?: string | null,
): string {
  const explicit = getProfileString(profile ?? null, [
    'job_code_prefix',
    'jobCodePrefix',
    'client_code',
    'clientCode',
    'short_code',
    'shortCode',
    'code',
    'slug',
  ]);
  if (explicit) {
    const prefix = normalizePrefix(explicit);
    if (prefix.length >= 2) return prefix;
  }

  const normalizedName = normalizeCodeText(clientName || '');
  const tokens = normalizedName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !CLIENT_CODE_STOPWORDS.has(token));

  const strongToken = tokens.find((token) => token.length >= 2 && token.length <= MAX_PREFIX_LENGTH);
  if (strongToken) return strongToken.slice(0, MAX_PREFIX_LENGTH);

  const initials = tokens.map((token) => token[0]).join('').slice(0, MAX_PREFIX_LENGTH);
  if (initials.length >= 2) return initials;

  const fallback = normalizePrefix(clientId || clientName || DEFAULT_PREFIX);
  return fallback.length >= 2 ? fallback : DEFAULT_PREFIX;
}

export function stripCanonicalJobCodePrefix(title: string | null | undefined): string {
  return String(title || '')
    .replace(JOB_CODE_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCanonicalJobTitle(jobCode: string, title: string | null | undefined): string {
  const plainTitle = stripCanonicalJobCodePrefix(title) || 'Job sem titulo';
  return `${jobCode} | ${plainTitle}`;
}

function parseCanonicalJobCode(title: string | null | undefined): {
  jobCode: string;
  prefix: string;
  year: number;
  sequence: number;
} | null {
  const match = String(title || '').match(JOB_CODE_CAPTURE_PATTERN);
  if (!match) return null;
  const prefix = match[1].toUpperCase();
  const year = Number(match[2]);
  const sequence = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(sequence)) return null;
  return {
    jobCode: `${prefix}-${year}-${String(sequence).padStart(4, '0')}`,
    prefix,
    year,
    sequence,
  };
}

async function getSaoPauloYear(client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ year: number }>(
    `SELECT EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Sao_Paulo')::int AS year`,
  );
  return Number(rows[0]?.year || new Date().getFullYear());
}

async function nextClientSequence(
  client: PoolClient,
  tenantId: string,
  clientId: string,
  year: number,
): Promise<number> {
  const { rows } = await client.query<{ sequence: number }>(
    `INSERT INTO job_counters (tenant_id, client_id, year, next_value)
     VALUES ($1, $2, $3, 2)
     ON CONFLICT (tenant_id, client_id, year) DO UPDATE
       SET next_value = job_counters.next_value + 1,
           updated_at = now()
     RETURNING next_value - 1 AS sequence`,
    [tenantId, clientId, year],
  );
  return Number(rows[0]?.sequence || 1);
}

async function resolveUniqueJobCode(params: {
  client: PoolClient;
  tenantId: string;
  clientId: string;
  basePrefix: string;
  year: number;
  sequence: number;
}): Promise<{ jobCode: string; prefix: string }> {
  const normalizedBase = normalizePrefix(params.basePrefix) || DEFAULT_PREFIX;
  const clientSuffix = normalizePrefix(params.clientId).slice(0, 4) || 'X';
  const suffixes = ['', ...Array.from({ length: 20 }, (_, index) => String(index + 2)), clientSuffix];

  for (const suffix of suffixes) {
    const prefix = suffix
      ? `${normalizedBase.slice(0, Math.max(2, MAX_PREFIX_LENGTH - suffix.length))}${suffix}`.slice(0, MAX_PREFIX_LENGTH)
      : normalizedBase.slice(0, MAX_PREFIX_LENGTH);
    const jobCode = `${prefix}-${params.year}-${String(params.sequence).padStart(4, '0')}`;
    const { rows } = await params.client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM jobs
          WHERE tenant_id = $1
            AND job_code = $2
            AND client_id IS DISTINCT FROM $3
       ) AS exists`,
      [params.tenantId, jobCode, params.clientId],
    );
    if (!rows[0]?.exists) {
      return { jobCode, prefix };
    }
  }

  const fallbackPrefix = `${normalizedBase.slice(0, 4)}${clientSuffix}`.slice(0, MAX_PREFIX_LENGTH);
  return {
    prefix: fallbackPrefix,
    jobCode: `${fallbackPrefix}-${params.year}-${String(params.sequence).padStart(4, '0')}`,
  };
}

async function isJobCodeAvailable(
  client: PoolClient,
  tenantId: string,
  jobCode: string,
  currentJobId: string,
): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM jobs
        WHERE tenant_id = $1
          AND job_code = $2
          AND id <> $3
     ) AS exists`,
    [tenantId, jobCode, currentJobId],
  );
  return !rows[0]?.exists;
}

async function reserveExistingSequence(params: {
  client: PoolClient;
  tenantId: string;
  clientId: string;
  year: number;
  sequence: number;
}) {
  await params.client.query(
    `INSERT INTO job_counters (tenant_id, client_id, year, next_value)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, client_id, year) DO UPDATE
       SET next_value = GREATEST(job_counters.next_value, EXCLUDED.next_value),
           updated_at = now()`,
    [params.tenantId, params.clientId, params.year, params.sequence + 1],
  );
}

async function updateProjectCardMirror(params: {
  tenantId: string;
  trelloCardId: string | null;
  jobCode: string | null;
  canonicalTitle: string | null;
}) {
  if (!params.trelloCardId || !params.jobCode || !params.canonicalTitle) return;
  await query(
    `UPDATE project_cards
        SET job_code = $3,
            title = $4,
            updated_at = now()
      WHERE tenant_id = $1
        AND trello_card_id = $2`,
    [params.tenantId, params.trelloCardId, params.jobCode, params.canonicalTitle],
  ).catch(() => {});
}

export async function ensureJobCode(tenantId: string, jobId: string): Promise<EnsuredJobCode> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<JobCodeRow>(
      `SELECT
         j.id,
         j.title,
         j.client_id,
         j.job_code,
         j.canonical_title,
         j.trello_card_id,
         c.name AS client_name,
         c.profile AS client_profile
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1
        AND j.id = $2
      LIMIT 1
      FOR UPDATE OF j`,
      [tenantId, jobId],
    );

    const job = rows[0];
    if (!job) {
      await client.query('ROLLBACK');
      return {
        jobId,
        jobCode: null,
        canonicalTitle: null,
        plainTitle: '',
        trelloCardId: null,
        created: false,
        reason: 'not_found',
      };
    }

    const plainTitle = stripCanonicalJobCodePrefix(job.title);
    if (!job.client_id) {
      await client.query('COMMIT');
      return {
        jobId,
        jobCode: null,
        canonicalTitle: null,
        plainTitle,
        trelloCardId: job.trello_card_id,
        created: false,
        reason: 'missing_client',
      };
    }

    if (job.job_code) {
      const canonicalTitle = buildCanonicalJobTitle(job.job_code, plainTitle);
      if (job.title !== canonicalTitle || job.canonical_title !== canonicalTitle) {
        await client.query(
          `UPDATE jobs
              SET title = $3,
                  canonical_title = $3,
                  metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
                  updated_at = now()
            WHERE tenant_id = $1
              AND id = $2`,
          [
            tenantId,
            jobId,
            canonicalTitle,
            JSON.stringify({
              job_code: job.job_code,
              canonical_title: canonicalTitle,
            }),
          ],
        );
      }

      await client.query('COMMIT');
      await updateProjectCardMirror({
        tenantId,
        trelloCardId: job.trello_card_id,
        jobCode: job.job_code,
        canonicalTitle,
      });
      return {
        jobId,
        jobCode: job.job_code,
        canonicalTitle,
        plainTitle,
        trelloCardId: job.trello_card_id,
        created: false,
      };
    }

    const parsedExistingCode = parseCanonicalJobCode(job.title);
    let year: number;
    let sequence: number;
    let prefix: string;
    let jobCode: string;

    if (parsedExistingCode && await isJobCodeAvailable(client, tenantId, parsedExistingCode.jobCode, jobId)) {
      year = parsedExistingCode.year;
      sequence = parsedExistingCode.sequence;
      prefix = parsedExistingCode.prefix;
      jobCode = parsedExistingCode.jobCode;
      await reserveExistingSequence({
        client,
        tenantId,
        clientId: job.client_id,
        year,
        sequence,
      });
    } else {
      year = await getSaoPauloYear(client);
      sequence = await nextClientSequence(client, tenantId, job.client_id, year);
      const basePrefix = deriveClientCodePrefix(job.client_name, job.client_profile, job.client_id);
      const resolved = await resolveUniqueJobCode({
        client,
        tenantId,
        clientId: job.client_id,
        basePrefix,
        year,
        sequence,
      });
      jobCode = resolved.jobCode;
      prefix = resolved.prefix;
    }
    const canonicalTitle = buildCanonicalJobTitle(jobCode, plainTitle);

    await client.query(
      `UPDATE jobs
          SET job_code = $3,
              job_code_prefix = $4,
              job_sequence_year = $5,
              client_job_sequence = $6,
              canonical_title = $7,
              title = $7,
              metadata = COALESCE(metadata, '{}'::jsonb) || $8::jsonb,
              updated_at = now()
        WHERE tenant_id = $1
          AND id = $2`,
      [
        tenantId,
        jobId,
        jobCode,
        prefix,
        year,
        sequence,
        canonicalTitle,
        JSON.stringify({
          job_code: jobCode,
          job_code_prefix: prefix,
          job_sequence_year: year,
          client_job_sequence: sequence,
          canonical_title: canonicalTitle,
        }),
      ],
    );

    await client.query('COMMIT');
    await updateProjectCardMirror({
      tenantId,
      trelloCardId: job.trello_card_id,
      jobCode,
      canonicalTitle,
    });
    return {
      jobId,
      jobCode,
      canonicalTitle,
      plainTitle,
      trelloCardId: job.trello_card_id,
      created: true,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
