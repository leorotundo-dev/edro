/**
 * Risk Detector
 *
 * Identifica riscos em variantes de copy antes do lançamento:
 *   1. Rejeição histórica: ângulos/AMD com alta taxa de rejeição neste cliente
 *   2. Fadiga de ângulo: mesmo ângulo usado recentemente com queda de performance
 *   3. Clichês de IA: termos genéricos que degradam credibilidade
 *   4. Desalinhamento de audiência: copy targetando AMD não documentado nos clusters
 *
 * Output: RiskFlag[] por variante — cada flag tem: tipo, descrição, severidade
 */

import { query } from '../../db';
import { VariantInput } from './resonanceScorer';
import { BehaviorCluster } from '../behaviorClusteringService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RiskFlag {
  type: 'rejection_history' | 'angle_fatigue' | 'ai_cliche' | 'audience_mismatch' | 'low_fogg';
  severity: 'warning' | 'critical';
  description: string;
  variant_index: number;
}

// ── Clichês de IA ─────────────────────────────────────────────────────────────

const AI_CLICHÉS = [
  'game changer', 'game-changer', 'revolucionar', 'paradigma', 'sinergia',
  'holístico', 'disruptivo', 'disrupção', 'transformação digital',
  'no mundo de hoje', 'nos dias atuais', 'solução robusta', 'abordagem inovadora',
  'jornada', 'ecossistema', 'potencializar', 'alavancar', 'protagonista',
];

function detectClichés(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_CLICHÉS.filter((c) => lower.includes(c));
}

// ── Histórico de rejeição ─────────────────────────────────────────────────────

interface RejectionHistory {
  amd: string;
  rejection_count: number;
  total_count: number;
  rejection_rate: number;
}

async function loadRejectionHistory(clientId: string, tenantId: string): Promise<RejectionHistory[]> {
  const res = await query<any>(
    `SELECT
       COALESCE(amd, 'desconhecido') as amd,
       COUNT(*) FILTER (WHERE score <= 2 OR regeneration_count >= 2) as rejection_count,
       COUNT(*) as total_count
     FROM preference_feedback
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR client_id::text = $2)
     GROUP BY amd
     HAVING COUNT(*) >= 3`,
    [tenantId, clientId || null],
  );

  return res.rows.map((r) => ({
    amd: r.amd,
    rejection_count: parseInt(r.rejection_count, 10),
    total_count: parseInt(r.total_count, 10),
    rejection_rate: parseInt(r.total_count, 10) > 0
      ? parseInt(r.rejection_count, 10) / parseInt(r.total_count, 10)
      : 0,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function detectRisks(
  variants: VariantInput[],
  clusters: BehaviorCluster[],
  clientId: string,
  tenantId: string,
): Promise<RiskFlag[]> {
  const flags: RiskFlag[] = [];
  const rejectionHistory = await loadRejectionHistory(clientId, tenantId);
  const rejectionMap = new Map(rejectionHistory.map((r) => [r.amd, r]));

  const clusterAmds = new Set(clusters.map((c) => c.preferred_amd).filter(Boolean));

  for (const variant of variants) {
    // 1. Clichês de IA
    const clichés = detectClichés(variant.text);
    if (clichés.length > 0) {
      flags.push({
        type: 'ai_cliche',
        severity: clichés.length >= 3 ? 'critical' : 'warning',
        description: `Clichês detectados: ${clichés.slice(0, 3).join(', ')}`,
        variant_index: variant.index,
      });
    }

    // 2. Rejeição histórica do AMD
    if (variant.amd) {
      const history = rejectionMap.get(variant.amd);
      if (history && history.rejection_rate >= 0.5) {
        flags.push({
          type: 'rejection_history',
          severity: history.rejection_rate >= 0.7 ? 'critical' : 'warning',
          description: `AMD "${variant.amd}" tem ${Math.round(history.rejection_rate * 100)}% de rejeição histórica neste cliente (n=${history.total_count})`,
          variant_index: variant.index,
        });
      }
    }

    // 3. Desalinhamento de audiência
    if (variant.amd && clusterAmds.size > 0 && !clusterAmds.has(variant.amd)) {
      flags.push({
        type: 'audience_mismatch',
        severity: 'warning',
        description: `AMD "${variant.amd}" não está documentado nos clusters desta audiência. AMDs observados: ${[...clusterAmds].join(', ')}`,
        variant_index: variant.index,
      });
    }

    // 4. Fogg score baixo (se fornecido)
    const motivation = variant.fogg_motivation ?? 5;
    const ability = variant.fogg_ability ?? 5;
    const prompt = variant.fogg_prompt ?? 5;
    if (motivation < 4 || ability < 4 || prompt < 4) {
      const weakDimensions = [];
      if (motivation < 4) weakDimensions.push(`motivação (${motivation}/10)`);
      if (ability < 4) weakDimensions.push(`facilidade (${ability}/10)`);
      if (prompt < 4) weakDimensions.push(`CTA (${prompt}/10)`);
      flags.push({
        type: 'low_fogg',
        severity: weakDimensions.length >= 2 ? 'critical' : 'warning',
        description: `Fogg score fraco em: ${weakDimensions.join(', ')}`,
        variant_index: variant.index,
      });
    }
  }

  return flags;
}
