/**
 * loraService.ts
 *
 * Real LoRA training pipeline via Fal.ai.
 *   1. Fetch training images → build in-memory ZIP
 *   2. Upload ZIP to Fal.ai storage
 *   3. Submit queued training job (flux-lora-fast-training)
 *   4. Persist job to lora_training_jobs table
 *   5. loraMonitorWorker polls status every 60s
 *   6. On completion, approveLoraModel writes fal_lora_id to clients.profile
 */

import { query } from '../db';
import { env } from '../env';

type StartLoraTrainingInput = {
  tenantId: string;
  clientId: string;
  trainingImages: string[];
  triggerWord: string;
  steps: number;
  learningRate: number;
  modelBase: 'flux-dev' | 'flux-pro';
};

type ReviewLoraModelInput = {
  tenantId: string;
  clientId: string;
  jobId: string;
  approvedBy?: string | null;
};

// ── ZIP builder (pure JS, no external deps) ───────────────────────────────────

let _crcTable: Uint32Array | null = null;

function makeCrcTable(): Uint32Array {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    _crcTable[i] = c >>> 0;
  }
  return _crcTable;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  const table = makeCrcTable();
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(v: DataView, offset: number, val: number) { v.setUint16(offset, val, true); }
function u32(v: DataView, offset: number, val: number) { v.setUint32(offset, val, true); }

function buildZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder();
  const localMeta: Array<{ offset: number; nameBytes: Uint8Array; crc: number; size: number }> = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const crc = crc32(file.data);
    const hdr = new ArrayBuffer(30 + nameBytes.length);
    const v = new DataView(hdr);
    u32(v, 0, 0x04034b50); u16(v, 4, 20); u16(v, 6, 0); u16(v, 8, 0);
    u16(v, 10, 0); u16(v, 12, 0);
    u32(v, 14, crc); u32(v, 18, file.data.length); u32(v, 22, file.data.length);
    u16(v, 26, nameBytes.length); u16(v, 28, 0);
    new Uint8Array(hdr).set(nameBytes, 30);

    localMeta.push({ offset, nameBytes, crc, size: file.data.length });
    parts.push(new Uint8Array(hdr), file.data);
    offset += 30 + nameBytes.length + file.data.length;
  }

  const centralStart = offset;
  for (let i = 0; i < files.length; i++) {
    const { offset: lo, nameBytes, crc, size } = localMeta[i];
    const cd = new ArrayBuffer(46 + nameBytes.length);
    const v = new DataView(cd);
    u32(v, 0, 0x02014b50); u16(v, 4, 20); u16(v, 6, 20); u16(v, 8, 0); u16(v, 10, 0);
    u16(v, 12, 0); u16(v, 14, 0);
    u32(v, 16, crc); u32(v, 20, size); u32(v, 24, size);
    u16(v, 28, nameBytes.length); u16(v, 30, 0); u16(v, 32, 0);
    u16(v, 34, 0); u16(v, 36, 0); u32(v, 38, 0); u32(v, 42, lo);
    new Uint8Array(cd).set(nameBytes, 46);
    parts.push(new Uint8Array(cd));
    offset += 46 + nameBytes.length;
  }

  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0);
  u16(ev, 8, files.length); u16(ev, 10, files.length);
  u32(ev, 12, offset - centralStart); u32(ev, 16, centralStart); u16(ev, 20, 0);
  parts.push(new Uint8Array(eocd));

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

// ── Fal.ai helpers ────────────────────────────────────────────────────────────

const TRAINING_MODEL = 'fal-ai/flux-lora-fast-training';
const QUEUE_BASE     = `https://queue.fal.run/${TRAINING_MODEL}`;
const STORAGE_URL    = 'https://storage.fal.run/upload';

function falKey(): string {
  return env.FAL_API_KEY ?? process.env.FAL_API_KEY ?? '';
}

async function falFetch(url: string, opts: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Key ${falKey()}`, ...((opts.headers as Record<string, string>) ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fal.ai ${opts.method ?? 'GET'} ${url} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function uploadZipToFal(zipBytes: Uint8Array, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' }), fileName);
  const res = await fetch(STORAGE_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey()}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fal.ai storage upload → ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json?.url) throw new Error('fal.ai storage: sem URL na resposta');
  return json.url as string;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listLoraJobs(tenantId: string, clientId: string) {
  const { rows } = await query(
    `SELECT id, status, trigger_word, model_base, steps,
            lora_weights_url, fal_request_id, training_images,
            error_message, approved_by, approved_at, created_at, updated_at
     FROM lora_training_jobs
     WHERE tenant_id = $1 AND client_id = $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [tenantId, clientId],
  );
  return rows;
}

export async function startLoraTraining(input: StartLoraTrainingInput) {
  const { tenantId, clientId, trainingImages, triggerWord, steps, learningRate, modelBase } = input;

  if (!trainingImages.length) throw new Error('Nenhuma imagem de treino fornecida.');
  if (!falKey()) throw new Error('FAL_API_KEY não configurada.');

  // 1. Fetch all training images concurrently
  const imageFiles: Array<{ name: string; data: Uint8Array }> = new Array(trainingImages.length);
  await Promise.all(
    trainingImages.map(async (url, i) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Falha ao baixar imagem ${i + 1}: ${res.status}`);
      const buf = await res.arrayBuffer();
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
      imageFiles[i] = { name: `image_${String(i + 1).padStart(3, '0')}.${ext}`, data: new Uint8Array(buf) };
    }),
  );

  // 2. Build ZIP in memory
  const zipBytes = buildZip(imageFiles);

  // 3. Upload ZIP to Fal.ai storage
  const zipUrl = await uploadZipToFal(zipBytes, `lora_train_${clientId}_${Date.now()}.zip`);

  // 4. Submit training job to Fal.ai queue
  const falResp: { request_id: string } = await falFetch(QUEUE_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images_data_url: zipUrl,
      trigger_word: triggerWord,
      steps,
      learning_rate: learningRate,
      is_style: false,
      create_masks: true,
    }),
  });

  if (!falResp?.request_id) throw new Error('fal.ai queue: sem request_id na resposta');

  // 5. Persist to DB
  const { rows } = await query<{ id: string }>(
    `INSERT INTO lora_training_jobs
       (tenant_id, client_id, fal_request_id, status, trigger_word, model_base,
        training_images, steps)
     VALUES ($1, $2, $3, 'training', $4, $5, $6, $7)
     RETURNING id`,
    [tenantId, clientId, falResp.request_id, triggerWord, modelBase, trainingImages, steps],
  );

  console.log(`[loraService] started training job ${rows[0].id} (fal: ${falResp.request_id})`);
  return rows[0];
}

export async function checkTrainingStatus(jobId: string): Promise<void> {
  const { rows } = await query<{ fal_request_id: string; tenant_id: string; client_id: string }>(
    `SELECT fal_request_id, tenant_id, client_id
     FROM lora_training_jobs
     WHERE id = $1 AND status = 'training'`,
    [jobId],
  );

  const job = rows[0];
  if (!job?.fal_request_id) return;

  const statusResp = await falFetch(
    `${QUEUE_BASE}/requests/${job.fal_request_id}/status`,
    { method: 'GET' },
  );

  if (statusResp.status === 'COMPLETED') {
    const result = await falFetch(
      `${QUEUE_BASE}/requests/${job.fal_request_id}`,
      { method: 'GET' },
    );
    const weightsUrl: string = result?.output?.diffusers_lora_file?.url ?? '';
    await query(
      `UPDATE lora_training_jobs
       SET status = 'completed', lora_weights_url = $2, updated_at = now()
       WHERE id = $1`,
      [jobId, weightsUrl],
    );
    console.log(`[loraService] job ${jobId} completed — weights: ${weightsUrl.slice(0, 80)}`);
  } else if (statusResp.status === 'FAILED') {
    const errMsg: string = statusResp.error?.message ?? 'Falha no treinamento Fal.ai';
    await query(
      `UPDATE lora_training_jobs
       SET status = 'failed', error_message = $2, updated_at = now()
       WHERE id = $1`,
      [jobId, errMsg],
    );
    console.warn(`[loraService] job ${jobId} failed: ${errMsg}`);
  }
  // IN_QUEUE / IN_PROGRESS → no-op, will poll again
}

export async function approveLoraModel(input: ReviewLoraModelInput) {
  const { tenantId, clientId, jobId, approvedBy } = input;

  const { rows } = await query<{ lora_weights_url: string }>(
    `UPDATE lora_training_jobs
     SET status = 'approved', approved_by = $3, approved_at = now(), updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'completed'
     RETURNING lora_weights_url`,
    [jobId, tenantId, approvedBy ?? null],
  );

  const job = rows[0];
  if (!job) throw new Error('Job não encontrado ou não está em status completed.');

  // Write fal_lora_id into clients.profile JSONB
  await query(
    `UPDATE clients
     SET profile    = COALESCE(profile, '{}'::jsonb)
                      || jsonb_build_object(
                           'fal_lora_id',    $3::text,
                           'fal_lora_scale', 0.85
                         ),
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId, job.lora_weights_url],
  );

  console.log(`[loraService] job ${jobId} approved → client ${clientId} fal_lora_id set`);
  return { success: true };
}

export async function rejectLoraModel(input: ReviewLoraModelInput) {
  const { tenantId, jobId, approvedBy } = input;

  await query(
    `UPDATE lora_training_jobs
     SET status = 'rejected', approved_by = $3, approved_at = now(), updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [jobId, tenantId, approvedBy ?? null],
  );

  console.log(`[loraService] job ${jobId} rejected`);
  return { success: true };
}
