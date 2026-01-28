import { runMonthlyFlow } from '../flow/monthlyFlow';
import { RETAIL_BR_EVENTS } from '../services/calendarTotal';
import type { ClientProfile, Objective, Platform, YearMonth } from '../types';
import { createMonthlyCalendar, createFlowRun, findMonthlyCalendar, listClientProfilesForTenant } from '../repos/calendarRepo';
import { createPostAssetsFromCalendar } from '../repos/governanceRepo';
import { isEnabled } from '../flags/flags';

function nextYearMonth(from: Date, offset = 1): YearMonth {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + 1 + offset;
  const nextYear = year + Math.floor((month - 1) / 12);
  const nextMonth = ((month - 1) % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}` as YearMonth;
}

function buildProfile(row: any): ClientProfile {
  const profile = row.profile || {};
  const base: ClientProfile = {
    id: row.id,
    name: row.name,
    tenant_id: row.tenant_id ?? undefined,
    country: row.country || 'BR',
    uf: row.uf || undefined,
    city: row.city || undefined,
    segment_primary: (row.segment_primary || 'varejo_supermercado') as any,
    segment_secondary: Array.isArray(profile.segment_secondary) ? profile.segment_secondary : [],
    tone_profile: (profile.tone_profile || 'balanced') as any,
    risk_tolerance: (profile.risk_tolerance || 'medium') as any,
    calendar_profile: profile.calendar_profile || {
      enable_calendar_total: true,
      calendar_weight: 60,
      retail_mode: true,
      allow_cultural_opportunities: true,
      allow_geek_pop: true,
      allow_profession_days: true,
      restrict_sensitive_causes: false,
    },
    trend_profile: profile.trend_profile || {
      enable_trends: false,
      trend_weight: 40,
      sources: [],
    },
    platform_preferences: profile.platform_preferences || undefined,
  };

  return { ...base, ...profile, tenant_id: row.tenant_id ?? profile.tenant_id };
}

function resolveAutopilotSettings(profile: any) {
  const autopilot = profile.autopilot || {};
  return {
    platform: (autopilot.platform || 'Instagram') as Platform,
    objective: (autopilot.objective || 'engagement') as Objective,
    postsPerWeek: Number(autopilot.postsPerWeek || 4),
  };
}

export async function runAutopilotJob(params: { tenantId: string; month?: string }) {
  const enabled = await isEnabled(params.tenantId, 'autopilot_calendar');
  if (!enabled) return { ok: true, skipped: 'flag_disabled' };

  const month = (params.month as YearMonth) || nextYearMonth(new Date());
  const clients = await listClientProfilesForTenant(params.tenantId);

  for (const row of clients) {
    const client = buildProfile(row);
    const { platform, objective, postsPerWeek } = resolveAutopilotSettings(client);

    const exists = await findMonthlyCalendar({
      tenantId: params.tenantId,
      clientId: client.id,
      month,
      platform,
    });
    if (exists) continue;

    const result = await runMonthlyFlow(RETAIL_BR_EVENTS, {
      month,
      platform,
      objective,
      postsPerWeek,
      client,
      toggles: {
        use_calendar_total: true,
        use_local_events: true,
        use_trends: client.trend_profile.enable_trends,
        use_performance: true,
        use_client_knowledge: true,
      },
    });

    const calendarId = await createMonthlyCalendar({
      tenantId: params.tenantId,
      client,
      month: result.month,
      platform: result.platform,
      objective: result.objective,
      posts: result.posts,
      payload: result,
    });

    await createFlowRun({
      tenantId: params.tenantId,
      client,
      month: result.month,
      platform: result.platform,
      objective: result.objective,
      payload: result,
    });

    await createPostAssetsFromCalendar(calendarId, result.posts, {
      tenantId: params.tenantId,
      status: 'review',
    });
  }

  return { ok: true, month };
}
