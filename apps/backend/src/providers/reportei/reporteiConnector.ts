import { query } from '../../db';
import { decryptJSON } from '../../security/secrets';

export type ReporteiConnectorConfig = {
  token?: string;
  baseUrl?: string;
  accountId?: string;
  rawPayload?: Record<string, any>;
};

function pickAccountId(payload?: Record<string, any>, secrets?: Record<string, any>) {
  return (
    payload?.reportei_account_id ||
    payload?.account_id ||
    payload?.id ||
    secrets?.reportei_account_id ||
    secrets?.account_id ||
    secrets?.id ||
    null
  );
}

function pickBaseUrl(payload?: Record<string, any>, secrets?: Record<string, any>) {
  return (
    payload?.base_url ||
    payload?.reportei_base_url ||
    payload?.baseUrl ||
    secrets?.base_url ||
    secrets?.reportei_base_url ||
    secrets?.baseUrl ||
    null
  );
}

function pickToken(payload?: Record<string, any>, secrets?: Record<string, any>) {
  return (
    secrets?.api_key ||
    secrets?.token ||
    secrets?.access_token ||
    payload?.api_key ||
    payload?.token ||
    payload?.access_token ||
    null
  );
}

export async function getReporteiConnector(
  tenantId: string,
  clientId: string
): Promise<ReporteiConnectorConfig | null> {
  const { rows } = await query<any>(
    `SELECT payload, secrets_enc
     FROM connectors
     WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'
     LIMIT 1`,
    [tenantId, clientId]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = row.payload || {};
  let secrets: Record<string, any> = {};
  if (row.secrets_enc) {
    try {
      secrets = await decryptJSON(row.secrets_enc);
    } catch {
      secrets = {};
    }
  }

  const accountId = pickAccountId(payload, secrets);
  const baseUrl = pickBaseUrl(payload, secrets);
  const token = pickToken(payload, secrets);

  return {
    accountId: accountId ? String(accountId) : undefined,
    baseUrl: baseUrl ? String(baseUrl) : undefined,
    token: token ? String(token) : undefined,
    rawPayload: payload,
  };
}
