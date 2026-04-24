import crypto from 'crypto';
import { query } from '../../db';
import { env } from '../../env';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

type DriveConnectionRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
};

type OAuthStatePayload = {
  tenantId: string;
  service?: string;
  ts?: number;
};

export type DriveFolder = {
  id: string;
  name: string;
  webViewLink: string;
};

function signOAuthState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET não configurado.');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyOAuthState(rawState: string): OAuthStatePayload {
  const dotIndex = rawState.lastIndexOf('.');
  if (dotIndex < 0) throw new Error('Invalid OAuth state format');
  const data = rawState.slice(0, dotIndex);
  const sig = rawState.slice(dotIndex + 1);
  const secret = env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET não configurado.');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) throw new Error('Invalid OAuth state signature');
  return JSON.parse(Buffer.from(data, 'base64url').toString());
}

export function isDriveOAuthState(rawState: string | undefined | null): boolean {
  if (!rawState) return false;
  try {
    return verifyOAuthState(rawState).service === 'drive';
  } catch {
    return false;
  }
}

function resolveDriveRedirectUri(): string {
  if (env.GOOGLE_DRIVE_REDIRECT_URI) {
    return env.GOOGLE_DRIVE_REDIRECT_URI;
  }
  const publicBase = env.PUBLIC_API_URL?.replace(/\/+$/, '').replace(/\/api$/, '');
  if (!publicBase) {
    throw new Error('Configure GOOGLE_DRIVE_REDIRECT_URI ou PUBLIC_API_URL para o OAuth do Google Drive.');
  }
  return `${publicBase}/api/auth/google/drive/callback`;
}

function escapeDriveQueryValue(value: string): string {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function folderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

async function markDriveError(tenantId: string, message: string | null) {
  await query(
    `UPDATE google_drive_connections
        SET last_error = $2,
            updated_at = now()
      WHERE tenant_id = $1`,
    [tenantId, message ? message.slice(0, 500) : null],
  ).catch(() => {});
}

export function driveOAuthUrl(tenantId: string): string {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = resolveDriveRedirectUri();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID não configurado.');

  const state = signOAuthState({ tenantId, service: 'drive', ts: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeDriveCode(code: string, rawState: string): Promise<{
  tenantId: string;
  email: string;
}> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = resolveDriveRedirectUri();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => '');
    throw new Error(`Drive token exchange failed: ${err.slice(0, 200)}`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    const err = await userRes.text().catch(() => '');
    throw new Error(`Drive userinfo failed: ${err.slice(0, 200)}`);
  }
  const userInfo = await userRes.json() as { email: string };

  let tenantId: string;
  try {
    tenantId = verifyOAuthState(rawState).tenantId;
  } catch {
    throw new Error('Invalid OAuth state');
  }

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
  await query(
    `INSERT INTO google_drive_connections
       (tenant_id, email_address, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id) DO UPDATE
       SET email_address = $2,
           access_token = $3,
           refresh_token = COALESCE($4, google_drive_connections.refresh_token),
           token_expiry = $5,
           updated_at = now(),
           last_error = NULL`,
    [tenantId, userInfo.email, tokens.access_token, tokens.refresh_token ?? null, tokenExpiry],
  );

  return { tenantId, email: userInfo.email };
}

export async function getDriveAccessToken(tenantId: string): Promise<string> {
  const { rows } = await query<DriveConnectionRow>(
    `SELECT access_token, refresh_token, token_expiry
       FROM google_drive_connections
      WHERE tenant_id = $1
      LIMIT 1`,
    [tenantId],
  );
  if (!rows.length) throw new Error('Google Drive não configurado para este tenant.');

  const { access_token, refresh_token, token_expiry } = rows[0];
  if (access_token && token_expiry && new Date(token_expiry).getTime() > Date.now() + 120_000) {
    return access_token;
  }

  if (!refresh_token) {
    await markDriveError(tenantId, 'Refresh token não disponível. Reconecte o Google Drive.');
    throw new Error('Refresh token não disponível. Reconecte o Google Drive.');
  }

  const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!refreshRes.ok) {
    await markDriveError(tenantId, 'Falha ao renovar token Google Drive.');
    throw new Error('Falha ao renovar token Google Drive.');
  }

  const newTokens = await refreshRes.json() as { access_token: string; expires_in: number };
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
  await query(
    `UPDATE google_drive_connections
        SET access_token = $1,
            token_expiry = $2,
            updated_at = now(),
            last_error = NULL
      WHERE tenant_id = $3`,
    [newTokens.access_token, newExpiry, tenantId],
  );

  return newTokens.access_token;
}

export async function disconnectDrive(tenantId: string): Promise<void> {
  await query(`DELETE FROM google_drive_connections WHERE tenant_id = $1`, [tenantId]);
}

export async function findDriveFolder(params: {
  accessToken: string;
  parentFolderId: string;
  name: string;
}): Promise<DriveFolder | null> {
  const q = [
    `mimeType='${FOLDER_MIME_TYPE}'`,
    `name='${escapeDriveQueryValue(params.name)}'`,
    `'${escapeDriveQueryValue(params.parentFolderId)}' in parents`,
    'trashed=false',
  ].join(' and ');

  const url = `${DRIVE_API}/files?${new URLSearchParams({
    q,
    fields: 'files(id,name,webViewLink)',
    pageSize: '1',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Drive find folder failed (${res.status}): ${err.slice(0, 250)}`);
  }

  const data = await res.json() as { files?: DriveFolder[] };
  const folder = data.files?.[0];
  if (!folder?.id) return null;
  return {
    id: folder.id,
    name: folder.name,
    webViewLink: folder.webViewLink || folderUrl(folder.id),
  };
}

export async function createDriveFolder(params: {
  accessToken: string;
  parentFolderId: string;
  name: string;
}): Promise<DriveFolder> {
  const res = await fetch(`${DRIVE_API}/files?${new URLSearchParams({
    fields: 'id,name,webViewLink',
    supportsAllDrives: 'true',
  })}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [params.parentFolderId],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Drive create folder failed (${res.status}): ${err.slice(0, 250)}`);
  }

  const folder = await res.json() as DriveFolder;
  return {
    id: folder.id,
    name: folder.name,
    webViewLink: folder.webViewLink || folderUrl(folder.id),
  };
}

export async function ensureDriveFolder(params: {
  accessToken: string;
  parentFolderId: string;
  name: string;
}): Promise<DriveFolder & { created: boolean }> {
  const existing = await findDriveFolder(params);
  if (existing) return { ...existing, created: false };

  const created = await createDriveFolder(params);
  return { ...created, created: true };
}

export function buildDriveFolderUrl(folderId: string): string {
  return folderUrl(folderId);
}

export function extractDriveFolderId(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) return folderMatch[1];

  const idParam = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam?.[1]) return idParam[1];

  return raw;
}
