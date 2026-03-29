import { query } from '../db';
import { getClientById } from '../repos/clientsRepo';
import { listClientDocuments, getLatestClientInsight } from '../repos/clientIntelligenceRepo';
import { loadBehaviorProfiles } from './behaviorClusteringService';
import { loadLearningRules } from './learningEngine';

/**
 * Resolve clients.id (TEXT like "banco-bbc-digital") → edro_clients.id (UUID).
 * Two client tables coexist: `clients` (TEXT id, multitenant) and `edro_clients` (UUID, legacy briefing system).
 */
export async function resolveEdroClientId(clientId: string): Promise<string | null> {
  try {
    const { rows } = await query(
      `SELECT ec.id FROM edro_clients ec
       JOIN clients c ON LOWER(ec.name) = LOWER(c.name)
       WHERE c.id = $1 LIMIT 1`,
      [clientId],
    );
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function buildClientContext(tenantId: string, clientId: string): Promise<string> {
  const client = await getClientById(tenantId, clientId);
  if (!client) return '';

  const profile = client.profile || {};
  const knowledge = profile.knowledge_base || {};

  const parts: string[] = [];
  parts.push(`Client: ${client.name}`);
  if (client.segment_primary) parts.push(`Segment: ${client.segment_primary}`);
  if (knowledge.description) parts.push(`Description: ${knowledge.description}`);
  if (knowledge.audience) parts.push(`Target Audience: ${knowledge.audience}`);
  if (knowledge.brand_promise) parts.push(`Brand Promise: ${knowledge.brand_promise}`);
  if (knowledge.keywords?.length) parts.push(`Keywords: ${knowledge.keywords.join(', ')}`);
  if (knowledge.pillars?.length) parts.push(`Content Pillars: ${knowledge.pillars.join(', ')}`);

  try {
    const [docs, insight] = await Promise.all([
      listClientDocuments({ tenantId, clientId, limit: 15 }),
      getLatestClientInsight({ tenantId, clientId }),
    ]);

    if (insight?.summary) {
      const s = insight.summary;
      if (s.summary_text) parts.push(`\nINTELIGENCIA DO CLIENTE:\n${s.summary_text}`);
      if (s.positioning) parts.push(`Posicionamento: ${s.positioning}`);
      if (s.tone) parts.push(`Tom de voz: ${s.tone}`);
      if (s.industry) parts.push(`Industria: ${s.industry}`);
    }

    if (docs.length > 0) {
      const socialPosts = docs.filter((d) => d.source_type === 'social').slice(0, 8);
      const webPages = docs.filter((d) => d.source_type !== 'social').slice(0, 5);

      if (socialPosts.length > 0) {
        parts.push(`\nCONTEUDO RECENTE DO CLIENTE (${socialPosts.length} posts):`);
        socialPosts.forEach((d) => {
          const date = d.published_at ? new Date(d.published_at).toLocaleDateString('pt-BR') : '';
          const excerpt = (d.content_excerpt || d.content_text || '').slice(0, 150);
          parts.push(`- [${d.platform || ''}] ${date}: ${excerpt}`);
        });
      }

      if (webPages.length > 0) {
        parts.push(`\nPAGINAS DO SITE DO CLIENTE (${webPages.length}):`);
        webPages.forEach((d) => {
          const excerpt = (d.content_excerpt || d.content_text || '').slice(0, 120);
          parts.push(`- ${d.title || d.url || ''}: ${excerpt}`);
        });
      }
    }
  } catch {
    // best effort only
  }

  return parts.join('\n');
}

export async function loadPerformanceContext(clientId: string): Promise<string> {
  try {
    const { rows } = await query<any>(
      `SELECT platform, metrics, synced_at
       FROM reportei_metric_snapshots
       WHERE client_id = $1 AND time_window = '30d'
         AND synced_at > NOW() - INTERVAL '14 days'
       ORDER BY platform, synced_at DESC`,
      [clientId],
    );

    if (!rows.length) return '';

    const byPlatform: Record<string, { metrics: Record<string, any>; synced_at: string }> = {};
    for (const row of rows) {
      if (!byPlatform[row.platform]) byPlatform[row.platform] = row;
    }

    const METRIC_LABELS: Record<string, string> = {
      'ig:impressions': 'impressões',
      'ig:reach': 'alcance',
      'ig:engagement_rate': 'engajamento',
      'ig:followers_gained': 'novos seguidores',
      'li:impressions': 'impressões LinkedIn',
      'li:engagement_rate': 'engajamento LinkedIn',
      'ma:roas': 'ROAS',
      'ma:ctr': 'CTR',
      'ga:sessions': 'sessões site',
      'ga:new_users': 'novos usuários',
    };

    const parts: string[] = ['\nPERFORMANCE REAL — ÚLTIMOS 30 DIAS (dados Reportei):'];

    for (const [platform, data] of Object.entries(byPlatform)) {
      const notable: string[] = [];
      for (const [k, v] of Object.entries(data.metrics as Record<string, any>)) {
        if (!(k in METRIC_LABELS)) continue;
        if (v.value == null) continue;
        const label = METRIC_LABELS[k];
        const valStr = v.value >= 1000 ? `${(v.value / 1000).toFixed(1)}K` : String(v.value);
        const delta = v.delta_pct != null ? ` (${v.delta_pct > 0 ? '+' : ''}${v.delta_pct.toFixed(1)}% vs anterior)` : '';
        notable.push(`${label}: ${valStr}${delta}`);
      }
      if (notable.length) parts.push(`  ${platform}: ${notable.slice(0, 5).join(' | ')}`);
    }

    parts.push('  → Use esses dados ao sugerir estratégias, formatos e frequência de publicação.');
    return parts.join('\n');
  } catch {
    return '';
  }
}

export async function loadPsychContext(tenantId: string, clientId: string): Promise<string> {
  try {
    const [clusters, rules] = await Promise.all([
      loadBehaviorProfiles(tenantId, clientId),
      loadLearningRules(tenantId, clientId),
    ]);

    const parts: string[] = [];

    if (clusters.length > 0) {
      parts.push('\nPERFIS COMPORTAMENTAIS REAIS DA AUDIÊNCIA:');
      clusters.forEach((c) => {
        const triggers = c.preferred_triggers?.join(', ') || '—';
        const conf = c.confidence_score ? ` [confiança ${Math.round(c.confidence_score * 100)}%]` : '';
        parts.push(`  - ${c.cluster_label}: formato "${c.preferred_format || '—'}", AMD "${c.preferred_amd || '—'}", gatilhos [${triggers}], save_rate ${(c.avg_save_rate * 100).toFixed(2)}%${conf}`);
      });
      parts.push('  → Use esses perfis ao recomendar AMDs, gatilhos e formatos.');
    }

    if (rules.length > 0) {
      const top = rules.slice(0, 6);
      parts.push('\nREGRAS DE APRENDIZADO VALIDADAS (dados reais desta audiência):');
      top.forEach((r) => {
        const conf = r.confidence_score ? ` [confiança ${Math.round(r.confidence_score * 100)}%]` : '';
        parts.push(`  - ${r.effective_pattern} [uplift +${r.uplift_value.toFixed(1)}% em ${r.uplift_metric}${conf}]`);
      });
      parts.push('  → Priorize AMDs e gatilhos com uplift comprovado.');
    }

    return parts.join('\n');
  } catch {
    return '';
  }
}
