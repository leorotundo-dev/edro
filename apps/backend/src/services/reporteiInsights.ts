import type { ClientProfile, Platform } from '../types';
import { query } from '../db';
import { ReporteiPerformanceProvider } from '../providers/reportei/reporteiPerformanceProvider';

const DEFAULT_PLATFORMS: Platform[] = ['Instagram', 'MetaAds', 'LinkedIn'];
const DEFAULT_WINDOWS = ['30d'];

const PLATFORM_ALIASES: Record<string, Platform> = {
  instagram: 'Instagram',
  ig: 'Instagram',
  linkedin: 'LinkedIn',
  metaads: 'MetaAds',
  meta: 'MetaAds',
  facebookads: 'MetaAds',
  googleads: 'GoogleAds',
  google: 'GoogleAds',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  twitter: 'X',
  pinterest: 'Pinterest',
  emailmarketing: 'EmailMarketing',
};

function normalizePlatform(input: string | Platform): Platform | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (PLATFORM_ALIASES[normalized]) return PLATFORM_ALIASES[normalized];

  const known = DEFAULT_PLATFORMS.concat([
    'TikTok',
    'YouTube',
    'X',
    'Pinterest',
    'GoogleAds',
    'EmailMarketing',
  ] as Platform[]);
  const match = known.find((item) => item.toLowerCase() === raw.toLowerCase());
  return match || null;
}

function parseList(input?: string | Array<string | Platform>): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item)).filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolvePlatforms(input?: string | Array<string | Platform>): Platform[] {
  const list = parseList(input);
  const normalized = list.map(normalizePlatform).filter(Boolean) as Platform[];
  return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_PLATFORMS;
}

function resolveWindows(input?: string | string[]): string[] {
  const list = parseList(input);
  return list.length ? Array.from(new Set(list)) : DEFAULT_WINDOWS;
}

export async function syncReporteiInsightsForClient(
  client: ClientProfile,
  options: {
    tenantId?: string | null;
    platforms?: Array<string | Platform>;
    windows?: string[];
  } = {}
) {
  const provider = new ReporteiPerformanceProvider();
  const platforms = resolvePlatforms(options.platforms || process.env.REPORTEI_PLATFORMS);
  const windows = resolveWindows(options.windows || process.env.REPORTEI_WINDOWS);
  let inserted = 0;
  let failures = 0;

  for (const platform of platforms) {
    for (const window of windows) {
      try {
        const perf = await provider.getPerformance({
          client,
          platform,
          window,
        });

        await query(
          `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
           VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [client.tenant_id ?? options.tenantId ?? null, client.id, platform, window, JSON.stringify(perf)]
        );
        inserted += 1;
      } catch {
        failures += 1;
      }
    }
  }

  return {
    platforms,
    windows,
    inserted,
    failures,
  };
}
