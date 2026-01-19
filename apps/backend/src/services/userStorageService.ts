import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const USER_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'user-sources');

const s3Enabled = !!process.env.S3_BUCKET && !!process.env.S3_REGION;
const s3Client = s3Enabled
  ? new S3Client({
      region: process.env.S3_REGION,
      credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
          }
        : undefined,
    })
  : null;

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const UPLOAD_EXPIRES_SECONDS = toPositiveInt(process.env.S3_UPLOAD_EXPIRES_SECONDS, 900);
const DOWNLOAD_EXPIRES_SECONDS = toPositiveInt(process.env.S3_DOWNLOAD_EXPIRES_SECONDS, 3600);

function makeSafeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '');
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/\/+$/g, '');
}

export function buildUserSourceKey(params: {
  userId: string;
  sourceId: string;
  fileName?: string | null;
}) {
  const safeFile = makeSafeName(params.fileName || `${params.sourceId}-${randomUUID()}`);
  const prefix = normalizePrefix(`users/${params.userId}/sources/${params.sourceId}`);
  return `${prefix}/${safeFile}`;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function createUploadUrl(params: {
  bucket?: string;
  key: string;
  contentType?: string | null;
}) {
  if (!s3Client || !process.env.S3_BUCKET) {
    throw new Error('S3 not configured');
  }
  const command = new PutObjectCommand({
    Bucket: params.bucket || process.env.S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType || undefined,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_EXPIRES_SECONDS,
  });
  return {
    uploadUrl,
    headers: params.contentType ? { 'Content-Type': params.contentType } : {},
  };
}

export async function getDownloadUrl(params: { bucket?: string; key: string }) {
  if (!s3Client || !process.env.S3_BUCKET) {
    throw new Error('S3 not configured');
  }
  const command = new GetObjectCommand({
    Bucket: params.bucket || process.env.S3_BUCKET,
    Key: params.key,
  });
  return await getSignedUrl(s3Client, command, {
    expiresIn: DOWNLOAD_EXPIRES_SECONDS,
  });
}

export async function getObjectBuffer(params: { bucket?: string; key: string }): Promise<Buffer> {
  if (!s3Client || !process.env.S3_BUCKET) {
    throw new Error('S3 not configured');
  }
  const command = new GetObjectCommand({
    Bucket: params.bucket || process.env.S3_BUCKET,
    Key: params.key,
  });
  const response = await s3Client.send(command);
  if (!response.Body || !(response.Body instanceof Readable)) {
    throw new Error('S3 object body missing');
  }
  return await streamToBuffer(response.Body);
}

export async function saveLocalFile(params: {
  sourceId: string;
  fileName?: string | null;
  buffer: Buffer;
}): Promise<{ path: string; fileName: string }> {
  await fs.mkdir(USER_UPLOAD_ROOT, { recursive: true });
  const safeName = makeSafeName(params.fileName || `${params.sourceId}-${randomUUID()}`);
  const filePath = path.join(USER_UPLOAD_ROOT, safeName);
  await fs.writeFile(filePath, params.buffer);
  return { path: filePath, fileName: safeName };
}

export async function getLocalFilePath(fileName: string): Promise<string | null> {
  const filePath = path.join(USER_UPLOAD_ROOT, fileName);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

export const UserStorageService = {
  s3Enabled,
  buildUserSourceKey,
  createUploadUrl,
  getDownloadUrl,
  getObjectBuffer,
  saveLocalFile,
  getLocalFilePath,
};

export default UserStorageService;
