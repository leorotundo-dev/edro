import { query } from '../db';
import { buildArtDirectionMemoryContext } from './ai/artDirectionMemoryService';
import { buildClientContext, loadPerformanceContext, loadPsychContext } from './jarvisContextService';

export type JarvisMemoryKey =
  | 'client_memory'
  | 'operations_memory'
  | 'canon_edro'
  | 'reference_memory'
  | 'trend_memory'
  | 'performance_memory';

export type JarvisMemoryBlock = {
  key: JarvisMemoryKey;
  label: string;
  content: string;
};

function trimBlock(content: string, maxChars = 1400) {
  const normalized = String(content || '').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return '';
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1)}…` : normalized;
}

function labelForMemory(key: JarvisMemoryKey) {
  switch (key) {
    case 'client_memory':
      return 'Memória do cliente';
    case 'operations_memory':
      return 'Operações';
    case 'canon_edro':
      return 'Canon Edro';
    case 'reference_memory':
      return 'Repertório visual';
    case 'trend_memory':
      return 'Trend radar';
    case 'performance_memory':
      return 'Performance';
    default:
      return key;
  }
}

async function buildOperationsMemoryBlock(params: {
  tenantId: string;
  clientId?: string | null;
}): Promise<string> {
  const { tenantId, clientId } = params;

  const [summaryRes, jobsRes, signalsRes] = await Promise.all([
    query<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('done', 'archived')) AS open_jobs,
         COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_jobs,
         COUNT(*) FILTER (
           WHERE deadline_at IS NOT NULL
             AND deadline_at < NOW()
             AND status NOT IN ('done', 'archived')
         ) AS overdue_jobs,
         COUNT(*) FILTER (
           WHERE owner_id IS NULL
             AND status NOT IN ('done', 'archived')
         ) AS unowned_jobs
       FROM jobs
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR client_id = $2)`,
      [tenantId, clientId ?? null],
    ),
    query<any>(
      `SELECT j.title, j.status, j.deadline_at, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       WHERE j.tenant_id = $1
         AND ($2::text IS NULL OR j.client_id = $2)
         AND j.status NOT IN ('done', 'archived')
       ORDER BY
         CASE WHEN j.status = 'blocked' THEN 0 ELSE 1 END,
         j.deadline_at ASC NULLS LAST,
         j.priority_score DESC
       LIMIT 4`,
      [tenantId, clientId ?? null],
    ),
    query<any>(
      `SELECT severity, title
       FROM operational_signals
       WHERE tenant_id = $1
         AND resolved_at IS NULL
         AND ($2::text IS NULL OR client_id = $2)
       ORDER BY severity DESC, created_at DESC
       LIMIT 4`,
      [tenantId, clientId ?? null],
    ),
  ]);

  const summary = summaryRes.rows[0];
  const parts: string[] = [
    'MEMÓRIA OPERACIONAL RESOLVIDA:',
    `- Jobs abertos: ${Number(summary?.open_jobs || 0)}`,
    `- Bloqueados: ${Number(summary?.blocked_jobs || 0)}`,
    `- Em atraso: ${Number(summary?.overdue_jobs || 0)}`,
    `- Sem dono: ${Number(summary?.unowned_jobs || 0)}`,
  ];

  if (jobsRes.rows.length) {
    parts.push('Top itens operacionais:');
    jobsRes.rows.forEach((row) => {
      const deadline = row.deadline_at ? new Date(row.deadline_at).toLocaleDateString('pt-BR') : 'sem prazo';
      parts.push(`- ${row.title} | ${row.client_name || 'sem cliente'} | ${row.status} | ${deadline}`);
    });
  }

  if (signalsRes.rows.length) {
    parts.push('Sinais em aberto:');
    signalsRes.rows.forEach((row) => {
      parts.push(`- [${String(row.severity || '').toUpperCase()}] ${row.title}`);
    });
  }

  return parts.join('\n');
}

async function buildArtDirectionBlocks(params: {
  tenantId: string;
  clientId?: string | null;
  needed: Set<JarvisMemoryKey>;
}): Promise<JarvisMemoryBlock[]> {
  const needsCanon = params.needed.has('canon_edro');
  const needsReference = params.needed.has('reference_memory');
  const needsTrend = params.needed.has('trend_memory');
  if (!needsCanon && !needsReference && !needsTrend) return [];

  const memory = await buildArtDirectionMemoryContext({
    tenantId: params.tenantId,
    clientId: params.clientId ?? null,
    conceptLimit: needsCanon ? 4 : 0,
    referenceLimit: needsReference ? 4 : 0,
    trendLimit: needsTrend ? 3 : 0,
  }).catch(() => null);

  if (!memory) return [];

  const blocks: JarvisMemoryBlock[] = [];

  if (needsCanon && memory.promptBlock) {
    const canonOnly = trimBlock(
      memory.promptBlock
        .split('\n\n')
        .filter((section) => section.startsWith('BIBLIOTECA DE CONHECIMENTO DA EDRO') || section.startsWith('DESIGN CANON RELEVANTE'))
        .join('\n\n'),
    );
    if (canonOnly) {
      blocks.push({ key: 'canon_edro', label: labelForMemory('canon_edro'), content: canonOnly });
    }
  }

  if (needsReference && memory.references.length) {
    const refLines = memory.references.map((reference) => {
      const tags = [...(reference.style_tags || []), ...(reference.composition_tags || []), ...(reference.typography_tags || [])]
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      return `- ${reference.title} | ${reference.platform || 'geral'}${reference.format ? ` / ${reference.format}` : ''}${reference.creative_direction ? ` | direção: ${reference.creative_direction}` : ''}${tags ? ` | tags: ${tags}` : ''}`;
    });
    blocks.push({
      key: 'reference_memory',
      label: labelForMemory('reference_memory'),
      content: trimBlock(`REFERÊNCIAS ACEITAS RELEVANTES:\n${refLines.join('\n')}`),
    });
  }

  if (needsTrend && memory.trends.length) {
    const trendLines = memory.trends.map((trend) =>
      `- ${trend.tag} | score ${Number(trend.trend_score || 0).toFixed(1)} | momentum ${Number(trend.momentum || 0).toFixed(2)}`
    );
    blocks.push({
      key: 'trend_memory',
      label: labelForMemory('trend_memory'),
      content: trimBlock(`TENDÊNCIAS DETECTADAS:\n${trendLines.join('\n')}`),
    });
  }

  return blocks.filter((block) => block.content);
}

export async function buildJarvisMemoryBlocks(params: {
  tenantId: string;
  clientId?: string | null;
  memories: JarvisMemoryKey[];
  maxBlocks?: number;
}): Promise<JarvisMemoryBlock[]> {
  const ordered = Array.from(new Set(params.memories));
  const artDirectionNeeded = new Set<JarvisMemoryKey>(ordered.filter((memory) =>
    memory === 'canon_edro' || memory === 'reference_memory' || memory === 'trend_memory'
  ));

  const blockMap = new Map<JarvisMemoryKey, JarvisMemoryBlock>();
  const [
    clientContext,
    performanceContext,
    operationsContext,
    artDirectionBlocks,
  ] = await Promise.all([
    ordered.includes('client_memory') && params.clientId
      ? buildClientContext(params.tenantId, params.clientId).catch(() => '')
      : Promise.resolve(''),
    ordered.includes('performance_memory') && params.clientId
      ? Promise.all([
        loadPsychContext(params.tenantId, params.clientId).catch(() => ''),
        loadPerformanceContext(params.clientId).catch(() => ''),
      ]).then(([psych, perf]) => [psych, perf].filter(Boolean).join('\n\n'))
      : Promise.resolve(''),
    ordered.includes('operations_memory')
      ? buildOperationsMemoryBlock({ tenantId: params.tenantId, clientId: params.clientId }).catch(() => '')
      : Promise.resolve(''),
    buildArtDirectionBlocks({
      tenantId: params.tenantId,
      clientId: params.clientId,
      needed: artDirectionNeeded,
    }),
  ]);

  if (clientContext) {
    blockMap.set('client_memory', {
      key: 'client_memory',
      label: labelForMemory('client_memory'),
      content: trimBlock(clientContext, 1800),
    });
  }
  if (performanceContext) {
    blockMap.set('performance_memory', {
      key: 'performance_memory',
      label: labelForMemory('performance_memory'),
      content: trimBlock(performanceContext),
    });
  }
  if (operationsContext) {
    blockMap.set('operations_memory', {
      key: 'operations_memory',
      label: labelForMemory('operations_memory'),
      content: trimBlock(operationsContext),
    });
  }
  artDirectionBlocks.forEach((block) => blockMap.set(block.key, block));

  const blocks = ordered
    .map((memory) => blockMap.get(memory))
    .filter((block): block is JarvisMemoryBlock => Boolean(block?.content));

  return blocks.slice(0, Math.max(1, params.maxBlocks ?? blocks.length));
}

export function formatJarvisMemoryBlocks(blocks: JarvisMemoryBlock[]): string {
  const safeBlocks = blocks.filter((block) => block.content.trim());
  if (!safeBlocks.length) return '';
  return [
    'MEMÓRIAS RESOLVIDAS PARA ESTA CONVERSA:',
    ...safeBlocks.map((block) => `[${block.label}]\n${block.content}`),
  ].join('\n\n');
}
