import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ROOT = process.env.FILE_STORAGE_ROOT || path.join(process.cwd(), 'storage');
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true';
const USE_S3 = Boolean(S3_BUCKET && S3_REGION && S3_ACCESS_KEY && S3_SECRET_KEY);

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: S3_REGION!,
    credentials: {
      accessKeyId: S3_ACCESS_KEY!,
      secretAccessKey: S3_SECRET_KEY!,
    },
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH_STYLE,
  });
  return s3Client;
}

async function streamToBuffer(stream: Readable) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function ensureStorage() {
  if (USE_S3) return;
  if (!fs.existsSync(ROOT)) {
    fs.mkdirSync(ROOT, { recursive: true });
  }
}

export function buildKey(tenantId: string, clientId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tenantId}/${clientId}/${Date.now()}_${safe}`;
}

export async function saveFile(buffer: Buffer, key: string) {
  if (USE_S3) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
      })
    );
    return key;
  }
  await ensureStorage();
  const fullPath = path.join(ROOT, key);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

export async function readFile(key: string) {
  if (USE_S3) {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    const body = response.Body;
    if (!body) return Buffer.from('');
    if (body instanceof Readable) {
      return streamToBuffer(body);
    }
    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }
    if (typeof (body as any).transformToByteArray === 'function') {
      const bytes = await (body as any).transformToByteArray();
      return Buffer.from(bytes);
    }
    return Buffer.from('');
  }
  const fullPath = path.join(ROOT, key);
  return fs.readFileSync(fullPath);
}

export async function deleteFile(key: string) {
  if (USE_S3) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return;
  }
  const fullPath = path.join(ROOT, key);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
