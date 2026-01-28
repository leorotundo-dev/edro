import type { LiveBoostEngine, LiveBoost } from './contracts';
import { query } from '../db';

export class LiveBoostEngineDb implements LiveBoostEngine {
  name = 'live_boost_engine_db';

  async health() {
    return { ok: true };
  }

  async computeBoosts(params: any): Promise<LiveBoost[]> {
    const boosts: LiveBoost[] = [];

    const tenantId = params.client?.tenant_id ?? null;
    const { rows } = await query<any>(
      `SELECT payload FROM learned_insights
       WHERE tenant_id=$1 AND client_id=$2 AND platform=$3
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, params.client.id, params.platform]
    );

    const perf = rows[0]?.payload;

    if (perf?.by_tag?.length) {
      const tags = new Set(params.event.tags.map((tag: string) => tag.toLowerCase()));
      const hit = perf.by_tag.find(
        (item: any) => tags.has(String(item.tag).toLowerCase()) && Number(item.score) >= 70
      );
      if (hit) {
        boosts.push({
          kind: 'performance',
          boost: 10,
          reason: `Tag performando bem: ${hit.tag}`,
          tags_affected: [hit.tag],
          confidence: 0.7,
        });
      }
    }

    if (perf?.by_format?.length) {
      const top = [...perf.by_format].sort((a: any, b: any) => Number(b.score) - Number(a.score))[0];
      if (top && Number(top.score) >= 75) {
        boosts.push({
          kind: 'performance',
          boost: 6,
          reason: `Formato campeao no periodo: ${top.format}`,
          formats_affected: [top.format],
          confidence: 0.7,
        });
      }
    }

    if (params.trendAggregate?.normalized_topics?.length && params.client.trend_profile?.enable_trends) {
      const tags = new Set(params.event.tags.map((tag: string) => tag.toLowerCase()));
      const hit = params.trendAggregate.normalized_topics.find(
        (item: any) => tags.has(String(item.topic).toLowerCase()) && Number(item.score) >= 60
      );
      if (hit) {
        boosts.push({
          kind: 'trend',
          boost: 8,
          reason: `Trend compativel: ${hit.topic}`,
          tags_affected: [hit.topic],
          confidence: Number(hit.confidence ?? 0.6),
        });
      }
    }

    return boosts;
  }
}
