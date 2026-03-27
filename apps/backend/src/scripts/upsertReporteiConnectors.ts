import { query } from '../db';

type ConnectorSeed = {
  clientName: string;
  reporteiAccountId: string;
  projectId: number;
  integrationId: number;
  platforms: Record<string, number>;
  dashboardUrl?: string;
  embedUrl?: string;
};

const SEEDS: ConnectorSeed[] = [
  {
    clientName: 'Banco BBC Digital',
    reporteiAccountId: '799054',
    projectId: 799054,
    integrationId: 2655450,
    platforms: {
      instagram_business: 2655450,
      facebook_ads: 2949851,
      google_adwords: 2477886,
      google_analytics_4: 2478037,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/2vaBhB0yAThNj9RZg2N3XwuudZgBedZr',
    embedUrl: 'https://app.reportei.com/embed/2vaBhB0yAThNj9RZg2N3XwuudZgBedZr',
  },
  {
    clientName: 'Ciclus Amazônia',
    reporteiAccountId: '633509',
    projectId: 633509,
    integrationId: 2655447,
    platforms: {
      instagram_business: 2655447,
      linkedin: 2936299,
      facebook_ads: 2770687,
      google_adwords: 3033865,
      google_analytics_4: 1972130,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/RvHkMhsK3P3od30JEAQ3LV7QFL1Kx4zR',
    embedUrl: 'https://app.reportei.com/embed/RvHkMhsK3P3od30JEAQ3LV7QFL1Kx4zR',
  },
  {
    clientName: 'Ciclus Ambiental (Holding)',
    reporteiAccountId: '830611',
    projectId: 830611,
    integrationId: 2933527,
    platforms: {
      linkedin: 2933527,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/pLlBkQG7nktf3hO2uLZwUQZDe4eWRojt',
    embedUrl: 'https://app.reportei.com/embed/pLlBkQG7nktf3hO2uLZwUQZDe4eWRojt',
  },
  {
    clientName: 'CS Grãos do Piauí',
    reporteiAccountId: '618502',
    projectId: 618502,
    integrationId: 2655446,
    platforms: {
      instagram_business: 2655446,
      linkedin: 2878274,
      google_analytics_4: 2878348,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/feycTCMgDBLJf2Z5npsGX40zIIINoUJa',
    embedUrl: 'https://app.reportei.com/embed/feycTCMgDBLJf2Z5npsGX40zIIINoUJa',
  },
  {
    clientName: 'CS Infra (Holding)',
    reporteiAccountId: '683609',
    projectId: 683609,
    integrationId: 2933530,
    platforms: {
      linkedin: 2933530,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/Gjoap7tXSUbNKmBEfNRSh8aEGc0aJKn2',
    embedUrl: 'https://app.reportei.com/embed/Gjoap7tXSUbNKmBEfNRSh8aEGc0aJKn2',
  },
  {
    clientName: 'CS Mobi Cuiabá',
    reporteiAccountId: '598678',
    projectId: 598678,
    integrationId: 1815197,
    platforms: {
      instagram_business: 1815197,
      facebook_ads: 1815199,
      google_adwords: 1815203,
      google_analytics_4: 1815201,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/ViXEqX85WennWh8i5YwUbOwoPof0dmei',
    embedUrl: 'https://app.reportei.com/embed/ViXEqX85WennWh8i5YwUbOwoPof0dmei',
  },
  {
    clientName: 'CS Mobi Leste SP',
    reporteiAccountId: '1060333',
    projectId: 1060333,
    integrationId: 3051750,
    platforms: {
      instagram_business: 3051750,
      linkedin: 3051765,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/IbPYyuKLE0JEdsVbMaV9ILi6OaiAqGx5',
    embedUrl: 'https://app.reportei.com/embed/IbPYyuKLE0JEdsVbMaV9ILi6OaiAqGx5',
  },
  {
    clientName: 'CS Portos',
    reporteiAccountId: '1010546',
    projectId: 1010546,
    integrationId: 2934732,
    platforms: {
      instagram_business: 2934732,
      linkedin: 2934739,
      google_analytics_4: 2934832,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/XtuXNn8dZYLbpiCq8USe62m3t7YrsO7h',
    embedUrl: 'https://app.reportei.com/embed/XtuXNn8dZYLbpiCq8USe62m3t7YrsO7h',
  },
  {
    clientName: 'CS Rodovias Mercosul',
    reporteiAccountId: '1157639',
    projectId: 1157639,
    integrationId: 3309121,
    platforms: {
      instagram_business: 3309121,
    },
    dashboardUrl: 'https://app.reportei.com/dashboard/AWtqj2m9spYRHRVZNtdyOvLUxgCuTdTs',
    embedUrl: 'https://app.reportei.com/embed/AWtqj2m9spYRHRVZNtdyOvLUxgCuTdTs',
  },
  {
    clientName: 'VIP Leilões',
    reporteiAccountId: '746553',
    projectId: 746553,
    integrationId: 2655449,
    platforms: {
      instagram_business: 2655449,
      linkedin: 2950335,
      facebook_ads: 2655443,
    },
  },
];

function buildPayload(seed: ConnectorSeed) {
  const payload: Record<string, any> = {
    reportei_account_id: seed.reporteiAccountId,
    project_id: seed.projectId,
    integration_id: seed.integrationId,
    platforms: seed.platforms,
  };
  if (seed.dashboardUrl) payload.dashboard_url = seed.dashboardUrl;
  if (seed.embedUrl) payload.embed_url = seed.embedUrl;
  return payload;
}

async function ensureConnectorsTable() {
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
  await query(`
    CREATE TABLE IF NOT EXISTS connectors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      client_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      secrets_enc TEXT NULL,
      secrets_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, client_id, provider)
    )
  `).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_connectors_lookup ON connectors (tenant_id, client_id, provider)`).catch(() => {});
  await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_ok BOOLEAN`).catch(() => {});
  await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ`).catch(() => {});
  await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error TEXT`).catch(() => {});
  await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ`).catch(() => {});
}

async function main() {
  const apply = process.argv.includes('--apply');
  const asJson = process.argv.includes('--json');

  await ensureConnectorsTable();

  const report: Array<Record<string, any>> = [];
  let failures = 0;

  for (const seed of SEEDS) {
    const { rows } = await query<any>(
      `SELECT id, tenant_id, name, reportei_account_id
       FROM clients
       WHERE reportei_account_id = $1 OR name = $2
       ORDER BY CASE WHEN reportei_account_id = $1 THEN 0 ELSE 1 END, name ASC`,
      [seed.reporteiAccountId, seed.clientName]
    );

    if (rows.length === 0) {
      failures++;
      report.push({
        client_name: seed.clientName,
        reportei_account_id: seed.reporteiAccountId,
        status: 'missing_client',
      });
      continue;
    }

    const client = rows[0];
    const payload = buildPayload(seed);

    if (apply) {
      await query(
        `INSERT INTO connectors (tenant_id, client_id, provider, payload)
         VALUES ($1, $2, 'reportei', $3::jsonb)
         ON CONFLICT (tenant_id, client_id, provider)
         DO UPDATE SET payload = COALESCE(connectors.payload, '{}'::jsonb) || EXCLUDED.payload, updated_at = now()`,
        [client.tenant_id, client.id, JSON.stringify(payload)]
      );

      await query(
        `UPDATE clients
         SET reportei_account_id = $2, updated_at = now()
         WHERE id = $1 AND COALESCE(reportei_account_id, '') <> $2`,
        [client.id, seed.reporteiAccountId]
      );
    }

    report.push({
      client_name: client.name,
      client_id: client.id,
      tenant_id: client.tenant_id,
      reportei_account_id: seed.reporteiAccountId,
      status: apply ? 'upserted' : 'ready',
      platforms: Object.keys(seed.platforms),
      integration_id: seed.integrationId,
      had_legacy_account_id: client.reportei_account_id ?? null,
      has_dashboard_url: !!seed.dashboardUrl,
      has_embed_url: !!seed.embedUrl,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ apply, total: SEEDS.length, failures, report }, null, 2));
  } else {
    console.log(`reportei connectors | mode=${apply ? 'apply' : 'dry-run'} | total=${SEEDS.length} | failures=${failures}`);
    for (const item of report) {
      console.log(
        [
          item.status,
          item.client_name,
          item.reportei_account_id,
          Array.isArray(item.platforms) ? item.platforms.join(',') : '',
        ].join(' | ')
      );
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[upsertReporteiConnectors] fatal:', err);
    process.exit(1);
  });
