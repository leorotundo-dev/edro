import { query } from '../../db';
import { decryptJSON } from '../../security/secrets';

export type ReporteiConnectorConfig = {
  token?: string;
  baseUrl?: string;
  /** Reportei integration ID (numeric or UUID) — used in POST /metrics/get-data */
  integrationId?: string;
  /** Legacy Reportei account/company ID — often matches project ID in seeded connectors */
  accountId?: string;
  /** Reportei project ID — optional, for listing integrations */
  projectId?: string;
  /**
   * Per-platform integration IDs.
   * Keys are Reportei slugs: 'instagram_business', 'linkedin', 'facebook_ads', etc.
   * Populated by auto-link or manual multi-platform linking.
   */
  platforms?: Record<string, number>;
  rawPayload?: Record<string, any>;
};

function pickIntegrationId(payload?: Record<string, any>, secrets?: Record<string, any>): string | null {
  return (
    payload?.integration_id ||
    payload?.reportei_integration_id ||
    secrets?.integration_id ||
    secrets?.reportei_integration_id ||
    // legacy field names — kept for migration compat
    payload?.customer_integration_id ||
    payload?.customer_integration ||
    payload?.reportei_account_id ||
    payload?.account_id ||
    secrets?.customer_integration_id ||
    secrets?.customer_integration ||
    secrets?.reportei_account_id ||
    secrets?.account_id ||
    null
  );
}

function pickProjectId(payload?: Record<string, any>, secrets?: Record<string, any>): string | null {
  return (
    payload?.project_id ||
    payload?.reportei_project_id ||
    secrets?.project_id ||
    secrets?.reportei_project_id ||
    null
  );
}

function pickAccountId(payload?: Record<string, any>, secrets?: Record<string, any>): string | null {
  return (
    payload?.reportei_account_id ||
    payload?.account_id ||
    payload?.id ||
    payload?.reportei_company_id ||
    secrets?.reportei_account_id ||
    secrets?.account_id ||
    secrets?.id ||
    secrets?.reportei_company_id ||
    null
  );
}

function pickBaseUrl(payload?: Record<string, any>, secrets?: Record<string, any>): string | null {
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

function pickToken(payload?: Record<string, any>, secrets?: Record<string, any>): string | null {
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

  const integrationId = pickIntegrationId(payload, secrets);
  const accountId = pickAccountId(payload, secrets);
  const projectId = pickProjectId(payload, secrets);
  const baseUrl = pickBaseUrl(payload, secrets);
  const token = pickToken(payload, secrets);

  // Multi-platform map stored as { instagram_business: 2655450, linkedin: 123456, ... }
  const platforms: Record<string, number> | undefined =
    payload?.platforms && typeof payload.platforms === 'object' && !Array.isArray(payload.platforms)
      ? payload.platforms
      : undefined;

  return {
    integrationId: integrationId ? String(integrationId) : undefined,
    accountId: accountId ? String(accountId) : undefined,
    projectId: projectId ? String(projectId) : undefined,
    baseUrl: baseUrl ? String(baseUrl) : undefined,
    token: token ? String(token) : undefined,
    platforms,
    rawPayload: payload,
  };
}
