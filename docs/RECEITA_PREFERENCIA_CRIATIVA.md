# Receita Completa — Motor de Preferência Criativa (TAREFAS 13 e 14)

> **Para o Codex**: este documento descreve o sistema de aprendizado por preferência da Edro — o mecanismo que transforma cada decisão humana em inteligência que melhora futuras gerações. Leia completamente antes de começar.

---

## A visão central

A plataforma tem dois momentos de decisão humana:

```
Pauta Inbox    →  "Vale criar isso?"    →  Inteligência Editorial
Studio (copy)  →  "É assim que diz?"   →  Inteligência Criativa
```

Ambos usam o mesmo mecanismo de aprendizado. Ambos alimentam o mesmo lugar: o **Perfil do Cliente**. Com o tempo, o Perfil acumula uma memória editorial e criativa que nenhum concorrente consegue replicar — porque foi construída com as decisões reais desta agência, para estes clientes.

```
Pauta Inbox feedback  ──┐
                        ├──►  Perfil do Cliente  ──►  Geração mais inteligente
Studio copy feedback  ──┘     (memória viva)          em ambas as superfícies
```

---

## Contexto técnico obrigatório

- **Backend**: Hono.js, TypeScript, PostgreSQL, node-postgres
- **Frontend**: Next.js 15, React 19, MUI v7, Tabler Icons
- **AI services**: `apps/backend/src/services/ai/copyOrchestrator.ts`
- **Rotas existentes**: `apps/backend/src/routes/clients.ts`, `apps/backend/src/routes/edro.ts`
- **Perfil do cliente**: `apps/backend/src/services/clientEnrichmentService.ts` (TAREFA 12)
- **Pauta Inbox (frontend)**: `apps/web/app/briefings/` (substituindo a página atual de Edro Briefings)
- **Studio**: `apps/web/app/studio/editor/EditorClient.tsx`
- **Deploy backend**: `railway up --service edro-backend --detach`
- **Deploy frontend**: `railway up --service edro-web --detach`

---

## PARTE 1 — Banco de Dados

### Migration: `0131_preference_feedback.sql`

**Arquivo a criar**: `apps/backend/src/db/migrations/0131_preference_feedback.sql`

```sql
-- Tabela central de feedback de preferência
CREATE TABLE IF NOT EXISTS preference_feedback (
  id          TEXT PRIMARY KEY DEFAULT 'pfb_' || gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Tipo de feedback e ação
  feedback_type  TEXT NOT NULL CHECK (feedback_type IN ('pauta', 'copy')),
  action         TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'approved_after_edit')),

  -- Motivos de rejeição (tags selecionadas + texto livre)
  rejection_tags    TEXT[],
  rejection_reason  TEXT,         -- texto livre opcional

  -- Instrução de regeneração (quando rejeitado e regenerado)
  regeneration_instruction  TEXT,
  regeneration_count        INTEGER DEFAULT 0,

  -- Metadados para feedback de PAUTA
  pauta_id                TEXT,
  pauta_source_type       TEXT,   -- 'clipping' | 'calendar' | 'opportunity'
  pauta_source_domain     TEXT,   -- ex: 'g1.com'
  pauta_topic_category    TEXT,
  pauta_approach          TEXT,   -- 'institutional' | 'thought_leadership' | 'news_response' etc
  pauta_platforms         TEXT[],
  pauta_timing_days       INTEGER, -- dias entre sugestão e evento
  pauta_ai_score          NUMERIC,

  -- Metadados para feedback de COPY
  copy_briefing_id    TEXT,
  copy_rejected_text  TEXT,
  copy_approved_text  TEXT,
  copy_platform       TEXT,
  copy_format         TEXT,
  copy_pipeline       TEXT,
  copy_task_type      TEXT,
  copy_tone           TEXT,

  -- Performance real (preenchido depois via Reportei sync)
  performance_score       NUMERIC,   -- engagement normalizado 0-100
  performance_synced_at   TIMESTAMPTZ,
  performance_vs_average  NUMERIC,   -- % acima/abaixo da média do cliente

  -- Auditoria
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries do motor de preferência
CREATE INDEX IF NOT EXISTS idx_pref_client_type
  ON preference_feedback(client_id, feedback_type, action);

CREATE INDEX IF NOT EXISTS idx_pref_tenant_created
  ON preference_feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pref_pauta_category
  ON preference_feedback(client_id, pauta_topic_category, action);

CREATE INDEX IF NOT EXISTS idx_pref_copy_platform
  ON preference_feedback(client_id, copy_platform, action);

-- Tabela de sugestões de pauta geradas pela IA
CREATE TABLE IF NOT EXISTS pauta_suggestions (
  id          TEXT PRIMARY KEY DEFAULT 'psg_' || gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Conteúdo da sugestão
  title        TEXT NOT NULL,
  approach_a   JSONB,   -- primeira abordagem {angle, message, platforms[], tone}
  approach_b   JSONB,   -- segunda abordagem (comparação pareada)

  -- Origem
  source_type    TEXT,   -- 'clipping' | 'calendar' | 'opportunity'
  source_id      TEXT,
  source_domain  TEXT,
  source_text    TEXT,   -- resumo do clipping/evento

  -- Scores e metadados
  ai_score           NUMERIC,
  topic_category     TEXT,
  suggested_deadline DATE,
  platforms          TEXT[],

  -- Status
  status      TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),

  -- Referência ao briefing criado (quando aprovado)
  briefing_id TEXT,

  -- Auditoria
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_psg_client_status
  ON pauta_suggestions(client_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_psg_tenant_pending
  ON pauta_suggestions(tenant_id, status) WHERE status = 'pending';
```

---

## PARTE 2 — Motor de Preferência (Backend Service)

### Arquivo a criar: `apps/backend/src/services/preferenceEngine.ts`

```typescript
import { db } from '../db/db';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type PreferenceContext = {
  // Para geração de PAUTAS
  editorial: {
    approved_sources: Array<{ domain: string; approval_rate: number }>;
    approved_categories: Array<{ category: string; approval_rate: number }>;
    rejected_categories: Array<{ category: string; rejection_count: number }>;
    cooldown_topics: string[];          // tópicos rejeitados recentemente
    preferred_approaches: string[];     // approaches mais aprovados
    preferred_platforms: string[];
    ideal_timing_days: number;          // média de antecedência aprovada
    approval_rate_30d: number;
  };

  // Para geração de COPY
  creative: {
    good_copy_examples: string[];       // últimas 5 copies aprovadas (texto)
    bad_copy_examples: string[];        // últimas 5 copies rejeitadas (texto)
    common_rejection_tags: string[];    // tags de rejeição mais frequentes
    preferred_tone: string | null;
    preferred_length: 'short' | 'medium' | 'long' | null;
    platform_patterns: Array<{
      platform: string;
      approval_rate: number;
      avg_length: number;
    }>;
    approval_rate_30d: number;
  };

  // Meta
  total_feedback_count: number;
  learning_maturity: 'bootstrapping' | 'learning' | 'calibrated' | 'expert';
  // bootstrapping: <20 feedbacks | learning: 20-100 | calibrated: 100-500 | expert: 500+
};

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────

export async function getClientPreferenceContext(
  clientId: string,
  tenantId: string
): Promise<PreferenceContext> {

  const [editorialData, creativeData, totalCount] = await Promise.all([
    getEditorialPreferences(clientId),
    getCreativePreferences(clientId),
    getTotalFeedbackCount(clientId),
  ]);

  return {
    editorial: editorialData,
    creative: creativeData,
    total_feedback_count: totalCount,
    learning_maturity: classifyMaturity(totalCount),
  };
}

// ─── PREFERÊNCIAS EDITORIAIS ──────────────────────────────────────────────────

async function getEditorialPreferences(clientId: string) {
  // Aprovação por fonte (últimos 90 dias)
  const sourceStats = await db.query(`
    SELECT
      pauta_source_domain as domain,
      COUNT(*) FILTER (WHERE action = 'approved') as approved,
      COUNT(*) as total
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'pauta'
      AND created_at > NOW() - INTERVAL '90 days'
      AND pauta_source_domain IS NOT NULL
    GROUP BY pauta_source_domain
    HAVING COUNT(*) >= 3
    ORDER BY (COUNT(*) FILTER (WHERE action = 'approved')::float / COUNT(*)) DESC
    LIMIT 10
  `, [clientId]);

  // Aprovação por categoria (últimos 90 dias)
  const categoryStats = await db.query(`
    SELECT
      pauta_topic_category as category,
      COUNT(*) FILTER (WHERE action = 'approved') as approved,
      COUNT(*) as total
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'pauta'
      AND created_at > NOW() - INTERVAL '90 days'
      AND pauta_topic_category IS NOT NULL
    GROUP BY pauta_topic_category
    ORDER BY approved DESC
  `, [clientId]);

  // Tópicos em cooldown (rejeitados nos últimos 14 dias)
  const cooldownTopics = await db.query(`
    SELECT DISTINCT pauta_topic_category
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'pauta'
      AND action = 'rejected'
      AND created_at > NOW() - INTERVAL '14 days'
      AND pauta_topic_category IS NOT NULL
  `, [clientId]);

  // Taxa de aprovação últimos 30 dias
  const approvalRate = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE action = 'approved')::float / NULLIF(COUNT(*), 0) as rate
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'pauta'
      AND created_at > NOW() - INTERVAL '30 days'
  `, [clientId]);

  // Timing ideal
  const timingData = await db.query(`
    SELECT AVG(pauta_timing_days) as avg_days
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'pauta'
      AND action = 'approved'
      AND pauta_timing_days IS NOT NULL
  `, [clientId]);

  return {
    approved_sources: sourceStats.rows.map(r => ({
      domain: r.domain,
      approval_rate: parseFloat(r.approved) / parseFloat(r.total),
    })),
    approved_categories: categoryStats.rows
      .filter(r => parseInt(r.approved) > 0)
      .map(r => ({
        category: r.category,
        approval_rate: parseFloat(r.approved) / parseFloat(r.total),
      })),
    rejected_categories: categoryStats.rows
      .filter(r => parseInt(r.approved) === 0)
      .map(r => ({ category: r.category, rejection_count: parseInt(r.total) })),
    cooldown_topics: cooldownTopics.rows.map(r => r.pauta_topic_category),
    preferred_approaches: [],       // TODO: extrair do pauta_approach
    preferred_platforms: [],        // TODO: extrair do pauta_platforms
    ideal_timing_days: timingData.rows[0]?.avg_days
      ? Math.round(timingData.rows[0].avg_days)
      : 5,
    approval_rate_30d: approvalRate.rows[0]?.rate
      ? parseFloat(approvalRate.rows[0].rate)
      : 0,
  };
}

// ─── PREFERÊNCIAS CRIATIVAS ───────────────────────────────────────────────────

async function getCreativePreferences(clientId: string) {
  // Últimas copies aprovadas (para good_copy_examples)
  const approvedCopies = await db.query(`
    SELECT copy_approved_text, copy_platform, copy_format
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'copy'
      AND action IN ('approved', 'approved_after_edit')
      AND copy_approved_text IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
  `, [clientId]);

  // Últimas copies rejeitadas
  const rejectedCopies = await db.query(`
    SELECT copy_rejected_text, rejection_tags, rejection_reason
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'copy'
      AND action = 'rejected'
      AND copy_rejected_text IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
  `, [clientId]);

  // Tags de rejeição mais frequentes
  const rejectionTags = await db.query(`
    SELECT
      unnest(rejection_tags) as tag,
      COUNT(*) as count
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'copy'
      AND action = 'rejected'
      AND rejection_tags IS NOT NULL
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 5
  `, [clientId]);

  // Performance por plataforma
  const platformStats = await db.query(`
    SELECT
      copy_platform as platform,
      COUNT(*) FILTER (WHERE action IN ('approved', 'approved_after_edit')) as approved,
      COUNT(*) as total,
      AVG(LENGTH(copy_approved_text)) FILTER (WHERE copy_approved_text IS NOT NULL) as avg_length
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'copy'
      AND copy_platform IS NOT NULL
    GROUP BY copy_platform
  `, [clientId]);

  // Taxa de aprovação últimos 30 dias
  const approvalRate = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE action IN ('approved', 'approved_after_edit'))::float /
      NULLIF(COUNT(*), 0) as rate
    FROM preference_feedback
    WHERE client_id = $1
      AND feedback_type = 'copy'
      AND created_at > NOW() - INTERVAL '30 days'
  `, [clientId]);

  return {
    good_copy_examples: approvedCopies.rows
      .map(r => r.copy_approved_text)
      .filter(Boolean),
    bad_copy_examples: rejectedCopies.rows
      .map(r => r.copy_rejected_text)
      .filter(Boolean),
    common_rejection_tags: rejectionTags.rows.map(r => r.tag),
    preferred_tone: null,   // TODO: extrair padrão de copies aprovadas
    preferred_length: null, // TODO: calcular a partir de avg_length
    platform_patterns: platformStats.rows.map(r => ({
      platform: r.platform,
      approval_rate: parseFloat(r.approved) / parseFloat(r.total),
      avg_length: Math.round(r.avg_length || 0),
    })),
    approval_rate_30d: approvalRate.rows[0]?.rate
      ? parseFloat(approvalRate.rows[0].rate)
      : 0,
  };
}

async function getTotalFeedbackCount(clientId: string): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM preference_feedback WHERE client_id = $1`,
    [clientId]
  );
  return parseInt(result.rows[0]?.count || '0');
}

function classifyMaturity(count: number): PreferenceContext['learning_maturity'] {
  if (count < 20) return 'bootstrapping';
  if (count < 100) return 'learning';
  if (count < 500) return 'calibrated';
  return 'expert';
}

// ─── MONTAR CONTEXTO PARA PROMPT ─────────────────────────────────────────────

export function buildPreferencePromptBlock(ctx: PreferenceContext): string {
  const parts: string[] = [];

  if (ctx.learning_maturity === 'bootstrapping') {
    parts.push('MEMÓRIA CRIATIVA: Em aprendizado inicial — preferências ainda sendo calibradas.');
    return parts.join('\n');
  }

  if (ctx.editorial.cooldown_topics.length > 0) {
    parts.push(`TÓPICOS EM COOLDOWN (evitar sugerir): ${ctx.editorial.cooldown_topics.join(', ')}`);
  }

  if (ctx.creative.good_copy_examples.length > 0) {
    parts.push(`COPIES APROVADAS RECENTEMENTE (use como referência de estilo):\n${
      ctx.creative.good_copy_examples.map(e => `- "${e.slice(0, 200)}${e.length > 200 ? '...' : ''}"`).join('\n')
    }`);
  }

  if (ctx.creative.bad_copy_examples.length > 0) {
    parts.push(`COPIES REJEITADAS RECENTEMENTE (nunca use como modelo):\n${
      ctx.creative.bad_copy_examples.map(e => `- "${e.slice(0, 150)}${e.length > 150 ? '...' : ''}"`).join('\n')
    }`);
  }

  if (ctx.creative.common_rejection_tags.length > 0) {
    parts.push(`PADRÕES FREQUENTEMENTE REJEITADOS: ${ctx.creative.common_rejection_tags.join(', ')}`);
  }

  return parts.filter(Boolean).join('\n\n');
}
```

---

## PARTE 3 — TAREFA 13: Pauta Inbox

### 3.1 — Geração automática de sugestões

**Arquivo a criar**: `apps/backend/src/services/pautaSuggestionService.ts`

```typescript
import { db } from '../db/db';
import { getClientPreferenceContext, buildPreferencePromptBlock } from './preferenceEngine';
import { callProvider } from './ai/copyOrchestrator';
import { queueService } from './queueService';

export async function generatePautaSuggestions(params: {
  client_id: string;
  tenant_id: string;
  sources: Array<{ type: string; id: string; title: string; summary: string; domain?: string; date?: string; score?: number }>;
}): Promise<void> {

  const { client_id, tenant_id } = params;

  // Buscar perfil do cliente + contexto de preferência
  const [clientResult, preferenceCtx] = await Promise.all([
    db.query(
      `SELECT name, segment_primary, profile FROM clients WHERE id = $1 AND tenant_id = $2`,
      [client_id, tenant_id]
    ),
    getClientPreferenceContext(client_id, tenant_id),
  ]);

  const client = clientResult.rows[0];
  if (!client) return;

  const profile = client.profile || {};
  const preferenceBlock = buildPreferencePromptBlock(preferenceCtx);

  for (const source of params.sources) {
    // Verificar cooldown — não sugerir tópicos rejeitados recentemente
    const isInCooldown = preferenceCtx.editorial.cooldown_topics.some(
      topic => source.summary?.toLowerCase().includes(topic.toLowerCase())
    );
    if (isInCooldown) continue;

    try {
      // Gemini gera duas abordagens distintas para comparação pareada
      const result = await callProvider('gemini', {
        prompt: `Você é um estrategista de conteúdo. Com base na oportunidade abaixo, crie DUAS abordagens distintas de pauta.

As abordagens devem ser diferentes em ângulo e execução — não variações do mesmo tema.

Retorne APENAS JSON válido:
{
  "topic_category": "categoria do tema (ex: Logística, Inovação, Institucional)",
  "suggested_deadline": "YYYY-MM-DD",
  "approach_a": {
    "angle": "nome do ângulo (ex: Protagonismo, Thought Leadership, Notícia)",
    "title": "título da pauta",
    "message": "mensagem principal em 1-2 frases",
    "tone": "tom sugerido",
    "platforms": ["plataforma1", "plataforma2"],
    "why": "por que este ângulo faz sentido"
  },
  "approach_b": {
    "angle": "nome do ângulo alternativo",
    "title": "título alternativo",
    "message": "mensagem alternativa",
    "tone": "tom alternativo",
    "platforms": ["plataforma1"],
    "why": "por que este ângulo alternativo faz sentido"
  }
}

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary}
PILARES: ${(profile.pillars || []).join(', ')}

OPORTUNIDADE:
Fonte: ${source.domain || source.type}
Título: ${source.title}
Resumo: ${source.summary}

${preferenceBlock ? `HISTÓRICO DE PREFERÊNCIAS:\n${preferenceBlock}` : ''}`,
        temperature: 0.4,
      });

      const parsed = safeParseJson(result.text);
      if (!parsed) continue;

      // Salvar sugestão
      await db.query(`
        INSERT INTO pauta_suggestions (
          tenant_id, client_id, title,
          approach_a, approach_b,
          source_type, source_id, source_domain, source_text,
          ai_score, topic_category, suggested_deadline, platforms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        tenant_id, client_id,
        parsed.approach_a?.title || source.title,
        JSON.stringify(parsed.approach_a),
        JSON.stringify(parsed.approach_b),
        source.type, source.id, source.domain, source.summary,
        source.score || 7.0,
        parsed.topic_category,
        parsed.suggested_deadline,
        JSON.stringify([
          ...(parsed.approach_a?.platforms || []),
          ...(parsed.approach_b?.platforms || []),
        ].filter((v, i, a) => a.indexOf(v) === i)),
      ]);

    } catch (e) { console.error('[pauta-suggestion]', e); }
  }
}

function safeParseJson(text: string): any {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {}
  return null;
}
```

---

### 3.2 — Endpoints do Pauta Inbox

**Arquivo a modificar**: `apps/backend/src/routes/` → criar `apps/backend/src/routes/pautaInbox.ts`

```typescript
import { Hono } from 'hono';
import { db } from '../db/db';
import { preferenceEngine } from '../services/preferenceEngine';
import { queueService } from '../services/queueService';

const router = new Hono();

// GET /pauta-inbox — lista sugestões pendentes do tenant (agrupadas por cliente)
router.get('/', tenantGuard, async (req, res) => {
  const suggestions = await db.query(`
    SELECT
      ps.*,
      c.name as client_name,
      c.profile->>'tone_profile' as client_tone
    FROM pauta_suggestions ps
    JOIN clients c ON c.id = ps.client_id
    WHERE ps.tenant_id = $1
      AND ps.status = 'pending'
      AND ps.expires_at > NOW()
    ORDER BY ps.ai_score DESC, ps.generated_at DESC
    LIMIT 50
  `, [req.tenant.id]);

  res.json({ suggestions: suggestions.rows });
});

// POST /pauta-inbox/:id/approve — aprovar abordagem A ou B
router.post('/:id/approve', tenantGuard, async (req, res) => {
  const { id } = req.params;
  const { approach, send_to_studio, queue_for_later } = req.body;
  // approach: 'a' | 'b'

  const suggestion = await db.query(
    `SELECT * FROM pauta_suggestions WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenant.id]
  );
  if (!suggestion.rows[0]) return res.status(404).json({ error: 'not found' });

  const s = suggestion.rows[0];
  const approvedApproach = approach === 'a' ? s.approach_a : s.approach_b;
  const rejectedApproach = approach === 'a' ? s.approach_b : s.approach_a;

  // Registrar feedback
  await db.query(`
    INSERT INTO preference_feedback (
      tenant_id, client_id, feedback_type, action,
      pauta_id, pauta_source_type, pauta_source_domain,
      pauta_topic_category, pauta_approach, pauta_platforms,
      pauta_ai_score, created_by
    ) VALUES ($1, $2, 'pauta', 'approved', $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    req.tenant.id, s.client_id, id,
    s.source_type, s.source_domain,
    s.topic_category, approvedApproach?.angle,
    approvedApproach?.platforms,
    s.ai_score, req.user?.id,
  ]);

  // Marcar a abordagem rejeitada também (sinal negativo)
  if (rejectedApproach) {
    await db.query(`
      INSERT INTO preference_feedback (
        tenant_id, client_id, feedback_type, action,
        pauta_id, pauta_source_type, pauta_topic_category, pauta_approach
      ) VALUES ($1, $2, 'pauta', 'rejected', $3, $4, $5, $6)
    `, [req.tenant.id, s.client_id, id, s.source_type, s.topic_category, rejectedApproach?.angle]);
  }

  // Atualizar status da sugestão
  await db.query(
    `UPDATE pauta_suggestions SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
    [id]
  );

  // Montar URL do Studio com brief pré-preenchido
  const studioUrl = send_to_studio ? buildStudioUrl(s, approvedApproach) : null;

  res.json({ success: true, studio_url: studioUrl });
});

// POST /pauta-inbox/:id/reject — rejeitar com motivo
router.post('/:id/reject', tenantGuard, async (req, res) => {
  const { id } = req.params;
  const { tags, reason } = req.body;

  const suggestion = await db.query(
    `SELECT * FROM pauta_suggestions WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenant.id]
  );
  if (!suggestion.rows[0]) return res.status(404).json({ error: 'not found' });

  const s = suggestion.rows[0];

  await db.query(`
    INSERT INTO preference_feedback (
      tenant_id, client_id, feedback_type, action,
      pauta_id, pauta_source_type, pauta_source_domain,
      pauta_topic_category, rejection_tags, rejection_reason,
      pauta_ai_score, created_by
    ) VALUES ($1, $2, 'pauta', 'rejected', $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    req.tenant.id, s.client_id, id,
    s.source_type, s.source_domain,
    s.topic_category, tags, reason,
    s.ai_score, req.user?.id,
  ]);

  await db.query(
    `UPDATE pauta_suggestions SET status = 'rejected', reviewed_at = NOW() WHERE id = $1`,
    [id]
  );

  res.json({ success: true });
});

function buildStudioUrl(suggestion: any, approach: any): string {
  const params = new URLSearchParams({
    clientId: suggestion.client_id,
    title: approach?.title || suggestion.title || '',
    event: approach?.title || '',
    objective: mapAngleToObjective(approach?.angle),
    tone: approach?.tone || '',
    message: approach?.message || '',
    source: suggestion.source_type || 'pauta_inbox',
    sourceId: suggestion.id,
  });
  return `/studio?${params.toString()}`;
}

function mapAngleToObjective(angle: string): string {
  const map: Record<string, string> = {
    'Protagonismo': 'Reconhecimento de Marca',
    'Thought Leadership': 'Reconhecimento de Marca',
    'Notícia': 'Engajamento',
    'Conversão': 'Conversao',
    'Institucional': 'Reconhecimento de Marca',
  };
  return map[angle] || 'Engajamento';
}

export default router;
```

---

### 3.3 — Frontend: Página Pauta Inbox

**Arquivo a modificar**: `apps/web/app/briefings/page.tsx` (substituir conteúdo atual)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import { IconInbox, IconSparkles, IconCheck, IconX, IconEdit } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import PautaComparisonCard from './PautaComparisonCard';
import RejectionReasonPicker from './RejectionReasonPicker';

export default function PautaInboxPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const load = async () => {
    const res = await apiGet('/pauta-inbox');
    setSuggestions(res.suggestions || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = suggestions.reduce((acc, s) => {
    if (!acc[s.client_id]) acc[s.client_id] = { name: s.client_name, items: [] };
    acc[s.client_id].items.push(s);
    return acc;
  }, {} as Record<string, { name: string; items: any[] }>);

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconInbox size={24} color="#ff6600" />
          <Typography variant="h5" fontWeight={700}>Pauta Inbox</Typography>
          {suggestions.length > 0 && (
            <Chip size="small" label={suggestions.length}
              sx={{ bgcolor: '#ff6600', color: 'white', fontWeight: 700 }} />
          )}
        </Stack>
        <Button variant="outlined" href="/studio"
          sx={{ borderColor: '#ff6600', color: '#ff6600', textTransform: 'none' }}>
          + Nova pauta manual
        </Button>
      </Stack>

      {suggestions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <IconSparkles size={40} color="#94a3b8" style={{ marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma sugestão pendente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A IA monitora clipping e calendário dos seus clientes
              e traz sugestões aqui quando encontra oportunidades.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([clientId, group]: [string, any]) => (
          <Box key={clientId} sx={{ mb: 4 }}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              {group.name} · {group.items.length} sugestão{group.items.length > 1 ? 'ões' : ''}
            </Typography>

            {group.items.map((suggestion: any) => (
              <Box key={suggestion.id}>
                <PautaComparisonCard
                  suggestion={suggestion}
                  onApprove={async (approach) => {
                    await apiPost(`/pauta-inbox/${suggestion.id}/approve`, {
                      approach,
                      send_to_studio: true,
                    }).then(res => {
                      if (res.studio_url) window.location.href = res.studio_url;
                      load();
                    });
                  }}
                  onApproveToQueue={async (approach) => {
                    await apiPost(`/pauta-inbox/${suggestion.id}/approve`, {
                      approach,
                      queue_for_later: true,
                    });
                    load();
                  }}
                  onReject={() => setRejectingId(suggestion.id)}
                />

                {/* Picker de motivo de rejeição */}
                <Collapse in={rejectingId === suggestion.id}>
                  <RejectionReasonPicker
                    type="pauta"
                    onConfirm={async ({ tags, reason }) => {
                      await apiPost(`/pauta-inbox/${suggestion.id}/reject`, { tags, reason });
                      setRejectingId(null);
                      load();
                    }}
                    onCancel={() => setRejectingId(null)}
                  />
                </Collapse>
              </Box>
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
```

---

### 3.4 — Componente: PautaComparisonCard

**Arquivo a criar**: `apps/web/app/briefings/PautaComparisonCard.tsx`

```tsx
'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { IconFlame, IconArrowRight, IconCalendar, IconWorld } from '@tabler/icons-react';

type Props = {
  suggestion: any;
  onApprove: (approach: 'a' | 'b') => void;
  onApproveToQueue: (approach: 'a' | 'b') => void;
  onReject: () => void;
};

export default function PautaComparisonCard({ suggestion, onApprove, onApproveToQueue, onReject }: Props) {
  const a = suggestion.approach_a;
  const b = suggestion.approach_b;
  const isHot = suggestion.ai_score >= 8.5;

  return (
    <Card sx={{ mb: 2, borderColor: isHot ? 'rgba(255,102,0,0.3)' : 'divider' }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          {isHot && <IconFlame size={16} color="#ff6600" />}
          <Typography variant="caption" color="text.secondary">
            {suggestion.client_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <IconWorld size={12} color="#94a3b8" />
          <Typography variant="caption" color="text.secondary">
            {suggestion.source_domain || suggestion.source_type}
          </Typography>
          {suggestion.suggested_deadline && (
            <>
              <Typography variant="caption" color="text.secondary">·</Typography>
              <IconCalendar size={12} color="#94a3b8" />
              <Typography variant="caption" color="text.secondary">
                Deadline sugerido: {new Date(suggestion.suggested_deadline).toLocaleDateString('pt-BR')}
              </Typography>
            </>
          )}
          <Chip size="small" label={`Score ${suggestion.ai_score?.toFixed(1)}`}
            sx={{ ml: 'auto', fontSize: '0.6rem', height: 18,
                  bgcolor: isHot ? 'rgba(255,102,0,0.1)' : 'action.hover',
                  color: isHot ? '#ff6600' : 'text.secondary' }} />
        </Stack>

        {/* Resumo da fonte */}
        {suggestion.source_text && (
          <Typography variant="body2" color="text.secondary"
            sx={{ mb: 2, fontSize: '0.8rem', fontStyle: 'italic',
                  borderLeft: '3px solid', borderColor: 'divider', pl: 1.5 }}>
            {suggestion.source_text.slice(0, 180)}...
          </Typography>
        )}

        {/* Comparação pareada A vs B */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {[
            { key: 'a' as const, data: a, label: 'Abordagem A' },
            { key: 'b' as const, data: b, label: 'Abordagem B' },
          ].map(({ key, data, label }) => (
            <Box key={key} sx={{ flex: 1, p: 2, borderRadius: 2,
              border: '1px solid', borderColor: 'divider',
              bgcolor: 'rgba(0,0,0,0.01)', position: 'relative' }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {label}
                </Typography>
                <Chip size="small" label={data?.angle}
                  sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'action.hover' }} />
              </Stack>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                {data?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1.5 }}>
                {data?.message}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {data?.platforms?.map((p: string) => (
                  <Chip key={p} size="small" label={p} sx={{ fontSize: '0.6rem', height: 18 }} />
                ))}
              </Stack>
              <Stack spacing={0.75}>
                <Button fullWidth size="small" variant="contained"
                  onClick={() => onApprove(key)}
                  startIcon={<IconArrowRight size={12} />}
                  sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' },
                        textTransform: 'none', fontSize: '0.75rem' }}>
                  Aprovar e criar agora
                </Button>
                <Button fullWidth size="small" variant="outlined"
                  onClick={() => onApproveToQueue(key)}
                  sx={{ borderColor: 'divider', color: 'text.secondary',
                        textTransform: 'none', fontSize: '0.7rem' }}>
                  Aprovar para fila
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ mb: 1.5 }} />
        <Button size="small" variant="text" onClick={onReject}
          sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}>
          Nenhuma serve — rejeitar sugestão
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## PARTE 4 — TAREFA 14: Creative Memory no Studio

### 4.1 — Comparação pareada de copy

**Arquivo a modificar**: `apps/web/app/studio/editor/EditorClient.tsx`

Substituir a exibição de 3 opções em lista por comparação pareada (2 a 2):

```tsx
// Estado adicional
const [comparisonMode, setComparisonMode] = useState(true); // padrão: comparação pareada
const [comparisonPair, setComparisonPair] = useState<[number, number]>([0, 1]);
const [rejectingCopy, setRejectingCopy] = useState(false);
const [regenerationCount, setRegenerationCount] = useState(0);

// Componente de comparação (dentro do EditorClient):
{comparisonMode && copyOptions.length >= 2 ? (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
      Qual abordagem representa melhor a marca?
    </Typography>

    {/* Par A vs B lado a lado */}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      {comparisonPair.map((optionIdx, side) => {
        const option = copyOptions[optionIdx];
        const score = qualityScores?.[optionIdx];

        return (
          <Card key={optionIdx} sx={{ flex: 1, cursor: 'pointer',
            border: '2px solid', borderColor: 'divider',
            '&:hover': { borderColor: '#ff6600' }, transition: 'border-color 0.15s' }}
            onClick={() => handleCopySelected(optionIdx)}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Opção {side === 0 ? 'A' : 'B'}
                </Typography>
                {score && (
                  <Chip size="small" label={`${score.overall.toFixed(1)}/10`}
                    sx={{ fontSize: '0.65rem',
                          bgcolor: score.overall >= 8.5 ? '#dcfce7' : '#fef9c3',
                          color: score.overall >= 8.5 ? '#16a34a' : '#854d0e' }} />
                )}
              </Stack>

              {option.title && (
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  {option.title}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary"
                sx={{ fontSize: '0.8rem', mb: 1.5, display: '-webkit-box',
                      WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {option.body}
              </Typography>
              {option.cta && (
                <Typography variant="caption" sx={{ color: '#ff6600', fontWeight: 600 }}>
                  {option.cta}
                </Typography>
              )}

              <Button fullWidth variant="contained" size="small" sx={{ mt: 2,
                bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' }, textTransform: 'none' }}
                onClick={(e) => { e.stopPropagation(); handleCopySelected(optionIdx); }}>
                ← Esta é a melhor
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </Stack>

    {/* Ação: nenhuma serve */}
    <Box sx={{ textAlign: 'center' }}>
      {!rejectingCopy ? (
        <Button size="small" variant="text"
          onClick={() => setRejectingCopy(true)}
          sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}>
          Nenhuma representa a marca — rejeitar e regenerar
        </Button>
      ) : (
        <RejectionReasonPicker
          type="copy"
          regenerationCount={regenerationCount}
          maxRegenerations={2}
          onConfirm={async ({ tags, reason, instruction }) => {
            // Salvar feedback das 2 opções rejeitadas
            await saveCopyFeedback('rejected', comparisonPair, tags, reason);
            setRejectingCopy(false);

            if (regenerationCount < 2) {
              // Regenerar com a instrução do usuário
              setRegenerationCount(c => c + 1);
              await handleGenerate(instruction); // passa instrução extra
            } else {
              // Limite atingido — sugerir revisar briefing
              setShowRegenerationLimit(true);
            }
          }}
          onCancel={() => setRejectingCopy(false)}
        />
      )}
    </Box>
  </Box>
) : (
  // Fallback: visualização em lista (para quando há só 1 opção)
  <CopyList options={copyOptions} qualityScores={qualityScores} />
)}
```

---

### 4.2 — Salvar feedback de copy

**Função a adicionar ao EditorClient:**

```tsx
const saveCopyFeedback = async (
  action: 'approved' | 'rejected',
  optionIndices: number[],
  rejectionTags?: string[],
  rejectionReason?: string
) => {
  const feedbackPayload = optionIndices.map(idx => ({
    feedback_type: 'copy',
    action,
    rejection_tags: action === 'rejected' ? rejectionTags : undefined,
    rejection_reason: action === 'rejected' ? rejectionReason : undefined,
    copy_briefing_id: briefingId,
    copy_rejected_text: action === 'rejected' ? copyOptions[idx]?.body : undefined,
    copy_approved_text: action === 'approved' ? copyOptions[idx]?.body : undefined,
    copy_platform: activePlatform,
    copy_format: activeFormat,
    copy_pipeline: selectedPipeline,
  }));

  await Promise.all(feedbackPayload.map(payload =>
    apiPost(`/clients/${activeClientId}/copy-feedback`, payload)
  ));
};

// Ao selecionar uma opção (handleCopySelected):
const handleCopySelected = async (selectedIdx: number) => {
  const rejectedIndices = comparisonPair.filter(i => i !== selectedIdx);
  await saveCopyFeedback('approved', [selectedIdx]);
  await saveCopyFeedback('rejected', rejectedIndices);
  setSelectedOptionIdx(selectedIdx);
  setComparisonMode(false); // sai do modo comparação, mostra a selecionada
};
```

---

### 4.3 — RejectionReasonPicker (componente compartilhado)

**Arquivo a criar**: `apps/web/components/studio/RejectionReasonPicker.tsx`

```tsx
'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { IconRefresh } from '@tabler/icons-react';

const PAUTA_REJECTION_TAGS = [
  'Já fizemos este tema recentemente',
  'Não é prioridade agora',
  'Tom / abordagem não combina',
  'Evento passou ou perdeu relevância',
  'Fonte não é confiável',
  'Concorrente abordou melhor',
];

const COPY_REJECTION_TAGS = [
  'Muito genérica',
  'Tom não combina com a marca',
  'CTA fraco ou ausente',
  'Muito longa',
  'Muito curta',
  'Faltou personalidade',
  'Linguagem inadequada para o público',
  'Não representa os pilares da marca',
];

type Props = {
  type: 'pauta' | 'copy';
  regenerationCount?: number;
  maxRegenerations?: number;
  onConfirm: (data: { tags: string[]; reason: string; instruction?: string }) => void;
  onCancel: () => void;
};

export default function RejectionReasonPicker({
  type, regenerationCount = 0, maxRegenerations = 2, onConfirm, onCancel
}: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const tags = type === 'copy' ? COPY_REJECTION_TAGS : PAUTA_REJECTION_TAGS;
  const canRegenerate = type === 'copy' && regenerationCount < maxRegenerations;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Card sx={{ mt: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.01)' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          {type === 'copy' ? 'O que estava errado?' : 'Por que esta pauta não serve?'}
        </Typography>

        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          {tags.map(tag => (
            <FormControlLabel key={tag}
              control={
                <Checkbox size="small" checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  sx={{ py: 0.25, color: '#ff6600', '&.Mui-checked': { color: '#ff6600' } }} />
              }
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{tag}</Typography>}
            />
          ))}
        </Stack>

        {type === 'copy' && canRegenerate && (
          <TextField
            fullWidth size="small" multiline rows={2}
            placeholder="O que você gostaria diferente? (opcional — use linguagem natural)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}
          />
        )}

        {type === 'copy' && regenerationCount >= maxRegenerations && (
          <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
            Após 2 regenerações sem aprovação, o briefing pode precisar de mais contexto.
          </Alert>
        )}

        <Stack direction="row" spacing={1}>
          {canRegenerate ? (
            <Button size="small" variant="contained"
              disabled={selectedTags.length === 0 && !reason}
              onClick={() => onConfirm({ tags: selectedTags, reason, instruction: reason })}
              startIcon={<IconRefresh size={12} />}
              sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' },
                    textTransform: 'none', fontSize: '0.75rem' }}>
              Regenerar ({maxRegenerations - regenerationCount} restante{maxRegenerations - regenerationCount > 1 ? 's' : ''})
            </Button>
          ) : (
            <Button size="small" variant="contained"
              disabled={selectedTags.length === 0}
              onClick={() => onConfirm({ tags: selectedTags, reason })}
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' },
                    textTransform: 'none', fontSize: '0.75rem' }}>
              Confirmar rejeição
            </Button>
          )}
          <Button size="small" variant="text" onClick={onCancel}
            sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancelar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

---

## PARTE 5 — Capacidades Avançadas (Fase 2)

### 5.1 — Correlação com performance real (Reportei)

**Quando implementar**: após ter pelo menos 3 meses de dados de feedback.

**Arquivo a modificar**: `apps/backend/src/routes/clients.ts` (ou job de sync do Reportei)

Após sincronizar métricas do Reportei, retroalimentar copies aprovadas:

```typescript
// Job: sync-performance-feedback
// Para cada briefing concluído com métricas disponíveis no Reportei:
await db.query(`
  UPDATE preference_feedback
  SET
    performance_score = $1,
    performance_vs_average = $2,
    performance_synced_at = NOW()
  WHERE copy_briefing_id = $3
    AND feedback_type = 'copy'
    AND action IN ('approved', 'approved_after_edit')
`, [normalizedScore, vsAverage, briefingId]);
```

O `buildPreferencePromptBlock` pode então priorizar copies com **alto performance_score** nos exemplos passados para a IA.

---

### 5.2 — Detecção de deriva de marca

**Arquivo a criar**: `apps/backend/src/services/brandDriftDetector.ts`

```typescript
// Roda mensalmente via cron
export async function detectBrandDrift(clientId: string, tenantId: string) {
  // Comparar distribuição de tom nas copies aprovadas:
  // período atual (últimos 30d) vs período anterior (31-60d)
  // Se mudança > 20%, gerar alerta no cliente
}
```

---

### 5.3 — Aviso de saturação de tema

**Integrar ao `pautaSuggestionService.ts`**: antes de gerar sugestão, verificar saturação:

```typescript
const saturationCheck = await db.query(`
  SELECT COUNT(*) as count
  FROM preference_feedback
  WHERE client_id = $1
    AND pauta_topic_category = $2
    AND action = 'approved'
    AND created_at > NOW() - INTERVAL '30 days'
`, [clientId, topicCategory]);

if (parseInt(saturationCheck.rows[0].count) >= 4) {
  // Adicionar flag na sugestão: "tema potencialmente saturado"
}
```

---

### 5.4 — Previsão de qualidade do briefing

**Integrar ao `EditorClient.tsx`**: antes de gerar, verificar se o briefing tem campos críticos preenchidos com base no histórico de aprovação:

```typescript
// GET /clients/:id/briefing-quality-prediction
// Input: campos do briefing atual
// Output: { predicted_approval_rate, missing_fields[], warning }
```

---

### 5.5 — Bootstrap cross-client para clientes novos

**Integrar ao `getClientPreferenceContext`**: quando `total_feedback_count < 20`, buscar padrões de clientes com `segment_primary` igual:

```typescript
if (totalCount < 20) {
  // Buscar preferências de outros clientes do mesmo segmento
  // Usar como proxy até o cliente ter dados próprios
  const segmentCtx = await getSegmentPreferenceContext(segment, tenantId);
  return mergeContexts(ownCtx, segmentCtx, weight: 0.3); // 30% segmento, 70% próprio
}
```

---

### 5.6 — Calendário editorial inteligente

**Novo endpoint**: `GET /clients/:id/editorial-calendar-suggestion`

Retorna sugestão de 4 semanas baseada em:
- Aprovações históricas (padrões de timing)
- Datas estratégicas do cliente (TAREFA 12)
- Tópicos em cooldown (não repetir)
- Blind spots identificados
- Mix de conteúdo definido no perfil

---

## PARTE 6 — Integração com Perfil do Cliente

A Creative Memory alimenta automaticamente os campos mais críticos do Perfil (TAREFA 12), que hoje são manuais:

```
Feedback de copy aprovado  →  profile.good_copy_examples[]  (auto-preenchido)
Feedback de copy rejeitado →  profile.bad_copy_examples[]   (auto-preenchido)
Tags de rejeição frequentes → profile.negative_keywords[] (reforçado)
Abordagens aprovadas       →  editorial DNA acumulado
```

**Arquivo a modificar**: `apps/backend/src/routes/` → no endpoint de copy feedback, após salvar:

```typescript
// Sincronizar good/bad examples no perfil do cliente
await syncExamplesToProfile(clientId, tenantId);

async function syncExamplesToProfile(clientId: string, tenantId: string) {
  const approved = await db.query(`
    SELECT copy_approved_text FROM preference_feedback
    WHERE client_id = $1 AND feedback_type = 'copy'
      AND action IN ('approved', 'approved_after_edit')
      AND copy_approved_text IS NOT NULL
    ORDER BY created_at DESC LIMIT 5
  `, [clientId]);

  const rejected = await db.query(`
    SELECT copy_rejected_text FROM preference_feedback
    WHERE client_id = $1 AND feedback_type = 'copy'
      AND action = 'rejected' AND copy_rejected_text IS NOT NULL
    ORDER BY created_at DESC LIMIT 5
  `, [clientId]);

  await db.query(`
    UPDATE clients
    SET profile = jsonb_set(
      jsonb_set(profile, '{good_copy_examples}', $1::jsonb),
      '{bad_copy_examples}', $2::jsonb
    )
    WHERE id = $3 AND tenant_id = $4
  `, [
    JSON.stringify(approved.rows.map(r => r.copy_approved_text)),
    JSON.stringify(rejected.rows.map(r => r.copy_rejected_text)),
    clientId, tenantId,
  ]);
}
```

---

## Ordem de implementação recomendada

### Fase 1 — Fundação (implementar primeiro)
1. Migration `0131_preference_feedback.sql`
2. `preferenceEngine.ts` — queries + `buildPreferencePromptBlock`
3. Endpoint `POST /clients/:id/copy-feedback` — registrar feedback de copy
4. `RejectionReasonPicker.tsx` — componente compartilhado

### Fase 2 — Pauta Inbox
5. `pautaSuggestionService.ts` — geração de sugestões com comparação pareada
6. `pautaInbox.ts` — endpoints de listagem, aprovação, rejeição
7. `PautaInboxPage.tsx` e `PautaComparisonCard.tsx` — frontend
8. Atualizar nav: "Edro Briefings" → "Pauta Inbox"
9. Registrar job de geração no `queueService.ts`

### Fase 3 — Creative Memory no Studio
10. Modificar `EditorClient.tsx` — comparação pareada (2 opções)
11. `handleCopySelected` com `saveCopyFeedback`
12. Integração do `buildPreferencePromptBlock` no `copyService.ts`
13. `syncExamplesToProfile` após cada feedback de copy

### Fase 4 — Capacidades avançadas
14. Correlação com Reportei (`sync-performance-feedback`)
15. Detecção de deriva de marca (`brandDriftDetector`)
16. Aviso de saturação no `pautaSuggestionService`
17. Previsão de qualidade de briefing
18. Bootstrap cross-client para novos clientes
19. Sugestão de calendário editorial

---

## Notas finais para o Codex

- **A tabela `preference_feedback` é append-only** — nunca deletar registros, apenas marcar como superseded se necessário. É o histórico completo de decisões editoriais da agência.
- **O `buildPreferencePromptBlock` é injetado no `knowledgeBlock`** do `copyService.ts`, não é um prompt separado
- **Limite de regeneração**: máximo 2 rounds no Studio. Após isso, direcionar para revisar o briefing — não continuar gerando
- **Pauta Inbox não substitui o Kanban**: o Kanban continua sendo a visão de produção em andamento. O Inbox é pré-produção.
- **Não expor `preference_feedback` diretamente ao frontend** — sempre via `preferenceEngine.ts` como camada de abstração
- **Testar o build**: `cd apps/web && npx next build`
- **Deploy backend primeiro**: `railway up --service edro-backend --detach`
- **Deploy frontend**: `railway up --service edro-web --detach`
