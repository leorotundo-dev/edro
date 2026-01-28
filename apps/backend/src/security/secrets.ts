import sodium from 'libsodium-wrappers';

const b64 = {
  to: (u8: Uint8Array) => Buffer.from(u8).toString('base64'),
  from: (value: string) => new Uint8Array(Buffer.from(value, 'base64')),
};

export async function encryptJSON(payload: any) {
  await sodium.ready;
  const keyB64 = process.env.MASTER_KEY_B64;
  if (!keyB64) throw new Error('MASTER_KEY_B64 missing');

  const key = b64.from(keyB64);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('MASTER_KEY_B64 must be 32 bytes');
  }

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const msg = Buffer.from(JSON.stringify(payload), 'utf8');
  const ct = sodium.crypto_secretbox_easy(msg, nonce, key);

  return {
    enc: `${b64.to(nonce)}.${b64.to(ct)}`,
    meta: { alg: 'secretbox', v: 1 },
  };
}

export async function decryptJSON(enc: string) {
  await sodium.ready;
  const keyB64 = process.env.MASTER_KEY_B64;
  if (!keyB64) throw new Error('MASTER_KEY_B64 missing');

  const key = b64.from(keyB64);
  const [nonceB64, ctB64] = enc.split('.');
  if (!nonceB64 || !ctB64) {
    throw new Error('invalid_payload');
  }

  const nonce = b64.from(nonceB64);
  const ct = b64.from(ctB64);
  const msg = sodium.crypto_secretbox_open_easy(ct, nonce, key);
  if (!msg) throw new Error('decrypt_failed');
  return JSON.parse(Buffer.from(msg).toString('utf8'));
}
