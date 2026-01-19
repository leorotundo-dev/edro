import { query } from '../db';
import { encryptField, hashField } from '../services/fieldEncryption';

function looksHashed(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

export async function backfillNotificationDevices() {
  const { rows } = await query<{
    id: string;
    token: string | null;
    token_encrypted: string | null;
    token_hash: string | null;
  }>(
    `
      SELECT id, token, token_encrypted, token_hash
      FROM notification_devices
      WHERE token_encrypted IS NULL
         OR token_hash IS NULL
         OR token_last4 IS NULL
    `
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const token = row.token || '';
    if (!token) {
      skipped += 1;
      continue;
    }

    if (looksHashed(token) && !row.token_encrypted) {
      console.warn('[backfill] Token already hashed; cannot encrypt without plaintext.', row.id);
      skipped += 1;
      continue;
    }

    const tokenHash = hashField(token);
    const tokenEncrypted = encryptField(token);
    const tokenLast4 = token.slice(-4);

    await query(
      `
        UPDATE notification_devices
        SET token = $2,
            token_hash = $3,
            token_encrypted = $4,
            token_last4 = $5
        WHERE id = $1
      `,
      [row.id, tokenHash, tokenHash, tokenEncrypted, tokenLast4]
    );

    updated += 1;
  }

  console.log('[backfill] Notification devices updated:', updated, 'skipped:', skipped);
}

if (require.main === module) {
  backfillNotificationDevices()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[backfill] Failed:', err);
      process.exit(1);
    });
}
