import Parser from 'rss-parser';
import crypto from 'crypto';
import { query } from '../db';
import { enqueueJob, fetchJobs, markJob } from '../jobs/jobQueue';
import { UrlScraper } from './urlScraper';
import { scoreClippingItem, matchesWordBoundary } from './scoring';

const parser = new Parser();

type ClippingSource = {
  id: string;
  tenant_id: string;
  scope: string;
  client_id?: string | null;
  name: string;
  url: string;
  type: string;
  tags: string[] | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  fetch_interval_minutes?: number | null;
  include_keywords?: string[] | null;
  exclude_keywords?: string[] | null;
  min_content_length?: number | null;
};

type ClippingItem = {
  id: string;
  tenant_id: string;
  source_id: string;
  title: string;
  url: string;
  published_at?: string | null;
  snippet?: string | null;
  image_url?: string | null;
  summary?: string | null;
  content?: string | null;
  type: string;
  segments?: string[] | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  score?: number | null;
  suggested_client_ids?: string[] | null;
};

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  varejo: ['varejo', 'supermercado', 'atacado', 'cash&carry', 'atacarejo', 'promocao', 'desconto', 'loja', 'shopping', 'consumidor', 'pdv', 'ponto de venda', 'e-commerce', 'ecommerce', 'marketplace'],
  moda: ['moda', 'fashion', 'roupa', 'calçado', 'vestuário', 'grife', 'coleção', 'estilista', 'tendência', 'lookbook', 'fast fashion'],
  saude: ['saude', 'saúde', 'farmacia', 'farmácia', 'hospital', 'clinica', 'clínica', 'bem-estar', 'medicina', 'terapia', 'medico', 'médico', 'plano de saude'],
  fintech: ['fintech', 'banco', 'credito', 'crédito', 'pagamento', 'cartao', 'cartão', 'pix', 'open banking', 'investimento', 'seguro', 'cripto', 'blockchain'],
  mobilidade: ['mobilidade', 'transporte', 'rodovia', 'metro', 'metrô', 'ônibus', 'onibus', 'trânsito', 'transito', 'frota', 'veículo', 'veiculo', 'eletrico', 'elétrico', 'patinete', 'bike'],
  logistica: ['logistica', 'logística', 'frete', 'cadeia de suprimentos', 'supply chain', 'armazem', 'armazém', 'entrega', 'delivery', 'last mile', 'distribuicao', 'distribuição'],
  educacao: ['educacao', 'educação', 'escola', 'universidade', 'curso', 'ensino', 'aprendizado', 'edtech', 'vestibular', 'enem', 'professor', 'aluno', 'ead'],
  tecnologia: ['tecnologia', 'software', 'saas', 'app', 'inovacao', 'inovação', 'startup', 'inteligencia artificial', 'inteligência artificial', 'machine learning', 'cloud', 'dados', 'cibersegurança', 'ciberseguranca'],
  imobiliario: ['imobiliario', 'imobiliário', 'imovel', 'imóvel', 'condominio', 'condomínio', 'construcao', 'construção', 'incorporadora', 'loteamento', 'aluguel', 'hipoteca'],
  agronegocio: ['agro', 'agronegocio', 'agronegócio', 'fazenda', 'colheita', 'safra', 'soja', 'milho', 'pecuária', 'pecuaria', 'fertilizante', 'irrigacao', 'irrigação'],
  energia: ['energia', 'eletricidade', 'petróleo', 'petroleo', 'gás', 'gas natural', 'eólica', 'eolica', 'solar', 'fotovoltaica', 'renovavel', 'renovável', 'biomassa', 'etanol'],
  sustentabilidade: ['sustentabilidade', 'esg', 'carbono', 'reciclagem', 'residuos', 'resíduos', 'meio ambiente', 'ambiental', 'economia circular', 'verde', 'impacto social'],
  portos: ['porto', 'portuario', 'portuário', 'terminal', 'navegacao', 'navegação', 'navio', 'container', 'contêiner', 'cabotagem', 'marítimo', 'maritimo', 'atracacao'],
  infraestrutura: ['infraestrutura', 'concessão', 'concessao', 'rodovia', 'ferrovia', 'saneamento', 'telecomunicações', 'telecomunicacoes', 'leilão', 'leilao', 'ppp', 'parceria publico-privada'],
  marketing_digital: ['marketing digital', 'midia social', 'mídia social', 'influenciador', 'creator', 'engajamento', 'trafego pago', 'tráfego pago', 'seo', 'performance', 'branding', 'conteudo', 'conteúdo'],
  industria: ['industria', 'indústria', 'fábrica', 'fabrica', 'manufatura', 'automação', 'automacao', 'siderurgia', 'metalurgia', 'quimica', 'química', 'embalagem'],
};

const ENRICH_SCRAPE_ENABLED = (process.env.CLIPPING_SCRAPE_ENRICH || 'true') === 'true';
const scraper = ENRICH_SCRAPE_ENABLED ? new UrlScraper({ timeout: 20000, maxRetries: 2 }) : null;

let lastStuckReapAt = 0;

function getClientMinRelevanceScore() {
  const raw = Number(process.env.CLIPPING_CLIENT_MIN_SCORE ?? '0.6');
  if (!Number.isFinite(raw)) return 0.6;
  return Math.max(0, Math.min(1, raw));
}

function getFetchStuckMinutes() {
  const raw = Number(process.env.CLIPPING_FETCH_STUCK_MINUTES ?? '30');
  if (!Number.isFinite(raw)) return 30;
  // Clamp 1–1440 (1 day)
  return Math.max(1, Math.min(1440, Math.trunc(raw)));
}

function normalize(value?: string | null) {
  return (value || '').toLowerCase();
}

function hashUrl(url: string) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function titleHash(title: string) {
  const normalized = title.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('md5').update(normalized).digest('hex');
}

function inferSegments(text: string, base: string[] = []) {
  const found = new Set<string>(base.map((t) => t.toLowerCase()));
  const hay = normalize(text);
  Object.entries(SEGMENT_KEYWORDS).forEach(([segment, keywords]) => {
    if (keywords.some((k) => matchesWordBoundary(hay, k))) {
      found.add(segment);
    }
  });
  return Array.from(found);
}

function recencyScore(publishedAt?: string | null) {
  if (!publishedAt) return 0;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 24) return 40;
  if (hours <= 72) return 30;
  if (hours <= 168) return 20;
  if (hours <= 720) return 10;
  return 0;
}

function computeScore(params: { publishedAt?: string | null; segments: string[]; type: string }) {
  const base = 10;
  const recency = recencyScore(params.publishedAt);
  const segmentScore = Math.min(30, params.segments.length * 8);
  const typeScore = params.type === 'TREND' ? 10 : 0;
  const score = base + recency + segmentScore + typeScore;
  return Math.max(0, Math.min(100, score));
}

function isHttpUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function extractImageFromHtml(html?: string | null) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = match?.[1];
  return isHttpUrl(src) ? src : null;
}

function extractImageFromRssItem(item: any) {
  const candidates: Array<string | null | undefined> = [
    item?.enclosure?.url,
    item?.enclosure?.link,
    item?.enclosures?.[0]?.url,
    item?.image?.url,
    item?.itunes?.image,
    item?.['media:content']?.url,
    item?.['media:thumbnail']?.url,
  ];

  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) return candidate as string;
  }

  const fromContent = extractImageFromHtml(item?.content || item?.contentSnippet || item?.summary);
  return fromContent || null;
}

/**
 * Check if an item passes source-level include/exclude filters.
 */
function shouldIngestItem(
  title: string,
  snippet: string,
  source: ClippingSource
): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  // Include filter: if set, at least one keyword must match
  const includes = (source.include_keywords || []).filter(Boolean);
  if (includes.length > 0) {
    const hasMatch = includes.some((kw) => matchesWordBoundary(text, kw));
    if (!hasMatch) return false;
  }

  // Exclude filter: if any keyword matches, skip
  const excludes = (source.exclude_keywords || []).filter(Boolean);
  if (excludes.length > 0) {
    const hasExclude = excludes.some((kw) => matchesWordBoundary(text, kw));
    if (hasExclude) return false;
  }

  // Min content length
  if (source.min_content_length && text.length < source.min_content_length) {
    return false;
  }

  return true;
}

/**
 * Check if an item with the same title hash exists in the last 7 days.
 */
async function isDuplicateTitle(tenantId: string, hash: string): Promise<boolean> {
  const { rows } = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM clipping_items
     WHERE tenant_id=$1 AND title_hash=$2 AND created_at > NOW() - INTERVAL '7 days'`,
    [tenantId, hash]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

/**
 * Auto-score a clipping item against all clients that have keywords configured.
 */
async function autoScoreClients(tenantId: string, item: ClippingItem) {
  const { rows: clients } = await query<any>(
    `SELECT id, profile FROM clients WHERE tenant_id=$1`,
    [tenantId]
  );

  const minClientScore = getClientMinRelevanceScore();

  for (const client of clients) {
    const profile = client.profile || {};
    const keywords: string[] = Array.isArray(profile.keywords) ? profile.keywords : [];
    const pillars: string[] = Array.isArray(profile.pillars) ? profile.pillars : [];
    const negativeKeywords: string[] = Array.isArray(profile.negative_keywords) ? profile.negative_keywords : [];

    // Skip clients without any keywords or pillars configured
    if (!keywords.length && !pillars.length) continue;

    const scoreResult = scoreClippingItem(
      {
        title: item.title,
        summary: item.snippet || item.summary || undefined,
        content: item.content || undefined,
        publishedAt: item.published_at,
        tags: item.segments,
      },
      { keywords, pillars, negativeKeywords }
    );

    // Only create match for scores that are meaningful to the client.
    if (scoreResult.score >= minClientScore) {
      const scorePercent = Math.max(0, Math.min(100, Math.round(scoreResult.score * 100)));

      // Add client to suggested_client_ids
      const currentSuggested: string[] = Array.isArray(item.suggested_client_ids) ? item.suggested_client_ids : [];
      if (!currentSuggested.includes(client.id)) {
        const updated = [...currentSuggested, client.id];
        await query(
          `UPDATE clipping_items SET suggested_client_ids=$3, relevance_score=GREATEST(COALESCE(relevance_score,0),$4), updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [item.id, tenantId, updated, scoreResult.score]
        );
        item.suggested_client_ids = updated;
      }

      // Upsert match
      await query(
        `INSERT INTO clipping_matches
           (tenant_id, clipping_item_id, client_id, score, matched_keywords, suggested_actions, negative_hits, relevance_factors)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (tenant_id, clipping_item_id, client_id)
         DO UPDATE SET score=$4, matched_keywords=$5, suggested_actions=$6, negative_hits=$7, relevance_factors=$8, updated_at=NOW()`,
        [
          tenantId,
          item.id,
          client.id,
          scoreResult.score,
          scoreResult.matchedKeywords,
          scoreResult.suggestedActions,
          scoreResult.negativeHits,
          JSON.stringify(scoreResult.relevanceFactors),
        ]
      );
    }
  }
}

/**
 * Delete all clipping items older than 7 days, regardless of status or score.
 * Also cleans up related matches, feedback, and completed/failed jobs.
 */
async function purgeExpiredItems() {
  // Delete matches for expired items
  await query(
    `DELETE FROM clipping_matches WHERE clipping_item_id IN (
       SELECT id FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'
     )`
  );

  // Delete feedback for expired items
  await query(
    `DELETE FROM clipping_feedback WHERE item_id IN (
       SELECT id FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'
     )`
  );

  // Delete the expired items themselves
  await query(
    `DELETE FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'`
  );

  // Clean up old completed/failed clipping jobs (older than 3 days)
  await query(
    `DELETE FROM job_queue
     WHERE type LIKE 'clipping_%'
       AND status IN ('done','failed')
       AND updated_at < NOW() - INTERVAL '3 days'`
  );
}

async function enqueueDueSources() {
  const { rows } = await query<ClippingSource>(
    `
    SELECT cs.* FROM clipping_sources cs
    WHERE cs.is_active=true
      AND (
        cs.last_fetched_at IS NULL OR
        cs.last_fetched_at + (cs.fetch_interval_minutes || ' minutes')::interval <= NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM job_queue jq
        WHERE jq.type='clipping_fetch_source'
          AND jq.status IN ('queued','processing')
          AND jq.payload->>'source_id' = cs.id::text
      )
    ORDER BY cs.last_fetched_at NULLS FIRST
    LIMIT 20
    `
  );

  for (const source of rows) {
    await enqueueJob(source.tenant_id, 'clipping_fetch_source', { source_id: source.id });
  }
}

async function autoReapStuckFetchJobs() {
  // Avoid running this query on every runner tick (default tick is 5s).
  if (Date.now() - lastStuckReapAt < 60_000) return;
  lastStuckReapAt = Date.now();

  const minutes = getFetchStuckMinutes();

  try {
    await query(
      `WITH cancelled AS (
         UPDATE job_queue jq
         SET status='failed',
             error_message=$1,
             updated_at=NOW()
         WHERE jq.type='clipping_fetch_source'
           AND jq.status='processing'
           AND jq.updated_at < NOW() - ($2::text || ' minutes')::interval
         RETURNING jq.tenant_id, NULLIF(jq.payload->>'source_id','') AS source_id
       ),
       updated_sources AS (
         UPDATE clipping_sources cs
         SET status='ERROR',
             last_error=$3,
             last_fetched_at=NOW(),
             updated_at=NOW()
         FROM cancelled c
         WHERE c.source_id IS NOT NULL
           AND cs.id::text = c.source_id
           AND cs.tenant_id = c.tenant_id
         RETURNING cs.id
       )
       SELECT
         (SELECT COUNT(*)::int FROM cancelled) AS cancelled_jobs,
         (SELECT COUNT(*)::int FROM updated_sources) AS touched_sources`,
      ['fetch_stuck_timeout', minutes, 'fetch_stuck_timeout']
    );
  } catch {
    // ignore auto-reaper errors
  }
}

async function handleFetchSource(job: any) {
  const sourceId = job.payload?.source_id;
  if (!sourceId) return;

  const { rows } = await query<ClippingSource>(
    `SELECT * FROM clipping_sources WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [sourceId, job.tenant_id]
  );
  const source = rows[0];
  if (!source) return;

  try {
    if (source.type !== 'RSS') {
      await query(
        `UPDATE clipping_sources cs
         SET last_fetched_at=NOW(), status='OK', last_error=NULL, updated_at=NOW()
         FROM job_queue jq
         WHERE cs.id=$1
           AND cs.tenant_id=$2
           AND jq.id=$3
           AND jq.tenant_id=$2
           AND jq.status='processing'`,
        [source.id, job.tenant_id, job.id]
      );
      return;
    }

    const feed = await parser.parseURL(source.url);
    let inserted = 0;

    for (const item of feed.items || []) {
      const url = (item.link || item.guid || '').trim();
      if (!url) continue;
      const title = (item.title || 'Untitled').trim();
      const snippet =
        (item.contentSnippet || item.content || item.summary || '').toString().slice(0, 600);

      // Source-level include/exclude filter
      if (!shouldIngestItem(title, snippet, source)) continue;

      // Title dedup check
      const tHash = titleHash(title);
      const isDupe = await isDuplicateTitle(source.tenant_id, tHash);
      if (isDupe) continue;

      const publishedAt = item.isoDate || item.pubDate || null;
      const imageUrl = extractImageFromRssItem(item);

      const { rows: insertedRows } = await query<{ id: string }>(
        `
        INSERT INTO clipping_items
          (tenant_id, source_id, title, url, url_hash, title_hash, published_at, snippet, image_url, type, segments, country, uf, city)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (tenant_id, url_hash) DO NOTHING
        RETURNING id
        `,
        [
          source.tenant_id,
          source.id,
          title,
          url,
          hashUrl(url),
          tHash,
          publishedAt ? new Date(publishedAt) : null,
          snippet,
          imageUrl,
          source.type === 'YOUTUBE' ? 'TREND' : 'NEWS',
          source.tags ?? [],
          source.country ?? null,
          source.uf ?? null,
          source.city ?? null,
        ]
      );

      if (insertedRows[0]) {
        inserted += 1;
        await enqueueJob(source.tenant_id, 'clipping_enrich_item', {
          item_id: insertedRows[0].id,
        });
      }
    }

    await query(
      `UPDATE clipping_sources cs
       SET last_fetched_at=NOW(), status='OK', last_error=NULL, updated_at=NOW()
       FROM job_queue jq
       WHERE cs.id=$1
         AND cs.tenant_id=$2
         AND jq.id=$3
         AND jq.tenant_id=$2
         AND jq.status='processing'`,
      [source.id, job.tenant_id, job.id]
    );

    return inserted;
  } catch (error: any) {
    await query(
      `UPDATE clipping_sources cs
       SET last_fetched_at=NOW(), status='ERROR', last_error=$4, updated_at=NOW()
       FROM job_queue jq
       WHERE cs.id=$1
         AND cs.tenant_id=$2
         AND jq.id=$3
         AND jq.tenant_id=$2
         AND jq.status='processing'`,
      [source.id, job.tenant_id, job.id, error?.message || 'fetch_failed']
    );
    throw error;
  }
}

async function handleEnrichItem(job: any) {
  const itemId = job.payload?.item_id;
  if (!itemId) return;

  const { rows } = await query<ClippingItem>(
    `SELECT * FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [itemId, job.tenant_id]
  );
  const item = rows[0];
  if (!item) return;

  const baseSegments = Array.isArray(item.segments) ? item.segments : [];
  let text = `${item.title} ${item.snippet || ''}`;
  const segments = inferSegments(text, baseSegments);

  let imageUrl = item.image_url ?? null;
  let summary = null as string | null;
  let content = null as string | null;

  // Always scrape when scraper is available and item has a URL
  if (scraper && item.url) {
    try {
      const scraped = await scraper.scrape(item.url);
      imageUrl = scraped.imageUrl || imageUrl;
      summary = scraped.excerpt || null;
      content = scraped.contentText || null;
      // Re-infer segments with richer content
      if (content) {
        text = `${item.title} ${summary || ''} ${content}`;
        const enrichedSegments = inferSegments(text, segments);
        segments.length = 0;
        enrichedSegments.forEach((s) => segments.push(s));
      }
    } catch {
      // ignore scrape failures
    }
  }

  const score = computeScore({
    publishedAt: item.published_at,
    segments,
    type: item.type,
  });

  await query(
    `
    UPDATE clipping_items
    SET segments=$3,
        score=$4,
        image_url=COALESCE($5, image_url),
        summary=COALESCE($6, summary),
        content=COALESCE($7, content),
        updated_at=NOW()
    WHERE id=$1 AND tenant_id=$2
    `,
    [item.id, item.tenant_id, segments, score, imageUrl, summary, content]
  );

  // Enqueue auto-score job
  await enqueueJob(item.tenant_id, 'clipping_auto_score', { item_id: item.id });
}

async function handleAutoScore(job: any) {
  const itemId = job.payload?.item_id;
  if (!itemId) return;

  const { rows } = await query<ClippingItem>(
    `SELECT * FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [itemId, job.tenant_id]
  );
  const item = rows[0];
  if (!item) return;

  await autoScoreClients(job.tenant_id, item);
}

export async function runClippingWorkerOnce() {
  await autoReapStuckFetchJobs();

  // Purge items older than 7 days and clean up old jobs
  await purgeExpiredItems();

  await enqueueDueSources();

  const pendingFetchJobs = await fetchJobs('clipping_fetch_source', 3);
  for (const job of pendingFetchJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleFetchSource(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'fetch_failed');
    }
  }

  const pendingEnrichJobs = await fetchJobs('clipping_enrich_item', 5);
  for (const job of pendingEnrichJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleEnrichItem(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'enrich_failed');
    }
  }

  const pendingAutoScoreJobs = await fetchJobs('clipping_auto_score', 10);
  for (const job of pendingAutoScoreJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleAutoScore(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'auto_score_failed');
    }
  }
}
