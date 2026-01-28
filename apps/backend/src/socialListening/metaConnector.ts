import { query } from '../db';
import { decryptJSON } from '../security/secrets';

export type MetaConnectorConfig = {
  accessToken?: string;
  pageId?: string;
  instagramBusinessId?: string;
};

export async function getMetaConnector(tenantId: string, clientId: string): Promise<MetaConnectorConfig | null> {
  const { rows } = await query<any>(
    `SELECT payload, secrets_enc FROM connectors WHERE tenant_id=$1 AND client_id=$2 AND provider='meta' LIMIT 1`,
    [tenantId, clientId]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = row.payload || {};
  let secrets: any = {};
  if (row.secrets_enc) {
    try {
      secrets = await decryptJSON(row.secrets_enc);
    } catch {
      secrets = {};
    }
  }

  return {
    accessToken: secrets.access_token || payload.access_token || secrets.token || payload.token,
    pageId: payload.page_id || secrets.page_id || payload.facebook_page_id,
    instagramBusinessId:
      payload.instagram_business_id || secrets.instagram_business_id || payload.ig_business_id || secrets.ig_business_id,
  };
}
