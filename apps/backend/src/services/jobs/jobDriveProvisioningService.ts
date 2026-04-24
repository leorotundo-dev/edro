import { query } from '../../db';
import { enqueueOutbox } from '../trelloOutboxService';
import {
  buildDriveFolderUrl,
  ensureDriveFolder,
  getDriveAccessToken,
} from '../integrations/googleDriveService';
import { buildCanonicalJobTitle, ensureJobCode, stripCanonicalJobCodePrefix } from './jobCodeService';

const JOB_SUBFOLDERS = [
  '01 Assets',
  '02 Editáveis',
  '03 Aprovação',
  '04 Entregues',
  '05 Referências',
];

type JobDriveRow = {
  id: string;
  title: string;
  client_id: string | null;
  job_code: string | null;
  canonical_title: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  trello_card_id: string | null;
  client_name: string | null;
  client_profile: Record<string, unknown> | null;
  root_folder_id: string | null;
  root_folder_url: string | null;
  clients_root_folder_id: string | null;
  clients_root_folder_url: string | null;
};

export type DriveProvisionResult = {
  jobId: string;
  status: 'ready' | 'needs_connection' | 'needs_root' | 'missing_client' | 'error';
  jobCode: string | null;
  folderId: string | null;
  folderUrl: string | null;
  folderName: string | null;
  error?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error || 'Erro desconhecido').slice(0, 500);
}

function canonicalFolderName(jobCode: string, title: string | null | undefined): string {
  return buildCanonicalJobTitle(jobCode, stripCanonicalJobCodePrefix(title)).slice(0, 180);
}

async function updateProvisionStatus(params: {
  tenantId: string;
  jobId: string;
  clientId?: string | null;
  status: string;
  error?: string | null;
  folderName?: string | null;
  folderId?: string | null;
  folderUrl?: string | null;
}) {
  await query(
    `INSERT INTO job_drive_folders
       (tenant_id, job_id, client_id, folder_name, folder_id, folder_url, status, error)
     VALUES ($1, $2, $3, COALESCE($4, 'pending'), $5, $6, $7, $8)
     ON CONFLICT (tenant_id, job_id) DO UPDATE
       SET client_id = EXCLUDED.client_id,
           folder_name = EXCLUDED.folder_name,
           folder_id = EXCLUDED.folder_id,
           folder_url = EXCLUDED.folder_url,
           status = EXCLUDED.status,
           error = EXCLUDED.error,
           updated_at = now()`,
    [
      params.tenantId,
      params.jobId,
      params.clientId ?? null,
      params.folderName ?? null,
      params.folderId ?? null,
      params.folderUrl ?? null,
      params.status,
      params.error ?? null,
    ],
  ).catch(() => {});

  await query(
    `UPDATE jobs
        SET drive_provision_status = $3,
            drive_provision_error = $4,
            drive_folder_id = COALESCE($5, drive_folder_id),
            drive_folder_url = COALESCE($6, drive_folder_url),
            drive_provisioned_at = CASE WHEN $3 = 'ready' THEN now() ELSE drive_provisioned_at END,
            metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb,
            updated_at = now()
      WHERE tenant_id = $1
        AND id = $2`,
    [
      params.tenantId,
      params.jobId,
      params.status,
      params.error ?? null,
      params.folderId ?? null,
      params.folderUrl ?? null,
      JSON.stringify({
        drive_provision_status: params.status,
        drive_folder_id: params.folderId ?? null,
        drive_folder_url: params.folderUrl ?? null,
        drive_provision_error: params.error ?? null,
      }),
    ],
  ).catch(() => {});
}

async function fetchJobDriveRow(tenantId: string, jobId: string): Promise<JobDriveRow | null> {
  const { rows } = await query<JobDriveRow>(
    `SELECT
       j.id,
       j.title,
       j.client_id,
       j.job_code,
       j.canonical_title,
       j.drive_folder_id,
       j.drive_folder_url,
       j.trello_card_id,
       c.name AS client_name,
       c.profile AS client_profile,
       cdr.drive_folder_id AS root_folder_id,
       cdr.drive_folder_url AS root_folder_url,
       gds.clients_root_folder_id,
       gds.clients_root_folder_url
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN client_drive_roots cdr
       ON cdr.tenant_id = j.tenant_id
      AND cdr.client_id = j.client_id
      AND cdr.active = true
     LEFT JOIN google_drive_settings gds
       ON gds.tenant_id = j.tenant_id
    WHERE j.tenant_id = $1
      AND j.id = $2
    LIMIT 1`,
    [tenantId, jobId],
  );
  return rows[0] ?? null;
}

function getClientFolderName(job: JobDriveRow): string {
  const profile = job.client_profile ?? {};
  const explicit = [
    profile.drive_folder_name,
    profile.driveFolderName,
    profile.folder_name,
  ].find((value) => typeof value === 'string' && value.trim());
  return String(explicit || job.client_name || job.client_id || 'Cliente sem nome').trim();
}

async function resolveClientRootFolder(params: {
  tenantId: string;
  accessToken: string;
  job: JobDriveRow;
}): Promise<{ folderId: string; folderUrl: string; source: 'client_root' | 'clients_root' } | null> {
  if (params.job.root_folder_id) {
    return {
      folderId: params.job.root_folder_id,
      folderUrl: params.job.root_folder_url || buildDriveFolderUrl(params.job.root_folder_id),
      source: 'client_root',
    };
  }

  if (!params.job.client_id || !params.job.clients_root_folder_id) return null;

  const clientFolder = await ensureDriveFolder({
    accessToken: params.accessToken,
    parentFolderId: params.job.clients_root_folder_id,
    name: getClientFolderName(params.job),
  });

  await query(
    `INSERT INTO client_drive_roots
       (tenant_id, client_id, drive_folder_id, drive_folder_url, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (tenant_id, client_id) DO UPDATE
       SET drive_folder_id = EXCLUDED.drive_folder_id,
           drive_folder_url = EXCLUDED.drive_folder_url,
           active = true,
           updated_at = now()`,
    [params.tenantId, params.job.client_id, clientFolder.id, clientFolder.webViewLink],
  ).catch(() => {});

  return {
    folderId: clientFolder.id,
    folderUrl: clientFolder.webViewLink,
    source: 'clients_root',
  };
}

async function mirrorDriveOnProjectCard(params: {
  tenantId: string;
  trelloCardId: string | null;
  folderId: string;
  folderUrl: string;
  jobCode: string | null;
  canonicalTitle: string | null;
}) {
  if (!params.trelloCardId) return;
  await query(
    `UPDATE project_cards
        SET drive_folder_id = $3,
            drive_folder_url = $4,
            job_code = COALESCE($5, job_code),
            title = COALESCE($6, title),
            updated_at = now()
      WHERE tenant_id = $1
        AND trello_card_id = $2`,
    [
      params.tenantId,
      params.trelloCardId,
      params.folderId,
      params.folderUrl,
      params.jobCode,
      params.canonicalTitle,
    ],
  ).catch(() => {});
}

async function enqueueTrelloDriveSync(params: {
  tenantId: string;
  jobId: string;
  trelloCardId: string | null;
  canonicalTitle: string | null;
  folderUrl: string;
}) {
  if (!params.trelloCardId) return;

  if (params.canonicalTitle) {
    await enqueueOutbox(
      params.tenantId,
      'card.update',
      { trelloCardId: params.trelloCardId, fields: { name: params.canonicalTitle } },
      `job.${params.jobId}.canonical-title`,
    ).catch(() => {});
  }

  await enqueueOutbox(
    params.tenantId,
    'attachment.add',
    {
      trelloCardId: params.trelloCardId,
      url: params.folderUrl,
      name: 'Pasta do job no Google Drive',
    },
    `job.${params.jobId}.drive-folder-attachment`,
  ).catch(() => {});
}

export async function provisionDriveForJob(
  tenantId: string,
  jobId: string,
): Promise<DriveProvisionResult> {
  const code = await ensureJobCode(tenantId, jobId);
  if (code.reason === 'not_found') {
    return {
      jobId,
      status: 'error',
      jobCode: null,
      folderId: null,
      folderUrl: null,
      folderName: null,
      error: 'Job não encontrado.',
    };
  }
  if (code.reason === 'missing_client') {
    await updateProvisionStatus({
      tenantId,
      jobId,
      status: 'missing_client',
      error: 'Job sem cliente associado.',
    });
    return {
      jobId,
      status: 'missing_client',
      jobCode: null,
      folderId: null,
      folderUrl: null,
      folderName: null,
      error: 'Job sem cliente associado.',
    };
  }

  const job = await fetchJobDriveRow(tenantId, jobId);
  if (!job) {
    return {
      jobId,
      status: 'error',
      jobCode: code.jobCode,
      folderId: null,
      folderUrl: null,
      folderName: null,
      error: 'Job não encontrado.',
    };
  }

  if (job.drive_folder_id && job.drive_folder_url) {
    return {
      jobId,
      status: 'ready',
      jobCode: job.job_code,
      folderId: job.drive_folder_id,
      folderUrl: job.drive_folder_url,
      folderName: job.canonical_title || code.canonicalTitle || job.title,
    };
  }

  const jobCode = job.job_code || code.jobCode;
  if (!jobCode) {
    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'error',
      error: 'Job sem código canônico.',
    });
    return {
      jobId,
      status: 'error',
      jobCode: null,
      folderId: null,
      folderUrl: null,
      folderName: null,
      error: 'Job sem código canônico.',
    };
  }

  const folderName = canonicalFolderName(jobCode, job.canonical_title || job.title);
  let accessToken: string;
  try {
    accessToken = await getDriveAccessToken(tenantId);
  } catch (error) {
    const message = safeErrorMessage(error);
    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'needs_connection',
      error: message,
      folderName,
    });
    return {
      jobId,
      status: 'needs_connection',
      jobCode,
      folderId: null,
      folderUrl: null,
      folderName,
      error: message,
    };
  }

  let clientRoot: { folderId: string; folderUrl: string; source: 'client_root' | 'clients_root' } | null = null;
  try {
    clientRoot = await resolveClientRootFolder({ tenantId, accessToken, job });
  } catch (error) {
    const message = safeErrorMessage(error);
    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'error',
      error: message,
      folderName,
    });
    return {
      jobId,
      status: 'error',
      jobCode,
      folderId: null,
      folderUrl: null,
      folderName,
      error: message,
    };
  }

  if (!clientRoot) {
    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'needs_root',
      error: 'Configure a raiz geral do Drive ou a pasta raiz deste cliente.',
      folderName,
    });
    return {
      jobId,
      status: 'needs_root',
      jobCode,
      folderId: null,
      folderUrl: null,
      folderName,
      error: 'Configure a raiz geral do Drive ou a pasta raiz deste cliente.',
    };
  }

  try {
    const folder = await ensureDriveFolder({
      accessToken,
      parentFolderId: clientRoot.folderId,
      name: folderName,
    });
    const folderUrl = folder.webViewLink || buildDriveFolderUrl(folder.id);

    for (const subfolderName of JOB_SUBFOLDERS) {
      await ensureDriveFolder({
        accessToken,
        parentFolderId: folder.id,
        name: subfolderName,
      });
    }

    await query(
      `UPDATE jobs
          SET drive_folder_id = $3,
              drive_folder_url = $4,
              drive_provision_status = 'ready',
              drive_provision_error = NULL,
              drive_provisioned_at = now(),
              external_link = COALESCE(NULLIF(external_link, ''), $4),
              metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
              updated_at = now()
        WHERE tenant_id = $1
          AND id = $2`,
      [
        tenantId,
        jobId,
        folder.id,
        folderUrl,
        JSON.stringify({
          drive_folder_id: folder.id,
          drive_folder_url: folderUrl,
          drive_folder_name: folderName,
          drive_client_root_folder_id: clientRoot.folderId,
          drive_client_root_source: clientRoot.source,
          drive_subfolders: JOB_SUBFOLDERS,
          drive_provision_status: 'ready',
        }),
      ],
    );

    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'ready',
      folderName,
      folderId: folder.id,
      folderUrl,
    });

    await mirrorDriveOnProjectCard({
      tenantId,
      trelloCardId: job.trello_card_id,
      folderId: folder.id,
      folderUrl,
      jobCode,
      canonicalTitle: job.canonical_title || code.canonicalTitle,
    });

    await enqueueTrelloDriveSync({
      tenantId,
      jobId,
      trelloCardId: job.trello_card_id,
      canonicalTitle: job.canonical_title || code.canonicalTitle,
      folderUrl,
    });

    return {
      jobId,
      status: 'ready',
      jobCode,
      folderId: folder.id,
      folderUrl,
      folderName,
    };
  } catch (error) {
    const message = safeErrorMessage(error);
    await updateProvisionStatus({
      tenantId,
      jobId,
      clientId: job.client_id,
      status: 'error',
      error: message,
      folderName,
    });
    return {
      jobId,
      status: 'error',
      jobCode,
      folderId: null,
      folderUrl: null,
      folderName,
      error: message,
    };
  }
}

export async function retryPendingDriveProvisioning(tenantId: string, limit = 25): Promise<{
  attempted: number;
  ready: number;
  blocked: number;
  errors: number;
}> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { rows } = await query<{ id: string }>(
    `SELECT id
       FROM jobs
      WHERE tenant_id = $1
        AND client_id IS NOT NULL
        AND drive_provision_status IN ('pending', 'needs_connection', 'needs_root', 'error')
      ORDER BY created_at DESC
      LIMIT $2`,
    [tenantId, safeLimit],
  );

  let ready = 0;
  let blocked = 0;
  let errors = 0;

  for (const row of rows) {
    const result = await provisionDriveForJob(tenantId, row.id);
    if (result.status === 'ready') ready++;
    else if (result.status === 'error') errors++;
    else blocked++;
  }

  return {
    attempted: rows.length,
    ready,
    blocked,
    errors,
  };
}
