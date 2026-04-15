# Performance Feedback Loop — Spec de Implementação

> Documento gerado em 2026-04-15  
> Problema: o `postId` retornado pelas APIs de publicação (LinkedIn, Meta, TikTok) é descartado.  
> Consequência: métricas reais de performance nunca são atribuídas ao copy que as gerou.  
> Solução: capturar o postId, linkar ao copy, alimentar o learning loop.

---

## O elo quebrado

```
HOJE
────
publishLinkedInPost() → { postId: "urn:li:share:123456" } → DESCARTADO ❌
publish_queue.status = 'published'  ← só isso é salvo

DEPOIS
──────
publishLinkedInPost() → { postId: "urn:li:share:123456" } → SALVO ✓
publish_queue.platform_post_id = "urn:li:share:123456"
      ↕ match via external_id
client_posts.external_id = "urn:li:share:123456"  ← clientPostsWorker já popula isso
      ↕
briefing_post_metrics.post_id = "urn:li:share:123456"  ← campo existe, nunca preenchido
      ↕
edro_copy_versions (via briefing_id) ← copy que gerou aquele post
      ↕
copy_roi_scores ← performance real por copy
      ↕
learning loop ← "este ângulo gerou 4.2% de save rate"
```

---

## Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `apps/backend/src/jobs/publishWorker.ts` | Salvar platform_post_id após publicação |
| `apps/backend/src/jobs/scheduledPublicationsWorker.ts` | Idem |
| `apps/backend/src/routes/webhooks.ts` | Salvar platform_post_id no callback Meta/TikTok |
| `apps/backend/src/jobs/clientPostsWorker.ts` | Adicionar step de match após sync |
| `apps/backend/src/services/performanceLinkService.ts` | **Novo serviço** — match + atribuição |
| `apps/backend/src/services/learningLoopService.ts` | Adicionar `aggregatePostLevelPerformance()` |
| `apps/backend/src/db/migrations/0337_platform_post_ids.sql` | **Nova migration** |

---

## Migration — `0337_platform_post_ids.sql`

```sql
-- Adicionar platform_post_id nas tabelas de publicação
ALTER TABLE publish_queue
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE edro_publish_schedule
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE creative_publication_intents
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

-- Índices para o match via external_id
CREATE INDEX IF NOT EXISTS idx_publish_queue_platform_post_id
  ON publish_queue(platform_post_id) WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edro_publish_schedule_platform_post_id
  ON edro_publish_schedule(platform_post_id) WHERE platform_post_id IS NOT NULL;
```

---

## Passo 1 — Capturar postId em `publishWorker.ts`

**Arquivo:** `apps/backend/src/jobs/publishWorker.ts`

Localizar cada bloco de publicação por plataforma e capturar o retorno:

### LinkedIn
```typescript
// ANTES:
await publishLinkedInPost(tenantId, clientId, { caption, imageUrl, title });

// DEPOIS:
const linkedInResult = await publishLinkedInPost(tenantId, clientId, { caption, imageUrl, title });
if (linkedInResult?.postId) {
  await query(
    `UPDATE publish_queue
     SET platform_post_id = $2, platform_post_url = $3, updated_at = NOW()
     WHERE id = $1`,
    [job.id, linkedInResult.postId, linkedInResult.postUrl || null]
  );
}
```

### Meta (Instagram / Facebook)
```typescript
// ANTES:
await publishMetaAssetNow({ tenantId, clientId, imageUrl, caption, channel });

// DEPOIS:
const metaResult = await publishMetaAssetNow({ tenantId, clientId, imageUrl, caption, channel });
if (metaResult?.post_id) {
  await query(
    `UPDATE publish_queue
     SET platform_post_id = $2, platform_post_url = $3, updated_at = NOW()
     WHERE id = $1`,
    [job.id, metaResult.post_id, metaResult.post_url || null]
  );
}
```

### TikTok
```typescript
// ANTES:
await publishTikTokVideo(tenantId, clientId, { videoUrl, caption });

// DEPOIS:
const tiktokResult = await publishTikTokVideo(tenantId, clientId, { videoUrl, caption });
if (tiktokResult?.publishId) {
  await query(
    `UPDATE publish_queue
     SET platform_post_id = $2, updated_at = NOW()
     WHERE id = $1`,
    [job.id, tiktokResult.publishId]
  );
}
```

---

## Passo 2 — Mesmo padrão em `scheduledPublicationsWorker.ts`

**Arquivo:** `apps/backend/src/jobs/scheduledPublicationsWorker.ts`

Aplicar o mesmo padrão de captura para cada plataforma (LinkedIn, Meta, TikTok).  
Salvar em `edro_publish_schedule.platform_post_id` em vez de `publish_queue`:

```typescript
// Após publicação bem-sucedida:
if (publishResult?.postId || publishResult?.post_id || publishResult?.publishId) {
  const platformPostId = publishResult.postId || publishResult.post_id || publishResult.publishId;
  const platformPostUrl = publishResult.postUrl || publishResult.post_url || null;

  await query(
    `UPDATE edro_publish_schedule
     SET platform_post_id = $2, platform_post_url = $3,
         status = 'published', published_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [schedule.id, platformPostId, platformPostUrl]
  );
}
```

---

## Passo 3 — Webhooks Meta/TikTok em `webhooks.ts`

**Arquivo:** `apps/backend/src/routes/webhooks.ts`

Quando Meta/TikTok confirmam publicação via webhook, o payload já contém o `post_id`.  
Salvar no `publish_queue` e no `post_assets`:

```typescript
// Dentro do handler de webhook de publicação confirmada:
const platformPostId = webhookPayload?.post_id
  || webhookPayload?.media_id
  || webhookPayload?.item_id
  || null;

if (platformPostId) {
  await query(
    `UPDATE publish_queue
     SET platform_post_id = $2, status = 'published', updated_at = NOW()
     WHERE id = $1`,
    [queueItem.id, platformPostId]
  );

  await query(
    `UPDATE post_assets
     SET external_post_id = $2, status = 'published', updated_at = NOW()
     WHERE id = $1`,
    [queueItem.post_asset_id, platformPostId]
  );
}
```

> Verificar o campo `external_post_id` em `post_assets` — se não existir, adicionar na migration 0337.

---

## Passo 4 — Novo serviço `performanceLinkService.ts`

**Arquivo:** `apps/backend/src/services/performanceLinkService.ts` (criar)

Este serviço faz o match entre o `platform_post_id` salvo na publicação e o `external_id` que o `clientPostsWorker` já popula em `client_posts`.

```typescript
import { query } from '../db';

/**
 * Faz o match entre posts publicados (publish_queue.platform_post_id)
 * e posts coletados do feed do cliente (client_posts.external_id).
 * Quando encontra match, popula briefing_post_metrics com dados reais.
 */
export async function linkPublishedPostsToMetrics(
  tenantId: string,
  clientId: string
): Promise<void> {
  // Buscar publicações recentes com platform_post_id mas sem métrica linkada
  const { rows: published } = await query(
    `SELECT pq.id as queue_id, pq.platform_post_id, pq.channel,
            ps.briefing_id, ps.copy_id, ps.published_at
     FROM publish_queue pq
     JOIN edro_publish_schedule ps ON ps.platform_post_id = pq.platform_post_id
     WHERE pq.tenant_id = $1
       AND pq.platform_post_id IS NOT NULL
       AND pq.status = 'published'
       AND ps.briefing_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM briefing_post_metrics bpm
         WHERE bpm.briefing_id = ps.briefing_id
           AND bpm.post_id = pq.platform_post_id
       )
     ORDER BY ps.published_at DESC
     LIMIT 50`,
    [tenantId]
  );

  for (const pub of published) {
    // Buscar métricas no client_posts pelo external_id
    const { rows: posts } = await query(
      `SELECT external_id, platform, caption,
              likes_count, comments_count, shares_count,
              impressions, reach, engagement_rate,
              posted_at
       FROM client_posts
       WHERE tenant_id = $1
         AND client_id = $2
         AND external_id = $3
       LIMIT 1`,
      [tenantId, clientId, pub.platform_post_id]
    );

    if (!posts.length) continue;

    const post = posts[0];
    const engagement = (post.likes_count || 0) + (post.comments_count || 0) + (post.shares_count || 0);

    // Upsert em briefing_post_metrics com dados reais e post_id correto
    await query(
      `INSERT INTO briefing_post_metrics
         (id, briefing_id, tenant_id, client_id, platform, post_id, post_url,
          published_at, reach, impressions, engagement, engagement_rate,
          likes, comments, saves, shares, match_source, synced_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, 'platform_post_id', NOW())
       ON CONFLICT (briefing_id, platform) DO UPDATE SET
         post_id = EXCLUDED.post_id,
         post_url = EXCLUDED.post_url,
         reach = EXCLUDED.reach,
         impressions = EXCLUDED.impressions,
         engagement = EXCLUDED.engagement,
         engagement_rate = EXCLUDED.engagement_rate,
         likes = EXCLUDED.likes,
         comments = EXCLUDED.comments,
         shares = EXCLUDED.shares,
         match_source = 'platform_post_id',
         synced_at = NOW()`,
      [
        pub.briefing_id, tenantId, clientId,
        post.platform, pub.platform_post_id, null,
        post.posted_at,
        post.reach || 0, post.impressions || 0,
        engagement, post.engagement_rate || 0,
        post.likes_count || 0, post.comments_count || 0, post.shares_count || 0,
      ]
    );

    // Atualizar copy_roi_scores com performance real
    await updateCopyRoiScore(tenantId, pub.copy_id, pub.briefing_id, post);
  }
}

/**
 * Calcula e persiste o ROI real de uma copy versão com base na performance do post.
 */
async function updateCopyRoiScore(
  tenantId: string,
  copyId: string | null,
  briefingId: string,
  post: {
    likes_count: number;
    comments_count: number;
    shares_count: number;
    impressions: number;
    reach: number;
    engagement_rate: number;
  }
): Promise<void> {
  if (!copyId && !briefingId) return;

  // Resolver copy_id pelo briefing se não informado
  let resolvedCopyId = copyId;
  if (!resolvedCopyId) {
    const { rows } = await query(
      `SELECT id FROM edro_copy_versions
       WHERE briefing_id::text = $1
       ORDER BY created_at DESC LIMIT 1`,
      [briefingId]
    );
    resolvedCopyId = rows[0]?.id || null;
  }
  if (!resolvedCopyId) return;

  // ROI score: 0-100 baseado em engagement_rate vs benchmark (2% = 50 pontos)
  const engRate = Number(post.engagement_rate) || 0;
  const roiScore = Math.min(Math.round((engRate / 0.04) * 100), 100); // 4% engagement = 100 pts

  await query(
    `INSERT INTO copy_roi_scores (copy_id, briefing_id, tenant_id, roi_score, engagement_rate,
       impressions, reach, likes, comments, shares, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (copy_id) DO UPDATE SET
       roi_score = EXCLUDED.roi_score,
       engagement_rate = EXCLUDED.engagement_rate,
       impressions = EXCLUDED.impressions,
       reach = EXCLUDED.reach,
       likes = EXCLUDED.likes,
       comments = EXCLUDED.comments,
       shares = EXCLUDED.shares,
       computed_at = NOW()`,
    [
      resolvedCopyId, briefingId, tenantId,
      roiScore, engRate,
      post.impressions || 0, post.reach || 0,
      post.likes_count || 0, post.comments_count || 0, post.shares_count || 0,
    ]
  );
}
```

> **Verificar conflito em `copy_roi_scores`:** a tabela pode ter constraint diferente. Ajustar o ON CONFLICT conforme o schema real da migration 0231.

---

## Passo 5 — Disparar o match em `clientPostsWorker.ts`

**Arquivo:** `apps/backend/src/jobs/clientPostsWorker.ts`

Após o worker sincronizar os posts do cliente, chamar o novo serviço de match:

```typescript
import { linkPublishedPostsToMetrics } from '../services/performanceLinkService';

// No final de runClientPostsWorkerOnce(), após sync:
for (const client of processedClients) {
  try {
    await linkPublishedPostsToMetrics(client.tenantId, client.clientId);
  } catch (err: any) {
    console.warn(`[clientPostsWorker] link metrics failed for ${client.clientId}:`, err.message);
  }
}
```

---

## Passo 6 — Atualizar `learningLoopService.ts`

**Arquivo:** `apps/backend/src/services/learningLoopService.ts`

Adicionar função que lê performance real por copy (via `copy_roi_scores` agora preenchido com dados reais):

```typescript
/**
 * Agrega performance real post-a-post por copy versão.
 * Lê copy_roi_scores que agora tem dados reais de post performance
 * (não apenas scores humanos).
 */
async function aggregatePostLevelPerformance(
  clientId: string,
  tenantId: string
): Promise<Array<{
  copy_text_preview: string;
  roi_score: number;
  engagement_rate: number;
  platform: string;
  briefing_payload: any;
}>> {
  const { rows } = await query(
    `SELECT
       ecv.output,
       crs.roi_score,
       crs.engagement_rate,
       bpm.platform,
       eb.payload as briefing_payload
     FROM copy_roi_scores crs
     JOIN edro_copy_versions ecv ON ecv.id = crs.copy_id
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     LEFT JOIN briefing_post_metrics bpm ON bpm.briefing_id = eb.id
       AND bpm.post_id IS NOT NULL
     WHERE eb.client_id = $1
       AND ecv.tenant_id = $2
       AND crs.computed_at > NOW() - INTERVAL '180 days'
       AND bpm.match_source = 'platform_post_id'  -- somente matches reais, não por data
     ORDER BY crs.roi_score DESC
     LIMIT 50`,
    [clientId, tenantId]
  );

  return rows.map(r => ({
    copy_text_preview: (r.output || '').slice(0, 200),
    roi_score: r.roi_score,
    engagement_rate: Number(r.engagement_rate),
    platform: r.platform,
    briefing_payload: r.briefing_payload,
  }));
}
```

**Integrar em `rebuildClientPreferences()`:**

```typescript
// Dentro de rebuildClientPreferences(), após aggregateCopyFeedback():
const postLevelPerformance = await aggregatePostLevelPerformance(clientId, tenantId);

// Adicionar os dados reais de performance ao preferences payload:
const realPerformanceAngles = postLevelPerformance
  .filter(p => p.roi_score >= 70)
  .map(p => p.copy_text_preview.slice(0, 60));

const realAntiPatterns = postLevelPerformance
  .filter(p => p.roi_score < 30)
  .map(p => p.copy_text_preview.slice(0, 60));

// Mesclar com os dados existentes (human scores + platform trends):
preferences.top_angles = [
  ...new Set([...realPerformanceAngles, ...(preferences.top_angles || [])]),
].slice(0, 10);

preferences.anti_patterns = [
  ...new Set([...realAntiPatterns, ...(preferences.anti_patterns || [])]),
].slice(0, 10);

preferences.has_real_performance_data = postLevelPerformance.length > 0;
preferences.real_performance_sample_size = postLevelPerformance.length;
```

---

## O que fecha com isso

```
ANTES
─────
Post publicado → postId descartado
Reportei sync → métricas genéricas por plataforma
Learning loop → "Instagram > LinkedIn em geral"
Geração → copy genérico com dicas de plataforma

DEPOIS
──────
Post publicado → postId salvo ✓
clientPostsWorker → external_id coletado ✓
performanceLinkService → match postId ↔ external_id ✓
briefing_post_metrics → post_id preenchido ✓
copy_roi_scores → ROI real por copy ✓
Learning loop → "ângulo X gerou 4.2% save rate, ângulo Y 1.1%" ✓
Geração → copy baseado em o que realmente performou para este cliente ✓
```

---

## Ordem de implementação para o Codex

1. **Migration `0337_platform_post_ids.sql`** — base de tudo
2. **`publishWorker.ts`** — capturar postId (mais crítico, maior volume)
3. **`scheduledPublicationsWorker.ts`** — idem
4. **`webhooks.ts`** — capturar do callback Meta/TikTok
5. **`performanceLinkService.ts`** — criar serviço de match (novo arquivo)
6. **`clientPostsWorker.ts`** — disparar match após sync
7. **`learningLoopService.ts`** — adicionar `aggregatePostLevelPerformance()` + integrar em `rebuildClientPreferences()`

---

## Resultado final para o sistema de geração

Após essa implementação, o `generateAndSelectBestCopy()` (copy pipeline spec) passa a contar com:

- `copy_roi_scores` preenchido com **performance real** (não apenas scores humanos)
- `copy_performance_preferences` com **ângulos provados por dados reais**
- Simulador calibrado não só por campanhas, mas também por posts editoriais
- Learning loop que diz: *"para este cliente, ângulos de prova social com dado específico geram 3× mais saves que ângulos emocionais"*
