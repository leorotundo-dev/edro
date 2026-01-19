import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'editais');

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

function ensurePdfDataUrl(base64: string): string {
  if (!base64.startsWith('data:application/pdf;base64,')) {
    throw new Error('Invalid PDF data URL');
  }
  return base64.replace('data:application/pdf;base64,', '');
}

function makeSafeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '');
}

function parseDateForPrefix(value?: string): Date {
  if (!value) return new Date();
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
  }
  const brMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    return new Date(`${brMatch[3]}-${month}-${day}T00:00:00Z`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function buildEditalStoragePrefix(params: {
  banca?: string;
  publication?: string;
  editalId: string;
}): string {
  const rawBanca = (params.banca || 'geral').toLowerCase();
  const bancaSlug = rawBanca.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'geral';
  const date = parseDateForPrefix(params.publication);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `editais/${bancaSlug}/${year}/${month}/${params.editalId}`;
}

async function saveLocal(buffer: Buffer, editalId: string, filename?: string): Promise<string> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const safeName = makeSafeName(filename || `${editalId}-${randomUUID()}.pdf`);
  const filePath = path.join(UPLOAD_ROOT, safeName);
  await fs.writeFile(filePath, buffer);
  return `/api/editais/${editalId}/pdf?file=${encodeURIComponent(safeName)}`;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.replace(/\/+$/g, '');
  return trimmed ? `${trimmed}/` : '';
}

async function saveS3(
  buffer: Buffer,
  editalId: string,
  filename?: string,
  prefix?: string
): Promise<string> {
  if (!s3Client || !process.env.S3_BUCKET) {
    throw new Error('S3 not configured');
  }
  const prefixPath = normalizePrefix(prefix) || `editais/${editalId}/`;
  const key = `${prefixPath}${makeSafeName(filename || `${editalId}-${randomUUID()}.pdf`)}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );
  // URL presign de leitura (1 dia)
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 }
  );
  return url;
}

export async function saveEditalPdf(
  base64: string,
  editalId: string,
  filename?: string,
  options?: { prefix?: string }
): Promise<string> {
  const data = ensurePdfDataUrl(base64);
  const buffer = Buffer.from(data, 'base64');
  return s3Enabled
    ? saveS3(buffer, editalId, filename, options?.prefix)
    : saveLocal(buffer, editalId, filename);
}

export async function getEditalPdfPath(file: string): Promise<string | null> {
  const filePath = path.join(UPLOAD_ROOT, file);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

async function getLocalStorageUsageBytes(): Promise<number> {
  try {
    const entries = await fs.readdir(UPLOAD_ROOT, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const stat = await fs.stat(path.join(UPLOAD_ROOT, entry.name));
      total += stat.size;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function getEditalStorageUsage(): Promise<{
  location: 's3' | 'local';
  usedBytes?: number;
}> {
  if (s3Enabled) {
    let total = 0;
    let token: string | undefined = undefined;
    const maxKeys = Number(process.env.S3_USAGE_MAX_KEYS || 10000);
    let scanned = 0;

    while (scanned < maxKeys) {
      const result = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: 'editais/',
          ContinuationToken: token,
          MaxKeys: Math.min(1000, maxKeys - scanned),
        })
      );
      const contents = result.Contents || [];
      contents.forEach((item) => {
        total += item.Size || 0;
      });
      scanned += contents.length;
      if (!result.IsTruncated) break;
      token = result.NextContinuationToken;
      if (!token) break;
    }

    return { location: 's3', usedBytes: total };
  }
  const usedBytes = await getLocalStorageUsageBytes();
  return { location: 'local', usedBytes };
}

export const FileStorageService = {
  saveEditalPdf,
  getEditalPdfPath,
  s3Enabled,
  getEditalStorageUsage,
  buildEditalStoragePrefix,
};

export default FileStorageService;
