/**
 * D4Sign API wrapper
 * Docs: https://docapi.d4sign.com.br/
 *
 * Required env vars:
 *   D4SIGN_TOKEN_API   — Token API from D4Sign dashboard
 *   D4SIGN_CRYPT_KEY   — Crypt Key from D4Sign dashboard
 *   D4SIGN_SAFE_UUID   — UUID of the "cofre" where documents are stored
 *   D4SIGN_SANDBOX     — "true" to use sandbox (default: false)
 */

import { env } from '../env';

const BASE_URL = env.D4SIGN_SANDBOX
  ? 'https://sandbox.d4sign.com.br/api/v1'
  : 'https://secure.d4sign.com.br/api/v1';

const TOKEN  = env.D4SIGN_TOKEN_API ?? '';
const CRYPT  = env.D4SIGN_CRYPT_KEY ?? '';
const SAFE   = env.D4SIGN_SAFE_UUID ?? '';

function authParams() {
  return `tokenAPI=${TOKEN}&cryptKey=${CRYPT}`;
}

async function d4fetch(path: string, options: RequestInit = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${sep}${authParams()}`;
  // lgtm[js/request-forgery] BASE_URL is hardcoded to d4sign.com.br; path comes from internal callers only
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { message: text }; }

  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? `D4Sign HTTP ${res.status}`;
    throw new Error(`D4Sign: ${msg}`);
  }
  return json;
}

// ── Upload PDF and create document in the safe ────────────────────────────────

export async function uploadDocument(
  pdfBuffer: Buffer,
  filename: string,
): Promise<string> {
  if (!SAFE) throw new Error('D4SIGN_SAFE_UUID não configurado.');

  const form = new FormData();
  const pdfArrayBuffer = new ArrayBuffer(pdfBuffer.byteLength);
  new Uint8Array(pdfArrayBuffer).set(pdfBuffer);
  form.append('file', new Blob([pdfArrayBuffer], { type: 'application/pdf' }), filename);

  const data = await d4fetch(`/documents/${SAFE}/upload`, {
    method: 'POST',
    body: form,
  });

  // Response: { uuid: '...', name: '...', ... }
  const uuid = data?.uuid ?? data?.document?.uuid;
  if (!uuid) throw new Error('D4Sign não retornou UUID do documento.');
  return uuid as string;
}

// ── Add a signer to a document ────────────────────────────────────────────────

export interface D4SignSigner {
  email: string;
  /** Display name shown in D4Sign UI */
  display_name?: string;
  /**
   * act: "1" = signer, "2" = approver, "3" = observer, "4" = cc (copy)
   */
  act?: '1' | '2' | '3' | '4';
}

export async function addSigners(
  documentUuid: string,
  signers: D4SignSigner[],
): Promise<void> {
  const payload = {
    signers: signers.map((s) => ({
      email: s.email,
      act: s.act ?? '1',
      foreign: '0',
      certificadoicpbrasil: '0',
      assinatura_presencial: '0',
      ...(s.display_name ? { display_name: s.display_name } : {}),
    })),
  };

  await d4fetch(`/documents/${documentUuid}/createlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── Send document to signers (triggers emails) ────────────────────────────────

export async function sendToSigners(
  documentUuid: string,
  options?: {
    message?: string;
    workflow?: '0' | '1'; // 0 = all at once, 1 = sequential
  },
): Promise<void> {
  const payload = {
    message: options?.message ?? 'Por favor, assine o contrato de prestação de serviços.',
    workflow: options?.workflow ?? '0',
    skip_email: '0',
  };

  await d4fetch(`/documents/${documentUuid}/sendtosigner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── Get document info (status, download url) ──────────────────────────────────

export async function getDocument(documentUuid: string): Promise<{
  uuid: string;
  status: number; // 1=processing, 2=waiting signatures, 3=signed, 4=cancelled
  name: string;
  signed_file?: string; // URL to download signed PDF
}> {
  return d4fetch(`/documents/${documentUuid}`);
}

// ── Get signed document download URL ─────────────────────────────────────────

export async function getSignedDownloadUrl(documentUuid: string): Promise<string | null> {
  try {
    const data = await d4fetch(`/documents/${documentUuid}/download`);
    return data?.fileUrl ?? data?.url ?? null;
  } catch {
    return null;
  }
}

// ── Full flow: upload + add signers + send ────────────────────────────────────

export async function createAndSendContract(params: {
  pdfBuffer: Buffer;
  filename: string;
  freelancerEmail: string;
  freelancerName: string;
  /** Optional: add Edro as second signer/observer */
  agencyEmail?: string;
  agencyName?: string;
}): Promise<string> {
  const docUuid = await uploadDocument(params.pdfBuffer, params.filename);

  const signers: D4SignSigner[] = [
    {
      email: params.freelancerEmail,
      display_name: params.freelancerName,
      act: '1',
    },
  ];

  if (params.agencyEmail) {
    signers.push({
      email: params.agencyEmail,
      display_name: params.agencyName ?? 'Edro Studio',
      act: '3', // observer (cc) — or '1' if agency also needs to sign
    });
  }

  await addSigners(docUuid, signers);
  await sendToSigners(docUuid, {
    message: `Olá, ${params.freelancerName}! Seu contrato de prestação de serviços como Fornecedor PJ está pronto para assinatura.`,
  });

  return docUuid;
}

// ── Webhook payload parser ────────────────────────────────────────────────────

export interface D4SignWebhookPayload {
  /** Document UUID */
  uuid: string;
  /** Event type: "signed", "cancelled", etc. */
  type_post: string;
  /** Signer email (present on per-signer events) */
  email?: string;
  /** Status code after event */
  status_id?: string;
}

export function parseWebhook(body: unknown): D4SignWebhookPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!b.uuid || !b.type_post) return null;
  return {
    uuid: b.uuid as string,
    type_post: b.type_post as string,
    email: b.email as string | undefined,
    status_id: b.status_id as string | undefined,
  };
}
