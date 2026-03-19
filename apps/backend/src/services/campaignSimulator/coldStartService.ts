/**
 * Cold Start Service
 *
 * Clientes novos (< 5 campanhas) sem behavior clusters suficientes
 * se beneficiam de padrões de clientes similares do mesmo segmento.
 *
 * Lógica:
 *   1. Detecta se o cliente tem dados insuficientes (cluster sample_size < 5 ou clusters = 0)
 *   2. Encontra clientes "peer" do mesmo tenant com sample_size >= 10
 *   3. Mistura: 30% peer clusters + 70% benchmarks globais por AMD × plataforma
 *   4. Retorna clusters sintéticos marcados como source: 'cold_start'
 */

import { query } from '../../db';
import { BehaviorCluster } from '../behaviorClusteringService';

// ── Benchmarks globais de base rate por cluster type ──────────────────────────
// Derivados de médias de mercado B2B/B2C no Brasil para redes sociais

const GLOBAL_BENCHMARKS: Record<BehaviorCluster['cluster_type'], Partial<BehaviorCluster>> = {
  salvadores: {
    cluster_label: 'Salvadores (benchmark)',
    avg_save_rate: 0.025,
    avg_click_rate: 0.012,
    avg_like_rate: 0.04,
    avg_engagement_rate: 0.055,
    preferred_amd: 'salvar',
    preferred_triggers: ['especificidade', 'autoridade', 'prova_social'],
    sample_size: 0,
    confidence_score: 0.3,
    top_formats: [],
  },
  clicadores: {
    cluster_label: 'Clicadores (benchmark)',
    avg_save_rate: 0.008,
    avg_click_rate: 0.032,
    avg_like_rate: 0.03,
    avg_engagement_rate: 0.06,
    preferred_amd: 'clicar',
    preferred_triggers: ['urgência', 'exclusividade', 'curiosidade'],
    sample_size: 0,
    confidence_score: 0.3,
    top_formats: [],
  },
  leitores_silenciosos: {
    cluster_label: 'Leitores Silenciosos (benchmark)',
    avg_save_rate: 0.015,
    avg_click_rate: 0.008,
    avg_like_rate: 0.02,
    avg_engagement_rate: 0.03,
    preferred_amd: 'salvar',
    preferred_triggers: ['especificidade', 'autoridade'],
    sample_size: 0,
    confidence_score: 0.25,
    top_formats: [],
  },
  convertidos: {
    cluster_label: 'Convertidos (benchmark)',
    avg_save_rate: 0.01,
    avg_click_rate: 0.045,
    avg_like_rate: 0.025,
    avg_engagement_rate: 0.08,
    preferred_amd: 'pedir_proposta',
    preferred_triggers: ['prova_social', 'urgência', 'reciprocidade'],
    sample_size: 0,
    confidence_score: 0.3,
    top_formats: [],
  },
};

const CLUSTER_TYPES: BehaviorCluster['cluster_type'][] = [
  'salvadores', 'clicadores', 'leitores_silenciosos', 'convertidos',
];

export function buildGlobalBenchmarkClusters(): BehaviorCluster[] {
  return CLUSTER_TYPES.map((type) => ({
    cluster_type: type,
    preferred_format: null,
    ...GLOBAL_BENCHMARKS[type],
  } as BehaviorCluster));
}

export interface ColdStartResult {
  clusters: BehaviorCluster[];
  source: 'real' | 'cold_start';
  peer_count: number;
  message?: string;
}

// ── Detect insufficient data ──────────────────────────────────────────────────

export function isInsufficientData(clusters: BehaviorCluster[]): boolean {
  if (clusters.length === 0) return true;
  const totalSamples = clusters.reduce((s, c) => s + c.sample_size, 0);
  return totalSamples < 5;
}

// ── Load peer clusters ────────────────────────────────────────────────────────

async function loadPeerClusters(
  clientId: string,
  tenantId: string,
): Promise<BehaviorCluster[]> {
  // Find peers: same tenant, different client, with good data
  const res = await query<any>(
    `SELECT cluster_type, cluster_label, avg_save_rate, avg_click_rate,
            avg_like_rate, avg_engagement_rate, preferred_format, preferred_amd,
            preferred_triggers, sample_size, confidence_score, top_formats
     FROM client_behavior_profiles
     WHERE tenant_id = $1
       AND client_id != $2
       AND sample_size >= 10
       AND confidence_score >= 0.5
     ORDER BY sample_size DESC
     LIMIT 20`,
    [tenantId, clientId],
  );
  return res.rows.map((r) => ({
    ...r,
    preferred_triggers: r.preferred_triggers ?? [],
    top_formats: r.top_formats ?? [],
  }));
}

// ── Merge peer + benchmark clusters ──────────────────────────────────────────

function buildColdStartClusters(
  peerClusters: BehaviorCluster[],
): BehaviorCluster[] {
  return CLUSTER_TYPES.map((type) => {
    const peers = peerClusters.filter((c) => c.cluster_type === type);
    const benchmark = GLOBAL_BENCHMARKS[type]!;

    if (peers.length === 0) {
      // Pure benchmark
      return {
        cluster_type: type,
        preferred_format: null,
        ...benchmark,
      } as BehaviorCluster;
    }

    // Weighted average: 30% peer group, 70% benchmark
    const peerWeight = 0.30;
    const benchmarkWeight = 0.70;

    const avgSave = peers.reduce((s, c) => s + c.avg_save_rate, 0) / peers.length;
    const avgClick = peers.reduce((s, c) => s + c.avg_click_rate, 0) / peers.length;
    const avgLike = peers.reduce((s, c) => s + c.avg_like_rate, 0) / peers.length;
    const avgEng = peers.reduce((s, c) => s + c.avg_engagement_rate, 0) / peers.length;

    // Collect most common preferred_amd from peers
    const amdFreq: Record<string, number> = {};
    for (const p of peers) {
      if (p.preferred_amd) amdFreq[p.preferred_amd] = (amdFreq[p.preferred_amd] ?? 0) + 1;
    }
    const topAmd = Object.entries(amdFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
      ?? benchmark.preferred_amd ?? null;

    // Collect top triggers from peers
    const triggerFreq: Record<string, number> = {};
    for (const p of peers) {
      for (const t of p.preferred_triggers ?? []) {
        triggerFreq[t] = (triggerFreq[t] ?? 0) + 1;
      }
    }
    const topTriggers = Object.entries(triggerFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t]) => t);

    return {
      cluster_type: type,
      cluster_label: `${type.charAt(0).toUpperCase() + type.slice(1)} (peer+benchmark)`,
      avg_save_rate: avgSave * peerWeight + (benchmark.avg_save_rate ?? 0) * benchmarkWeight,
      avg_click_rate: avgClick * peerWeight + (benchmark.avg_click_rate ?? 0) * benchmarkWeight,
      avg_like_rate: avgLike * peerWeight + (benchmark.avg_like_rate ?? 0) * benchmarkWeight,
      avg_engagement_rate: avgEng * peerWeight + (benchmark.avg_engagement_rate ?? 0) * benchmarkWeight,
      preferred_amd: topAmd,
      preferred_triggers: topTriggers.length > 0 ? topTriggers : (benchmark.preferred_triggers ?? []),
      preferred_format: null,
      sample_size: 0, // synthetic
      confidence_score: 0.35, // always lower than real data
      top_formats: [],
    } as BehaviorCluster;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retorna clusters para simulação, com cold start se necessário.
 * Sempre retorna 4 clusters — sintéticos se dados insuficientes.
 */
export async function getSimulationClusters(
  clientId: string,
  tenantId: string,
  realClusters: BehaviorCluster[],
): Promise<ColdStartResult> {
  if (!isInsufficientData(realClusters)) {
    return { clusters: realClusters, source: 'real', peer_count: 0 };
  }

  // Load peer clusters
  const peers = await loadPeerClusters(clientId, tenantId);
  const syntheticClusters = buildColdStartClusters(peers);

  return {
    clusters: syntheticClusters,
    source: 'cold_start',
    peer_count: new Set(peers.map((p) => (p as any).client_id)).size,
    message: `Dados insuficientes — usando benchmarks do segmento${peers.length > 0 ? ` + padrões de ${Math.min(peers.length, 5)} clientes similares` : ''}. Precisão aumenta após 5+ campanhas publicadas.`,
  };
}
