type ReporteiPayload = Record<string, unknown> | null | undefined;

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function extractIframeSrc(value: string): string {
  if (!value.includes('<iframe')) return value;
  const match = value.match(/src="([^"]+)"/i);
  return match?.[1]?.trim() || value;
}

function hasPlatformMap(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0);
}

export function getReporteiDashboardUrl(payload: ReporteiPayload): string {
  const data = payload || {};
  const explicitUrl = firstString(
    data.reportei_dashboard_url,
    data.dashboard_url,
    data.reporteiDashboardUrl,
    data.dashboardUrl,
  );
  if (explicitUrl) return explicitUrl;

  const companyId = firstString(
    data.reportei_company_id,
    data.company_id,
    data.reporteiCompanyId,
    data.companyId,
  );
  return companyId ? `https://app.reportei.com/company/${companyId}` : '';
}

export function getReporteiEmbedUrl(payload: ReporteiPayload): string {
  const data = payload || {};
  const explicit = firstString(
    data.reportei_embed_url,
    data.embed_url,
    data.reporteiEmbedUrl,
    data.embedUrl,
  );
  if (explicit) return extractIframeSrc(explicit);
  return getReporteiDashboardUrl(data);
}

export function isReporteiConfigured(payload: ReporteiPayload): boolean {
  const data = payload || {};
  return Boolean(
    getReporteiDashboardUrl(data) ||
      firstString(
        data.reportei_account_id,
        data.account_id,
        data.id,
        data.reportei_project_id,
        data.project_id,
        data.reportei_integration_id,
        data.integration_id,
      ) ||
      hasPlatformMap(data.platforms)
  );
}
