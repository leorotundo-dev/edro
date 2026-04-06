/**
 * Jarvis KB Service — Memória Persistente do JARVIS
 *
 * Responsabilidades:
 * 1. synthesizeClientKb()  — lê learning_rules + inteligência do cliente → escreve jarvis_kb_entries
 * 2. promoteToAgencyKb()   — padrões confirmados em 3+ clientes → jarvis_agency_kb_entries
 * 3. buildKbContext()      — monta bloco de KB (cliente + agência) para injetar nos prompts do JARVIS
 *
 * Fluxo de atualização:
 *   reporteiSyncWorker → jarvisKbWorker → synthesizeClientKb → promoteToAgencyKb
 */

import { query } from '../db';
import { loadLearningRules, type LearningRule } from './learningEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KbEntry {
  topic: string;
  category: string;
  content: string;
  evidence_level: 'hypothesis' | 'one_case' | 'pattern' | 'rule';
  uplift_metric?: string;
  uplift_value?: number;
  confidence?: number;
  sample_size?: number;
  source: string;
  source_data?: Record<string, any>;
}

export interface KbContext {
  client_patterns: KbEntry[];
  agency_patterns: KbEntry[];
  summary: string; // bloco de texto pronto para injetar no prompt
}

// ── Evidence level ────────────────────────────────────────────────────────────

function evidenceFromSampleAndConfidence(
  sampleSize: number,
  confidence: number
): KbEntry['evidence_level'] {
  if (sampleSize >= 3 && confidence >= 0.7) return 'rule';
  if (sampleSize >= 3) return 'pattern';
  if (sampleSize >= 1 && confidence >= 0.5) return 'one_case';
  return 'hypothesis';
}

// ── Synthesize: learning_rules → jarvis_kb_entries ───────────────────────────

export async function synthesizeClientKb(
  tenantId: string,
  clientId: string
): Promise<number> {
  const rules = await loadLearningRules(tenantId, clientId);
  if (!rules.length) return 0;

  let upserted = 0;

  for (const rule of rules) {
    const entry = ruleToKbEntry(rule);
    await upsertKbEntry(tenantId, clientId, entry);
    upserted++;
  }

  return upserted;
}

function ruleToKbEntry(rule: LearningRule): KbEntry {
  const seg = rule.segment_definition as Record<string, string>;
  const category = seg.type ?? 'generic'; // trigger | platform | amd
  const topic = `${category}:${seg.value ?? rule.rule_name}:${rule.uplift_metric}`;

  const metricLabel: Record<string, string> = {
    save_rate: 'taxa de salvamento',
    click_rate: 'taxa de clique',
    eng_rate: 'taxa de engajamento',
    conversion_rate: 'taxa de conversão',
    like_rate: 'taxa de curtida',
  };

  const label = metricLabel[rule.uplift_metric] ?? rule.uplift_metric;
  const evidence = evidenceFromSampleAndConfidence(rule.sample_size, rule.confidence_score);

  const content = buildRuleContent(category, seg.value, rule, label, evidence);

  return {
    topic,
    category,
    content,
    evidence_level: evidence,
    uplift_metric: rule.uplift_metric,
    uplift_value: rule.uplift_value,
    confidence: rule.confidence_score,
    sample_size: rule.sample_size,
    source: 'learning_rules',
    source_data: { rule_name: rule.rule_name, segment_definition: rule.segment_definition },
  };
}

function buildRuleContent(
  category: string,
  value: string | undefined,
  rule: LearningRule,
  metricLabel: string,
  evidence: string
): string {
  const uplift = `+${rule.uplift_value.toFixed(1)}%`;
  const conf = `${(rule.confidence_score * 100).toFixed(0)}% de confiança`;
  const sample = `${rule.sample_size} amostras`;
  const evidenceLabel = { hypothesis: '[hipótese]', one_case: '[1 caso]', pattern: '[padrão]', rule: '[regra]' }[evidence] ?? '[hipótese]';

  if (category === 'trigger') {
    return `${evidenceLabel} Gatilho "${value}" produz ${uplift} em ${metricLabel} (${conf}, ${sample}). ${rule.effective_pattern}`;
  }
  if (category === 'platform') {
    return `${evidenceLabel} Plataforma "${value}" produz ${uplift} em ${metricLabel} (${conf}, ${sample}). ${rule.effective_pattern}`;
  }
  if (category === 'amd') {
    return `${evidenceLabel} AMD "${value}" produz ${uplift} em ${metricLabel} (${conf}, ${sample}). ${rule.effective_pattern}`;
  }
  return `${evidenceLabel} ${rule.effective_pattern} (${conf}, ${sample})`;
}

// ── Upsert KB entry ───────────────────────────────────────────────────────────

async function upsertKbEntry(
  tenantId: string,
  clientId: string,
  entry: KbEntry
): Promise<void> {
  await query(
    `INSERT INTO jarvis_kb_entries
       (tenant_id, client_id, topic, category, content, evidence_level,
        uplift_metric, uplift_value, confidence, sample_size, source, source_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     ON CONFLICT (tenant_id, client_id, topic)
     DO UPDATE SET
       content        = EXCLUDED.content,
       evidence_level = EXCLUDED.evidence_level,
       uplift_metric  = EXCLUDED.uplift_metric,
       uplift_value   = EXCLUDED.uplift_value,
       confidence     = EXCLUDED.confidence,
       sample_size    = EXCLUDED.sample_size,
       source_data    = EXCLUDED.source_data,
       updated_at     = now()`,
    [
      tenantId, clientId,
      entry.topic, entry.category, entry.content, entry.evidence_level,
      entry.uplift_metric ?? null, entry.uplift_value ?? null,
      entry.confidence ?? null, entry.sample_size ?? null,
      entry.source, JSON.stringify(entry.source_data ?? {}),
    ]
  );
}

// ── Promote to Agency KB ──────────────────────────────────────────────────────
// Padrões que aparecem em 3+ clientes com evidence >= 'one_case' → agency KB

export async function promoteToAgencyKb(tenantId: string): Promise<number> {
  // Aggregate: group by topic, count distinct clients
  const { rows } = await query(
    `SELECT
       topic,
       category,
       COUNT(DISTINCT client_id)::int          AS client_count,
       ARRAY_AGG(DISTINCT client_id::text)     AS client_ids,
       AVG(uplift_value)                       AS avg_uplift,
       AVG(confidence)                         AS avg_confidence,
       MAX(sample_size)                        AS max_sample
     FROM jarvis_kb_entries
     WHERE tenant_id = $1
       AND evidence_level IN ('one_case','pattern','rule')
       AND uplift_value IS NOT NULL
     GROUP BY topic, category
     HAVING COUNT(DISTINCT client_id) >= 3`,
    [tenantId]
  );

  if (!rows.length) return 0;

  let promoted = 0;

  for (const row of rows) {
    const evidence: 'pattern' | 'rule' =
      Number(row.avg_confidence) >= 0.7 && Number(row.max_sample) >= 5 ? 'rule' : 'pattern';

    // Build agency-level content from the topic key
    const [category, value, metric] = row.topic.split(':');
    const metricLabel: Record<string, string> = {
      save_rate: 'salvamento', click_rate: 'clique',
      eng_rate: 'engajamento', conversion_rate: 'conversão',
    };
    const label = metricLabel[metric] ?? metric ?? '';
    const uplift = Number(row.avg_uplift).toFixed(1);
    const conf = (Number(row.avg_confidence) * 100).toFixed(0);
    const evidenceLabel = evidence === 'rule' ? '[regra]' : '[padrão]';

    const content = value
      ? `${evidenceLabel} ${category} "${value}" produz +${uplift}% em ${label} confirmado em ${row.client_count} clientes (${conf}% confiança média).`
      : `${evidenceLabel} Padrão ${row.topic} confirmado em ${row.client_count} clientes (+${uplift}% em ${label}).`;

    await query(
      `INSERT INTO jarvis_agency_kb_entries
         (tenant_id, topic, category, content, evidence_level,
          client_count, client_ids, avg_uplift, avg_confidence, promoted_at, last_validated)
       VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8,$9,now(),now())
       ON CONFLICT (tenant_id, topic)
       DO UPDATE SET
         content        = EXCLUDED.content,
         evidence_level = EXCLUDED.evidence_level,
         client_count   = EXCLUDED.client_count,
         client_ids     = EXCLUDED.client_ids,
         avg_uplift     = EXCLUDED.avg_uplift,
         avg_confidence = EXCLUDED.avg_confidence,
         last_validated = now(),
         updated_at     = now()`,
      [
        tenantId, row.topic, category, content, evidence,
        row.client_count, row.client_ids,
        row.avg_uplift, row.avg_confidence,
      ]
    );
    promoted++;
  }

  return promoted;
}

// ── Read KB for prompt injection ──────────────────────────────────────────────

export async function buildKbContext(
  tenantId: string,
  clientId: string
): Promise<KbContext> {
  const [clientRows, agencyRows, connectionRows] = await Promise.all([
    query(
      `SELECT topic, category, content, evidence_level, uplift_metric, uplift_value, confidence, sample_size, source
       FROM jarvis_kb_entries
       WHERE tenant_id=$1 AND client_id=$2
         AND evidence_level IN ('one_case','pattern','rule')
         AND category != 'connection'
       ORDER BY
         CASE evidence_level WHEN 'rule' THEN 1 WHEN 'pattern' THEN 2 ELSE 3 END,
         uplift_value DESC NULLS LAST
       LIMIT 200`,
      [tenantId, clientId]
    ),
    query(
      `SELECT topic, category, content, evidence_level, client_count, avg_uplift
       FROM jarvis_agency_kb_entries
       WHERE tenant_id=$1
       ORDER BY
         CASE evidence_level WHEN 'rule' THEN 1 ELSE 2 END,
         client_count DESC, avg_uplift DESC NULLS LAST
       LIMIT 100`,
      [tenantId]
    ),
    query(
      `SELECT topic, content, source_data
       FROM jarvis_kb_entries
       WHERE tenant_id=$1 AND client_id=$2
         AND category = 'connection'
       ORDER BY updated_at DESC
       LIMIT 20`,
      [tenantId, clientId]
    ),
  ]);

  const clientPatterns = clientRows.rows.map(rowToKbEntry);
  const agencyPatterns = agencyRows.rows.map(rowToAgencyEntry);
  const connections = connectionRows.rows;

  const summary = buildPromptBlock(clientPatterns, agencyPatterns, connections);

  return { client_patterns: clientPatterns, agency_patterns: agencyPatterns, summary };
}

function rowToKbEntry(r: any): KbEntry {
  return {
    topic: r.topic,
    category: r.category,
    content: r.content,
    evidence_level: r.evidence_level,
    uplift_metric: r.uplift_metric,
    uplift_value: r.uplift_value !== null ? Number(r.uplift_value) : undefined,
    confidence: r.confidence !== null ? Number(r.confidence) : undefined,
    sample_size: r.sample_size !== null ? Number(r.sample_size) : undefined,
    source: r.source,
  };
}

function rowToAgencyEntry(r: any): KbEntry {
  return {
    topic: r.topic,
    category: r.category,
    content: r.content,
    evidence_level: r.evidence_level,
    uplift_value: r.avg_uplift !== null ? Number(r.avg_uplift) : undefined,
    sample_size: r.client_count !== null ? Number(r.client_count) : undefined,
    source: 'agency_kb',
  };
}

// ── Synthesize: project_card_analytics → jarvis_kb_entries ───────────────────
// Extracts recurring work patterns from Trello history for a client and files them as KB entries.
// Examples: "Reels tem cycle_time 40% menor que Carrossel" or "% de aprovação na primeira tentativa"

export async function synthesizeTrelloKb(
  tenantId: string,
  clientId: string
): Promise<number> {
  // Aggregate by job_type (parsed from card title): avg cycle_time, revision_count, approval rate
  const { rows } = await query(
    `SELECT
       pca.parsed_job_type,
       COUNT(*)::int                          AS card_count,
       AVG(pca.cycle_time_hours)              AS avg_cycle_hours,
       AVG(pca.revision_count)                AS avg_revisions,
       AVG(pca.approval_cycles)               AS avg_approval_cycles,
       AVG(CASE WHEN pca.was_overdue THEN 1 ELSE 0 END) AS overdue_rate,
       AVG(CASE WHEN pca.revision_count = 0 THEN 1.0 ELSE 0.0 END) AS first_try_rate
     FROM project_card_analytics pca
     JOIN project_boards pb ON pb.id = pca.board_id
     WHERE pb.tenant_id = $1
       AND pb.client_id = $2
       AND pb.is_archived = false
       AND pca.terminal_stage IN ('FINALIZADO','DONE','CONCLUÍDO')
       AND pca.parsed_job_type IS NOT NULL
     GROUP BY pca.parsed_job_type
     HAVING COUNT(*) >= 2`,
    [tenantId, clientId]
  );

  if (!rows.length) return 0;

  let upserted = 0;

  for (const row of rows) {
    const jobType: string = row.parsed_job_type;
    const count: number = Number(row.card_count);
    const avgCycleDays: number = row.avg_cycle_hours !== null ? Number(row.avg_cycle_hours) / 24 : 0;
    const avgRevisions: number = row.avg_revisions !== null ? Number(row.avg_revisions) : 0;
    const overdueRate: number = row.overdue_rate !== null ? Number(row.overdue_rate) * 100 : 0;
    const firstTryRate: number = row.first_try_rate !== null ? Number(row.first_try_rate) * 100 : 0;

    const evidence = evidenceFromSampleAndConfidence(count, firstTryRate / 100);
    const topic = `work_pattern:${jobType}:cycle_time`;

    const parts: string[] = [
      `[${evidence}] Tipo "${jobType}" (${count} cards): cycle time médio ${avgCycleDays.toFixed(1)} dias`,
      `revisões médias ${avgRevisions.toFixed(1)}`,
    ];
    if (firstTryRate > 0) parts.push(`aprovado de primeira em ${firstTryRate.toFixed(0)}% dos casos`);
    if (overdueRate > 0) parts.push(`atraso em ${overdueRate.toFixed(0)}% das entregas`);

    const content = parts.join(', ') + '.';

    await upsertKbEntry(tenantId, clientId, {
      topic,
      category: 'work_pattern',
      content,
      evidence_level: evidence,
      sample_size: count,
      source: 'trello_analytics',
      source_data: {
        job_type: jobType,
        avg_cycle_days: avgCycleDays,
        avg_revisions: avgRevisions,
        overdue_rate: overdueRate,
        first_try_rate: firstTryRate,
      },
    });
    upserted++;
  }

  // Also file a board-level health summary if we have enough data
  const { rows: boardRows } = await query(
    `SELECT
       pb.name AS board_name,
       pba.median_cycle_time_hours,
       pba.avg_revision_count,
       pba.pct_on_time,
       pba.pct_approved_first_try,
       pba.bottleneck_stage,
       pba.cards_done
     FROM project_board_analytics pba
     JOIN project_boards pb ON pb.id = pba.board_id
     WHERE pb.tenant_id = $1 AND pb.client_id = $2 AND pb.is_archived = false
       AND pba.cards_done >= 3
     ORDER BY pba.cards_done DESC
     LIMIT 1`,
    [tenantId, clientId]
  );

  if (boardRows[0]) {
    const bm = boardRows[0];
    const cycleDays = bm.median_cycle_time_hours !== null ? (Number(bm.median_cycle_time_hours) / 24).toFixed(1) : 'n/a';
    const onTime = bm.pct_on_time !== null ? `${Number(bm.pct_on_time).toFixed(0)}%` : 'n/a';
    const firstTry = bm.pct_approved_first_try !== null ? `${Number(bm.pct_approved_first_try).toFixed(0)}%` : 'n/a';
    const bottleneck = bm.bottleneck_stage ? ` Gargalo: ${bm.bottleneck_stage}.` : '';

    const evidence = evidenceFromSampleAndConfidence(Number(bm.cards_done), 0.8);
    await upsertKbEntry(tenantId, clientId, {
      topic: `work_pattern:board:health`,
      category: 'work_pattern',
      content: `[${evidence}] Board "${bm.board_name}" (${bm.cards_done} cards): cycle time mediano ${cycleDays} dias, entregue no prazo ${onTime}, aprovado de primeira ${firstTry}.${bottleneck}`,
      evidence_level: evidence,
      sample_size: Number(bm.cards_done),
      source: 'trello_analytics',
      source_data: {
        board_name: bm.board_name,
        median_cycle_days: cycleDays,
        pct_on_time: bm.pct_on_time,
        bottleneck_stage: bm.bottleneck_stage,
      },
    });
    upserted++;
  }

  return upserted;
}

// ── Search KB entries ─────────────────────────────────────────────────────────

export interface KbSearchResult {
  id: string;
  topic: string;
  category: string;
  content: string;
  evidence_level: string;
  uplift_metric?: string;
  uplift_value?: number;
  source: string;
}

/**
 * Full-text search on jarvis_kb_entries content column + optional category filter.
 * Returns top 5 matching entries ordered by evidence level + recency.
 */
export async function searchKbEntries(
  tenantId: string,
  clientId: string,
  searchQuery: string,
  category?: string
): Promise<KbSearchResult[]> {
  const params: any[] = [tenantId, clientId, `%${searchQuery.toLowerCase()}%`];
  let categoryFilter = '';
  if (category) {
    params.push(category);
    categoryFilter = `AND category = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT id, topic, category, content, evidence_level, uplift_metric,
            uplift_value, source
     FROM jarvis_kb_entries
     WHERE tenant_id = $1
       AND client_id = $2
       AND LOWER(content) LIKE $3
       ${categoryFilter}
     ORDER BY
       CASE evidence_level
         WHEN 'rule'     THEN 1
         WHEN 'pattern'  THEN 2
         WHEN 'one_case' THEN 3
         ELSE 4
       END,
       updated_at DESC
     LIMIT 5`,
    params
  );

  return rows.map((r: any) => ({
    id: r.id,
    topic: r.topic,
    category: r.category,
    content: r.content,
    evidence_level: r.evidence_level,
    uplift_metric: r.uplift_metric,
    uplift_value: r.uplift_value !== null ? Number(r.uplift_value) : undefined,
    source: r.source,
  }));
}

function buildPromptBlock(client: KbEntry[], agency: KbEntry[], connections: any[] = []): string {
  const lines: string[] = ['=== JARVIS KB — Padrões Aprendidos ===\n'];

  if (client.length) {
    lines.push('## Padrões deste cliente (alta prioridade):');
    for (const e of client) lines.push(`- ${e.content}`);
    lines.push('');
  }

  if (agency.length) {
    lines.push('## Padrões da agência (confirmados em múltiplos clientes):');
    for (const e of agency) lines.push(`- ${e.content}`);
    lines.push('');
  }

  if (connections.length) {
    lines.push('## Conexões detectadas pelo Connector (hipóteses a explorar):');
    for (const c of connections) lines.push(`- ${c.content}`);
    lines.push('');
  }

  if (!client.length && !agency.length) {
    lines.push('Nenhum padrão confirmado ainda. Usando conhecimento base apenas.');
  }

  lines.push('Priorize padrões [regra] e [padrão] ao sugerir gatilhos e formatos. Use as conexões como hipóteses a testar — não como fatos confirmados.');

  return lines.join('\n');
}
