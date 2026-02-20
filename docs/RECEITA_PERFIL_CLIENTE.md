# Receita Completa — Perfil do Cliente Always-On (TAREFA 12)

> **Para o Codex**: este documento descreve a implementação completa da aba Perfil inteligente com enriquecimento automático em background. Leia até o fim antes de começar. A ordem de implementação está na seção final.

---

## Contexto técnico obrigatório

- **Stack backend**: Hono.js, TypeScript, PostgreSQL + JSONB, node-postgres (pg)
- **Stack frontend**: Next.js 15, React 19, TypeScript, MUI v7
- **Queue**: `apps/backend/src/services/queueService.ts` (já existe)
- **AI services**: `apps/backend/src/services/ai/` (copyOrchestrator, geminiService, claudeService)
- **Rotas de clientes**: `apps/backend/src/routes/clients.ts`
- **Aba Perfil (frontend)**: `apps/web/app/clients/[id]/perfil/page.tsx`
- **Cores**: `#ff6600` (laranja), `#0f172a` (texto), `#13DEB9` (verde), `#FFAE1F` (amarelo), `#FA896B` (salmon)
- **Deploy**: `railway up --service edro-web --detach` / `railway up --service edro-backend --detach`

---

## Modelo mental central

```
Evento (criar cliente / atualizar campo / agenda 14d)
    ↓
Job enfileirado automaticamente (queueService)
    ↓
Worker roda IA por seção (~60s)
    ↓
Sugestões salvas em profile_suggestions (NUNCA sobrescreve confirmados)
    ↓
Usuário abre Perfil → vê badges com sugestões prontas → revisa e confirma
    ↓
Confirmado vira knowledgeBlock para os pipelines de IA
```

**Regra de ouro**: `profile` (confirmado pelo humano) e `profile_suggestions` (pendente de revisão) são colunas separadas. A IA nunca toca em campos confirmados.

**Estados de um campo**:
- `empty` — nunca preenchido, IA vai sugerir
- `pending` — IA sugeriu, aguarda revisão
- `confirmed` — humano confirmou, IA usa nos pipelines
- `manual` — só o humano preenche, IA nunca sugere

---

## PARTE 1 — Backend

### 1.1 — Migration SQL

**Arquivo a criar**: `apps/backend/src/db/migrations/0130_client_profile_intelligence.sql`

```sql
-- Sugestões pendentes da IA (separadas do profile confirmado)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS profile_suggestions JSONB DEFAULT '{}';

-- Status geral do enriquecimento
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'running', 'done', 'failed'));

-- Timestamp de última atualização por seção (para freshness indicator)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sections_refreshed_at JSONB DEFAULT '{}';

-- Score de inteligência calculado (0-100, cacheable)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intelligence_score INTEGER DEFAULT 0;

-- Índice para encontrar clientes que precisam de re-enriquecimento
CREATE INDEX IF NOT EXISTS idx_clients_enrichment_status
  ON clients(enrichment_status, tenant_id);

CREATE INDEX IF NOT EXISTS idx_clients_intelligence_refreshed
  ON clients(intelligence_refreshed_at, tenant_id);
```

**Obs**: os novos campos de perfil (brand_colors, competitors, tone_description, etc.) vivem dentro do JSONB `profile` existente. Não precisam de colunas novas — só atualizar os tipos TypeScript e o PATCH handler.

---

### 1.2 — Tipos TypeScript atualizados

**Arquivo a criar**: `apps/backend/src/types/clientProfile.ts`

```typescript
// Campos confirmados (vivem em clients.profile)
export type ClientProfileConfirmed = {
  // Já existentes (não remover)
  tone_profile?: 'conservative' | 'balanced' | 'bold';
  risk_tolerance?: 'low' | 'medium' | 'high';
  keywords?: string[];
  pillars?: string[];
  negative_keywords?: string[];
  knowledge_base?: KnowledgeBase;
  calendar_profile?: CalendarProfile;
  trend_profile?: TrendProfile;
  platform_preferences?: Record<string, any>;

  // NOVOS — adicionar ao profile JSONB
  logo_url?: string;
  brand_colors?: string[];             // ['#FF6600', '#0F172A']
  tone_description?: string;           // "Profissional com calor humano, sem jargão técnico"
  personality_traits?: string[];       // ['direto', 'inspirador', 'sem jargão']
  formality_level?: number;            // 1 (muito casual) a 5 (muito formal)
  emoji_usage?: 'never' | 'rare' | 'moderate' | 'frequent';
  good_copy_examples?: string[];       // exemplos reais de copy aprovada
  bad_copy_examples?: string[];        // exemplos de copy que NÃO representa a marca
  competitors?: Competitor[];
  strategic_dates?: StrategicDate[];
  content_mix?: ContentMix;
  brand_directives?: string[];         // regras inegociáveis (manual only)
  forbidden_content?: string[];        // conteúdo proibido (manual only)
};

export type KnowledgeBase = {
  description?: string;
  website?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  must_mentions?: string[];
  approved_terms?: string[];
  forbidden_claims?: string[];
  hashtags?: string[];
  notes?: string;
  social_profiles?: SocialProfiles;
};

export type SocialProfiles = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
  other?: string;
};

export type Competitor = {
  name: string;
  website?: string;
  monitoring: boolean;
  platforms?: string[];
  suggested_by?: 'ai' | 'user';
};

export type StrategicDate = {
  date: string;                // ISO date string
  label: string;
  type: 'seasonal' | 'regulatory' | 'client' | 'veto';
  confirmed: boolean;
  suggested_by?: 'ai' | 'user';
  notes?: string;
};

export type ContentMix = {
  educational: number;         // percentages, must sum to 100
  promotional: number;
  institutional: number;
  entertainment: number;
};

// Sugestões pendentes (vivem em clients.profile_suggestions)
export type ProfileSuggestions = {
  identity?: SectionSuggestion;
  voice?: SectionSuggestion;
  strategy?: SectionSuggestion;
  competitors?: SectionSuggestion;
  calendar?: SectionSuggestion;
};

export type SectionSuggestion = {
  suggested_at: string;        // ISO timestamp
  status: 'pending' | 'reviewed';
  fields: Record<string, FieldSuggestion>;
};

export type FieldSuggestion = {
  value: any;
  confidence: number;          // 0.0 - 1.0
  source: string;              // 'website' | 'linkedin' | 'social_posts' | 'perplexity' | 'analysis'
  reasoning?: string;          // por que a IA sugeriu isso
};

// Score de inteligência (calculado dinamicamente)
export type IntelligenceScore = {
  total: number;               // 0-100
  breakdown: Record<string, { score: number; max: number; label: string; status: 'confirmed' | 'suggested' | 'empty' | 'manual_required' }>;
};
```

---

### 1.3 — Serviço de enriquecimento

**Arquivo a criar**: `apps/backend/src/services/clientEnrichmentService.ts`

```typescript
import { callProvider } from './ai/copyOrchestrator';
import { db } from '../db/db';

export type EnrichmentSection = 'identity' | 'voice' | 'strategy' | 'competitors' | 'calendar';

export type EnrichmentParams = {
  client_id: string;
  tenant_id: string;
  sections?: EnrichmentSection[];  // se undefined, enriquece tudo
  trigger: 'created' | 'profile_update' | 'scheduled' | 'manual';
};

export async function enrichClientProfile(params: EnrichmentParams): Promise<void> {
  const { client_id, tenant_id } = params;
  const sections = params.sections ?? ['identity', 'voice', 'strategy', 'competitors', 'calendar'];

  // Marcar como running
  await db.query(
    `UPDATE clients SET enrichment_status = 'running' WHERE id = $1 AND tenant_id = $2`,
    [client_id, tenant_id]
  );

  // Buscar dados atuais do cliente
  const result = await db.query(
    `SELECT name, segment_primary, profile FROM clients WHERE id = $1 AND tenant_id = $2`,
    [client_id, tenant_id]
  );
  if (!result.rows[0]) return;

  const client = result.rows[0];
  const profile = client.profile || {};
  const website = profile.knowledge_base?.website;
  const socialProfiles = profile.knowledge_base?.social_profiles || {};

  const suggestions: Record<string, any> = {};
  const sectionsRefreshedAt: Record<string, string> = {};
  const now = new Date().toISOString();

  // ─── SEÇÃO: IDENTITY ───────────────────────────────────────────────────────
  if (sections.includes('identity') && website) {
    try {
      const identityResult = await callProvider('gemini', {
        prompt: `Analise o website e perfil público da empresa abaixo e extraia informações de identidade.
Retorne APENAS um JSON válido:

{
  "description": "elevator pitch da empresa em 2-3 frases, baseado no website",
  "brand_colors": ["#HEXCODE1", "#HEXCODE2"],
  "tone_hint": "tom percebido no website (ex: formal, amigável, técnico)",
  "personality_traits": ["3-5 adjetivos que descrevem a marca"],
  "social_handles_found": {
    "instagram": "@handle ou null",
    "linkedin": "url ou null",
    "facebook": "url ou null"
  }
}

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary}
WEBSITE: ${website}
HANDLES JÁ CONHECIDOS: ${JSON.stringify(socialProfiles)}`,
        temperature: 0.2,
      });

      const parsed = safeParseJson(identityResult.text);
      if (parsed) {
        suggestions.identity = {
          suggested_at: now,
          status: 'pending',
          fields: {
            ...(parsed.description && {
              description: { value: parsed.description, confidence: 0.8, source: 'website', reasoning: 'Extraído da página principal e sobre da empresa' }
            }),
            ...(parsed.brand_colors?.length && {
              brand_colors: { value: parsed.brand_colors, confidence: 0.7, source: 'website', reasoning: 'Cores dominantes identificadas no website' }
            }),
            ...(parsed.personality_traits?.length && {
              personality_traits: { value: parsed.personality_traits, confidence: 0.75, source: 'analysis', reasoning: 'Traços inferidos do tom e conteúdo do website' }
            }),
          },
        };
        sectionsRefreshedAt.identity = now;
      }
    } catch (e) { console.error('[enrichment:identity]', e); }
  }

  // ─── SEÇÃO: VOICE ──────────────────────────────────────────────────────────
  if (sections.includes('voice') && (website || Object.values(socialProfiles).some(Boolean))) {
    try {
      const voiceResult = await callProvider('claude', {
        prompt: `Você é um especialista em brand voice. Analise o perfil público desta empresa e extraia o DNA de comunicação.
Retorne APENAS um JSON válido:

{
  "tone_description": "descrição rica do tom de voz em 2-3 frases (ex: 'Profissional sem ser frio, direto ao ponto, usa linguagem acessível sem abrir mão da autoridade técnica')",
  "formality_level": 3,
  "emoji_usage": "rare",
  "approved_terms": ["termos e expressões que a marca usa frequentemente"],
  "suggested_pillars": ["3-5 pilares de conteúdo identificados"],
  "suggested_keywords": ["8-12 keywords relevantes para a marca e segmento"]
}

formality_level: 1 (muito casual) a 5 (muito formal)
emoji_usage: "never" | "rare" | "moderate" | "frequent"

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary}
WEBSITE: ${website || 'não disponível'}
HANDLES: ${JSON.stringify(socialProfiles)}
DESCRIÇÃO ATUAL: ${profile.knowledge_base?.description || 'não preenchida'}`,
        temperature: 0.3,
      });

      const parsed = safeParseJson(voiceResult.text);
      if (parsed) {
        suggestions.voice = {
          suggested_at: now,
          status: 'pending',
          fields: {
            ...(parsed.tone_description && {
              tone_description: { value: parsed.tone_description, confidence: 0.78, source: 'analysis', reasoning: 'Análise do tom de voz baseada no conteúdo público da marca' }
            }),
            ...(parsed.formality_level && {
              formality_level: { value: parsed.formality_level, confidence: 0.7, source: 'analysis', reasoning: 'Grau de formalidade inferido do estilo de comunicação' }
            }),
            ...(parsed.emoji_usage && {
              emoji_usage: { value: parsed.emoji_usage, confidence: 0.72, source: 'analysis' }
            }),
            ...(parsed.approved_terms?.length && {
              approved_terms: { value: parsed.approved_terms, confidence: 0.65, source: 'website', reasoning: 'Termos recorrentes no conteúdo público da marca' }
            }),
          },
        };

        // Sugestões para seção strategy também
        if (parsed.suggested_pillars?.length || parsed.suggested_keywords?.length) {
          suggestions.strategy = suggestions.strategy || { suggested_at: now, status: 'pending', fields: {} };
          if (parsed.suggested_pillars?.length) {
            suggestions.strategy.fields.pillars = { value: parsed.suggested_pillars, confidence: 0.72, source: 'analysis', reasoning: 'Pilares identificados no conteúdo e posicionamento da marca' };
          }
          if (parsed.suggested_keywords?.length) {
            suggestions.strategy.fields.keywords = { value: parsed.suggested_keywords, confidence: 0.8, source: 'website', reasoning: 'Keywords extraídas do website e posicionamento público' };
          }
        }
        sectionsRefreshedAt.voice = now;
      }
    } catch (e) { console.error('[enrichment:voice]', e); }
  }

  // ─── SEÇÃO: STRATEGY ───────────────────────────────────────────────────────
  if (sections.includes('strategy') && (website || profile.knowledge_base?.description)) {
    try {
      const strategyResult = await callProvider('gemini', {
        prompt: `Analise o posicionamento desta empresa e extraia dados estratégicos de conteúdo.
Retorne APENAS um JSON válido:

{
  "audience_description": "descrição do público-alvo ideal em 1-2 frases (cargo, setor, dor principal)",
  "brand_promise": "promessa central da marca em 1 frase",
  "differentiators": "principais diferenciais em 1-2 frases",
  "content_mix": {
    "educational": 40,
    "promotional": 20,
    "institutional": 30,
    "entertainment": 10
  },
  "must_mentions": ["elemento 1 que deve aparecer em todas as comunicações", "elemento 2"]
}

content_mix: percentuais devem somar 100

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary}
DESCRIÇÃO: ${profile.knowledge_base?.description || 'não disponível'}
WEBSITE: ${website || 'não disponível'}
PILARES ATUAIS: ${JSON.stringify(profile.pillars || [])}`,
        temperature: 0.3,
      });

      const parsed = safeParseJson(strategyResult.text);
      if (parsed) {
        if (!suggestions.strategy) suggestions.strategy = { suggested_at: now, status: 'pending', fields: {} };
        if (parsed.audience_description) suggestions.strategy.fields.audience = { value: parsed.audience_description, confidence: 0.75, source: 'analysis' };
        if (parsed.brand_promise) suggestions.strategy.fields.brand_promise = { value: parsed.brand_promise, confidence: 0.7, source: 'analysis' };
        if (parsed.differentiators) suggestions.strategy.fields.differentiators = { value: parsed.differentiators, confidence: 0.7, source: 'analysis' };
        if (parsed.content_mix) suggestions.strategy.fields.content_mix = { value: parsed.content_mix, confidence: 0.65, source: 'analysis', reasoning: 'Mix sugerido baseado no segmento e conteúdo atual' };
        if (parsed.must_mentions?.length) suggestions.strategy.fields.must_mentions = { value: parsed.must_mentions, confidence: 0.6, source: 'analysis' };
        sectionsRefreshedAt.strategy = now;
      }
    } catch (e) { console.error('[enrichment:strategy]', e); }
  }

  // ─── SEÇÃO: COMPETITORS ────────────────────────────────────────────────────
  if (sections.includes('competitors')) {
    try {
      const competitorsResult = await callProvider('gemini', {
        prompt: `Identifique os principais concorrentes desta empresa no Brasil.
Retorne APENAS um JSON válido:

{
  "competitors": [
    {
      "name": "Nome do Concorrente",
      "website": "https://site.com",
      "why_competitor": "razão em 1 frase"
    }
  ]
}

Liste 4-6 concorrentes diretos. Priorize empresas brasileiras ou com forte presença no Brasil.

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary}
WEBSITE: ${website || 'não disponível'}`,
        temperature: 0.3,
      });

      const parsed = safeParseJson(competitorsResult.text);
      if (parsed?.competitors?.length) {
        suggestions.competitors = {
          suggested_at: now,
          status: 'pending',
          fields: {
            competitors: {
              value: parsed.competitors.map((c: any) => ({
                name: c.name,
                website: c.website,
                monitoring: false,
                suggested_by: 'ai',
              })),
              confidence: 0.7,
              source: 'perplexity',
              reasoning: `${parsed.competitors.length} concorrentes identificados no segmento ${client.segment_primary}`,
            },
          },
        };
        sectionsRefreshedAt.competitors = now;
      }
    } catch (e) { console.error('[enrichment:competitors]', e); }
  }

  // ─── SEÇÃO: CALENDAR ───────────────────────────────────────────────────────
  if (sections.includes('calendar')) {
    try {
      const currentYear = new Date().getFullYear();
      const calendarResult = await callProvider('gemini', {
        prompt: `Liste as datas estratégicas mais relevantes para uma empresa do segmento "${client.segment_primary}" no Brasil em ${currentYear}.
Retorne APENAS um JSON válido:

{
  "dates": [
    {
      "date": "YYYY-MM-DD",
      "label": "Nome da data",
      "type": "seasonal",
      "relevance": "por que é relevante para este segmento em 1 frase"
    }
  ]
}

type: "seasonal" (datas comemorativas) ou "regulatory" (prazos regulatórios do setor)
Liste 10-15 datas. Foque nas mais relevantes para o segmento específico.`,
        temperature: 0.2,
      });

      const parsed = safeParseJson(calendarResult.text);
      if (parsed?.dates?.length) {
        suggestions.calendar = {
          suggested_at: now,
          status: 'pending',
          fields: {
            strategic_dates: {
              value: parsed.dates.map((d: any) => ({
                date: d.date,
                label: d.label,
                type: d.type,
                confirmed: false,
                suggested_by: 'ai',
                notes: d.relevance,
              })),
              confidence: 0.75,
              source: 'analysis',
              reasoning: `${parsed.dates.length} datas estratégicas para o segmento ${client.segment_primary}`,
            },
          },
        };
        sectionsRefreshedAt.calendar = now;
      }
    } catch (e) { console.error('[enrichment:calendar]', e); }
  }

  // ─── SALVAR SUGESTÕES ──────────────────────────────────────────────────────
  // Merge com sugestões existentes (não sobrescreve seções não processadas)
  const existingSuggestions = await db.query(
    `SELECT profile_suggestions, sections_refreshed_at FROM clients WHERE id = $1`,
    [client_id]
  );
  const existing = existingSuggestions.rows[0];
  const mergedSuggestions = { ...(existing.profile_suggestions || {}), ...suggestions };
  const mergedRefreshedAt = { ...(existing.sections_refreshed_at || {}), ...sectionsRefreshedAt };

  await db.query(
    `UPDATE clients SET
      profile_suggestions = $1,
      sections_refreshed_at = $2,
      enrichment_status = 'done',
      intelligence_refreshed_at = NOW(),
      intelligence_score = $3
     WHERE id = $4 AND tenant_id = $5`,
    [
      JSON.stringify(mergedSuggestions),
      JSON.stringify(mergedRefreshedAt),
      calculateIntelligenceScore(result.rows[0]),
      client_id,
      tenant_id,
    ]
  );
}

// ─── FUNÇÃO DE SCORE ──────────────────────────────────────────────────────────

export function calculateIntelligenceScore(client: any): number {
  const profile = client.profile || {};
  const kb = profile.knowledge_base || {};

  const weights: Array<{ key: string; value: any; weight: number }> = [
    { key: 'good_copy_examples', value: profile.good_copy_examples?.length, weight: 15 },
    { key: 'forbidden_claims', value: kb.forbidden_claims?.length, weight: 12 },
    { key: 'tone_description', value: profile.tone_description, weight: 10 },
    { key: 'pillars', value: profile.pillars?.length >= 3, weight: 10 },
    { key: 'keywords', value: profile.keywords?.length >= 5, weight: 8 },
    { key: 'audience', value: kb.audience, weight: 8 },
    { key: 'brand_promise', value: kb.brand_promise, weight: 7 },
    { key: 'brand_colors', value: profile.brand_colors?.length, weight: 5 },
    { key: 'logo_url', value: profile.logo_url, weight: 5 },
    { key: 'competitors', value: profile.competitors?.length, weight: 5 },
    { key: 'strategic_dates', value: profile.strategic_dates?.filter((d: any) => d.type === 'client')?.length, weight: 5 },
    { key: 'connectors', value: kb.social_profiles && Object.values(kb.social_profiles).some(Boolean), weight: 5 },
    { key: 'description', value: kb.description, weight: 5 },
  ];

  let score = 0;
  for (const { value, weight } of weights) {
    if (value) score += weight;
  }

  return Math.min(100, score);
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function safeParseJson(text: string): Record<string, any> | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch {}
  return null;
}
```

---

### 1.4 — Worker de enriquecimento (integrar com queueService)

**Arquivo a modificar**: `apps/backend/src/services/queueService.ts`

Registrar o worker para o job `client.enrich`:

```typescript
import { enrichClientProfile } from './clientEnrichmentService';

// No registro de workers (onde outros jobs são registrados):
registerWorker('client.enrich', async (job) => {
  const { client_id, tenant_id, sections, trigger } = job.data;
  console.log(`[enrichment] Starting for client ${client_id}, trigger: ${trigger}`);
  await enrichClientProfile({ client_id, tenant_id, sections, trigger });
  console.log(`[enrichment] Completed for client ${client_id}`);
});
```

---

### 1.5 — Gatilho automático nas rotas de cliente

**Arquivo a modificar**: `apps/backend/src/routes/clients.ts`

**Ao criar cliente** — enfileirar enriquecimento completo:

```typescript
// Após o INSERT do novo cliente:
await queueService.enqueue('client.enrich', {
  client_id: newClient.id,
  tenant_id: req.tenant.id,
  sections: ['identity', 'voice', 'strategy', 'competitors', 'calendar'],
  trigger: 'created',
});
```

**Ao atualizar campos relevantes** — enfileirar apenas seções afetadas:

```typescript
// No PATCH /clients/:id, após salvar:
const affectedSections = detectAffectedSections(body);
if (affectedSections.length > 0) {
  await queueService.enqueue('client.enrich', {
    client_id: id,
    tenant_id: req.tenant.id,
    sections: affectedSections,
    trigger: 'profile_update',
  });
}

// Helper:
function detectAffectedSections(body: any): EnrichmentSection[] {
  const sections: EnrichmentSection[] = [];
  const websiteChanged = body.profile?.knowledge_base?.website !== undefined;
  const handlesChanged = body.profile?.knowledge_base?.social_profiles !== undefined;
  const segmentChanged = body.segment_primary !== undefined;

  if (websiteChanged || handlesChanged) sections.push('identity', 'voice', 'strategy');
  if (segmentChanged) sections.push('competitors', 'calendar');
  return [...new Set(sections)];
}
```

---

### 1.6 — Job agendado (re-enriquecimento periódico)

**Arquivo a criar**: `apps/backend/src/jobs/scheduledEnrichment.ts`

```typescript
import { db } from '../db/db';
import { queueService } from '../services/queueService';

export async function scheduleStaleClientEnrichment(): Promise<void> {
  // Clientes ativos que não foram enriquecidos nos últimos 14 dias
  const staleClients = await db.query(`
    SELECT id, tenant_id FROM clients
    WHERE status = 'active'
      AND (
        intelligence_refreshed_at IS NULL
        OR intelligence_refreshed_at < NOW() - INTERVAL '14 days'
      )
    LIMIT 50
  `);

  for (const client of staleClients.rows) {
    await queueService.enqueue('client.enrich', {
      client_id: client.id,
      tenant_id: client.tenant_id,
      sections: ['voice', 'strategy', 'competitors', 'calendar'], // não re-enriquece identity (muda pouco)
      trigger: 'scheduled',
    });
  }

  console.log(`[scheduled-enrichment] Enqueued ${staleClients.rows.length} clients for re-enrichment`);
}
```

**Registrar o cron** (onde o servidor inicializa — `index.ts` ou `server.ts`):

```typescript
import cron from 'node-cron';
import { scheduleStaleClientEnrichment } from './jobs/scheduledEnrichment';

// Roda toda segunda-feira às 3h da manhã
cron.schedule('0 3 * * 1', scheduleStaleClientEnrichment);
```

---

### 1.7 — Novos endpoints de API

**Arquivo a modificar**: `apps/backend/src/routes/clients.ts`

```typescript
// GET /clients/:id/suggestions — buscar sugestões pendentes
router.get('/:id/suggestions', tenantGuard, clientReadGuard, async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    `SELECT profile_suggestions, sections_refreshed_at, enrichment_status, intelligence_score
     FROM clients WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenant.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(result.rows[0]);
});

// POST /clients/:id/suggestions/confirm — confirmar uma sugestão específica
router.post('/:id/suggestions/confirm', tenantGuard, clientWriteGuard, async (req, res) => {
  const { id } = req.params;
  const { section, field, value } = req.body;
  // section: 'identity' | 'voice' | 'strategy' | 'competitors' | 'calendar'
  // field: nome do campo dentro da seção
  // value: valor confirmado (pode ser editado pelo usuário antes de confirmar)

  // Merge no profile confirmado
  const client = await db.query(
    `SELECT profile, profile_suggestions FROM clients WHERE id = $1 AND tenant_id = $2`,
    [id, req.tenant.id]
  );
  if (!client.rows[0]) return res.status(404).json({ error: 'not found' });

  const profile = client.rows[0].profile || {};
  const suggestions = client.rows[0].profile_suggestions || {};

  // Aplicar ao profile (lógica de merge por campo)
  const updatedProfile = applyFieldToProfile(profile, field, value);

  // Marcar como reviewed na sugestão
  if (suggestions[section]?.fields?.[field]) {
    suggestions[section].fields[field] = { ...suggestions[section].fields[field], status: 'confirmed' };
  }

  await db.query(
    `UPDATE clients SET
       profile = $1,
       profile_suggestions = $2,
       intelligence_score = $3
     WHERE id = $4 AND tenant_id = $5`,
    [JSON.stringify(updatedProfile), JSON.stringify(suggestions), calculateIntelligenceScore({ profile: updatedProfile }), id, req.tenant.id]
  );

  res.json({ success: true, intelligence_score: calculateIntelligenceScore({ profile: updatedProfile }) });
});

// DELETE /clients/:id/suggestions/:section/:field — descartar sugestão
router.delete('/:id/suggestions/:section/:field', tenantGuard, clientWriteGuard, async (req, res) => {
  const { id, section, field } = req.params;
  // Remover campo específico de profile_suggestions
  await db.query(
    `UPDATE clients
     SET profile_suggestions = profile_suggestions #- $1
     WHERE id = $2 AND tenant_id = $3`,
    [`{${section},fields,${field}}`, id, req.tenant.id]
  );
  res.json({ success: true });
});

// POST /clients/:id/enrich — trigger manual (para o "Atualizar agora" discreto)
router.post('/:id/enrich', tenantGuard, clientWriteGuard, async (req, res) => {
  const { id } = req.params;
  const { sections } = req.body;
  await queueService.enqueue('client.enrich', {
    client_id: id,
    tenant_id: req.tenant.id,
    sections: sections || ['identity', 'voice', 'strategy', 'competitors', 'calendar'],
    trigger: 'manual',
  });
  res.json({ success: true, message: 'Enriquecimento agendado, pronto em ~60 segundos' });
});

// Helper interno
function applyFieldToProfile(profile: any, field: string, value: any): any {
  const updated = { ...profile };
  const kb = { ...profile.knowledge_base };

  // Campos que vivem em knowledge_base
  const kbFields = ['description', 'audience', 'brand_promise', 'differentiators', 'must_mentions', 'approved_terms', 'forbidden_claims', 'hashtags'];
  if (kbFields.includes(field)) {
    kb[field] = value;
    updated.knowledge_base = kb;
  } else {
    updated[field] = value;
  }

  return updated;
}
```

---

### 1.8 — Montar o knowledgeBlock com campos confirmados

**Arquivo a modificar**: `apps/backend/src/services/ai/copyService.ts`

Substituir a montagem manual do `knowledgeBlock` por uma função que usa todos os campos confirmados:

```typescript
export function assembleKnowledgeBlock(client: {
  name: string;
  segment_primary: string;
  profile?: ClientProfileConfirmed;
}): string {
  const p = client.profile || {};
  const kb = p.knowledge_base || {};

  const parts: string[] = [
    `EMPRESA: ${client.name}`,
    `SEGMENTO: ${client.segment_primary}`,
    kb.description && `DESCRIÇÃO: ${kb.description}`,
    p.tone_description && `TOM DE VOZ: ${p.tone_description}`,
    p.formality_level && `FORMALIDADE: ${p.formality_level}/5`,
    p.emoji_usage && `USO DE EMOJIS: ${p.emoji_usage}`,
    p.pillars?.length && `PILARES DE CONTEÚDO: ${p.pillars.join(', ')}`,
    p.keywords?.length && `KEYWORDS: ${p.keywords.join(', ')}`,
    p.negative_keywords?.length && `EVITAR MENCIONAR: ${p.negative_keywords.join(', ')}`,
    kb.audience && `PÚBLICO-ALVO: ${kb.audience}`,
    kb.brand_promise && `PROMESSA DA MARCA: ${kb.brand_promise}`,
    kb.differentiators && `DIFERENCIAIS: ${kb.differentiators}`,
    kb.must_mentions?.length && `MENCIONAR SEMPRE: ${kb.must_mentions.join(', ')}`,
    kb.forbidden_claims?.length && `NUNCA DIZER/PROMETER: ${kb.forbidden_claims.join(', ')}`,
    p.brand_directives?.length && `REGRAS INEGOCIÁVEIS: ${p.brand_directives.join(' | ')}`,
    p.good_copy_examples?.length && `EXEMPLOS DE BOA COPY:\n${p.good_copy_examples.map(e => `- "${e}"`).join('\n')}`,
    p.bad_copy_examples?.length && `EXEMPLOS DO QUE NÃO FAZER:\n${p.bad_copy_examples.map(e => `- "${e}"`).join('\n')}`,
  ];

  return parts.filter(Boolean).join('\n\n');
}
```

---

## PARTE 2 — Frontend

### 2.1 — Aba Perfil: visão geral da estrutura

```
/clients/[id]/perfil
├── IntelligenceScoreBar       ← score + "o que falta"
├── ManualFieldsChecklist      ← "precisamos de você" (campos manuais vazios)
├── SectionCard: Identidade    ← badge de sugestões + freshness
├── SectionCard: Tom de Voz    ← badge de sugestões + freshness
├── SectionCard: Estratégia    ← badge de sugestões + freshness
├── SectionCard: Concorrentes  ← badge de sugestões + freshness
├── SectionCard: Directives    ← somente manual, sem IA
├── SectionCard: Calendário    ← badge de sugestões + freshness
└── SectionCard: Conectores    ← status de integrações
```

---

### 2.2 — Componente: IntelligenceScoreBar

**Arquivo a criar**: `apps/web/app/clients/[id]/perfil/IntelligenceScoreBar.tsx`

```tsx
'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { IconBrain, IconRefresh } from '@tabler/icons-react';
import { apiPost } from '@/lib/api';

type Props = {
  score: number;         // 0-100
  pendingCount: number;  // total de campos pendentes
  missingManual: string[]; // campos manuais não preenchidos
  clientId: string;
  lastRefreshed?: string;
  enrichmentStatus?: string;
};

const SCORE_LEVELS = [
  { min: 0,  max: 30,  label: 'IA com informações mínimas',        color: '#dc2626', bg: '#fef2f2' },
  { min: 30, max: 60,  label: 'IA entende parcialmente o cliente',  color: '#d97706', bg: '#fffbeb' },
  { min: 60, max: 85,  label: 'IA bem contextualizada',             color: '#2563eb', bg: '#eff6ff' },
  { min: 85, max: 101, label: 'IA totalmente alinhada',             color: '#16a34a', bg: '#f0fdf4' },
];

export default function IntelligenceScoreBar({
  score, pendingCount, missingManual, clientId, lastRefreshed, enrichmentStatus
}: Props) {
  const level = SCORE_LEVELS.find(l => score >= l.min && score < l.max) ?? SCORE_LEVELS[0];
  const isRunning = enrichmentStatus === 'running';

  const handleManualRefresh = async () => {
    await apiPost(`/clients/${clientId}/enrich`, {});
  };

  return (
    <Card sx={{ mb: 3, borderColor: level.color, borderWidth: 1, borderStyle: 'solid', bgcolor: level.bg }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <IconBrain size={20} color={level.color} />
              <Typography variant="subtitle2" fontWeight={700} color={level.color}>
                Nível de Inteligência: {score}%
              </Typography>
              {isRunning && (
                <Chip size="small" label="Analisando..." sx={{ fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.06)' }} />
              )}
            </Stack>

            <LinearProgress
              variant={isRunning ? 'indeterminate' : 'determinate'}
              value={score}
              sx={{
                height: 8, borderRadius: 4, mb: 1,
                bgcolor: 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: level.color, borderRadius: 4 },
              }}
            />

            <Typography variant="caption" color="text.secondary">
              {level.label}
              {lastRefreshed && !isRunning && (
                <> · última análise {formatRelativeTime(lastRefreshed)}</>
              )}
            </Typography>

            {(pendingCount > 0 || missingManual.length > 0) && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {pendingCount > 0 && (
                  <Chip size="small"
                    label={`${pendingCount} sugestão${pendingCount > 1 ? 'ões' : ''} para revisar`}
                    sx={{ fontSize: '0.65rem', bgcolor: level.color, color: 'white', fontWeight: 600 }} />
                )}
                {missingManual.length > 0 && (
                  <Chip size="small"
                    label={`${missingManual.length} campo${missingManual.length > 1 ? 's' : ''} aguardam você`}
                    sx={{ fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.08)', fontWeight: 600 }} />
                )}
              </Stack>
            )}
          </Box>

          {!isRunning && (
            <Box
              component="button"
              onClick={handleManualRefresh}
              sx={{
                border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 0.5,
                color: 'text.secondary', fontSize: '0.7rem', pt: 0.5,
                '&:hover': { color: level.color },
              }}
            >
              <IconRefresh size={12} />
              Atualizar agora
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}
```

---

### 2.3 — Componente: ManualFieldsChecklist

**Arquivo a criar**: `apps/web/app/clients/[id]/perfil/ManualFieldsChecklist.tsx`

```tsx
'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import { IconTarget, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

type ManualField = {
  key: string;
  label: string;
  description: string;
  impact: 'critical' | 'high' | 'medium';
  section: string;
};

const MANUAL_FIELDS: ManualField[] = [
  {
    key: 'good_copy_examples',
    label: 'Exemplos de copy aprovada',
    description: 'Cole 2-3 exemplos reais de textos que representam bem a marca. Maior impacto na qualidade da IA.',
    impact: 'critical',
    section: 'Tom de Voz',
  },
  {
    key: 'forbidden_claims',
    label: 'Claims e termos proibidos',
    description: 'O que nunca pode aparecer numa peça: palavras, promessas, assuntos. Protege a marca.',
    impact: 'critical',
    section: 'Directives',
  },
  {
    key: 'brand_colors',
    label: 'Cores da marca (hex)',
    description: 'Ex: #FF6600, #0F172A. Essencial para validação de mockups e relatórios brandados.',
    impact: 'high',
    section: 'Identidade',
  },
  {
    key: 'logo_url',
    label: 'Logo da marca',
    description: 'Arquivo PNG ou SVG com fundo transparente. Usado em relatórios e exportações.',
    impact: 'high',
    section: 'Identidade',
  },
  {
    key: 'strategic_dates_client',
    label: 'Datas importantes de 2026',
    description: 'Lançamentos, aniversários, eventos próprios, períodos de veto.',
    impact: 'high',
    section: 'Calendário',
  },
  {
    key: 'bad_copy_examples',
    label: 'Exemplos do que NÃO fazer',
    description: 'Copy que foi rejeitada ou que não representa a marca. Ensina a IA pelo contra-exemplo.',
    impact: 'medium',
    section: 'Tom de Voz',
  },
];

const IMPACT_COLORS = { critical: '#dc2626', high: '#d97706', medium: '#2563eb' };
const IMPACT_LABELS = { critical: 'Crítico', high: 'Alto impacto', medium: 'Médio impacto' };

type Props = {
  missingFields: string[];  // keys dos campos que estão vazios
  onFieldClick: (field: ManualField) => void;
};

export default function ManualFieldsChecklist({ missingFields, onFieldClick }: Props) {
  const [open, setOpen] = useState(true);
  const pending = MANUAL_FIELDS.filter(f => missingFields.includes(f.key));
  if (pending.length === 0) return null;

  return (
    <Card sx={{ mb: 3, borderColor: '#ff6600', borderWidth: 1, borderStyle: 'solid', bgcolor: 'rgba(255,102,0,0.02)' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          onClick={() => setOpen(v => !v)} sx={{ cursor: 'pointer', mb: open ? 1.5 : 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconTarget size={18} color="#ff6600" />
            <Typography variant="subtitle2" fontWeight={700} color="#ff6600">
              Precisamos de você — {pending.length} campo{pending.length > 1 ? 's' : ''}
            </Typography>
          </Stack>
          <IconButton size="small">
            {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </IconButton>
        </Stack>

        <Collapse in={open}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Estes campos só você pode preencher — a IA não consegue inferir.
          </Typography>
          <Stack spacing={1}>
            {pending.map(field => (
              <Box key={field.key}
                onClick={() => onFieldClick(field)}
                sx={{
                  p: 1.5, borderRadius: 1.5, cursor: 'pointer',
                  border: '1px solid', borderColor: 'divider',
                  bgcolor: 'background.paper',
                  '&:hover': { borderColor: '#ff6600', bgcolor: 'rgba(255,102,0,0.02)' },
                  transition: 'all 0.15s',
                }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                      {field.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {field.description}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 1, flexShrink: 0 }}>
                    <Typography variant="caption"
                      sx={{ color: IMPACT_COLORS[field.impact], fontWeight: 600, fontSize: '0.65rem' }}>
                      {IMPACT_LABELS[field.impact]}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}
```

---

### 2.4 — Componente: SectionEnrichmentCard

**Arquivo a criar**: `apps/web/app/clients/[id]/perfil/SectionEnrichmentCard.tsx`

```tsx
'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { IconChevronDown, IconChevronUp, IconCheck, IconX, IconRobot } from '@tabler/icons-react';
import { apiPost, apiDelete } from '@/lib/api';

type SuggestionField = {
  value: any;
  confidence: number;
  source: string;
  reasoning?: string;
};

type Props = {
  sectionKey: string;
  title: string;
  icon: React.ReactNode;
  suggestions?: Record<string, SuggestionField>;
  confirmedFields?: Record<string, any>;
  lastRefreshed?: string;
  clientId: string;
  isManualOnly?: boolean;
  onConfirmed?: () => void;
  children?: React.ReactNode; // form para campos manuais
};

export default function SectionEnrichmentCard({
  sectionKey, title, icon, suggestions, confirmedFields,
  lastRefreshed, clientId, isManualOnly, onConfirmed, children
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const pendingFields = Object.entries(suggestions || {})
    .filter(([, v]) => (v as any).status !== 'confirmed');
  const hasPending = pendingFields.length > 0;
  const confirmedCount = Object.keys(confirmedFields || {}).length;

  const freshness = lastRefreshed ? getFreshness(lastRefreshed) : null;

  const handleConfirm = async (field: string) => {
    setConfirming(field);
    const value = editValues[field] ?? suggestions?.[field]?.value;
    await apiPost(`/clients/${clientId}/suggestions/confirm`, { section: sectionKey, field, value });
    setConfirming(null);
    onConfirmed?.();
  };

  const handleDismiss = async (field: string) => {
    await apiDelete(`/clients/${clientId}/suggestions/${sectionKey}/${field}`);
    onConfirmed?.();
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5}
          onClick={() => setOpen(v => !v)} sx={{ cursor: 'pointer' }}>
          <Box sx={{ color: '#ff6600' }}>{icon}</Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>

          {/* Status badges */}
          {isManualOnly ? (
            <Chip size="small" label="Somente você" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'action.hover' }} />
          ) : hasPending ? (
            <Chip size="small"
              label={`🤖 ${pendingFields.length} sugestão${pendingFields.length > 1 ? 'ões' : ''}`}
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700 }} />
          ) : confirmedCount > 0 ? (
            <Chip size="small" label={`✓ Confirmado${freshness ? ` · ${freshness}` : ''}`}
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600 }} />
          ) : (
            <Chip size="small" label="Vazio"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'action.hover', color: 'text.secondary' }} />
          )}

          <IconButton size="small">
            {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </IconButton>
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2 }}>
            {/* Sugestões pendentes */}
            {pendingFields.map(([field, suggestion]) => {
              const s = suggestion as SuggestionField;
              const displayValue = Array.isArray(s.value)
                ? s.value.join(', ')
                : typeof s.value === 'object'
                  ? JSON.stringify(s.value, null, 2)
                  : String(s.value);

              return (
                <Box key={field} sx={{
                  mb: 2, p: 1.5, borderRadius: 1.5,
                  border: '1px dashed', borderColor: '#93c5fd',
                  bgcolor: '#eff6ff',
                }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                    <IconRobot size={12} color="#2563eb" />
                    <Typography variant="caption" fontWeight={700} color="#2563eb">
                      {formatFieldLabel(field)}
                    </Typography>
                    <Chip size="small"
                      label={`${Math.round(s.confidence * 100)}% confiança`}
                      sx={{ height: 16, fontSize: '0.6rem', ml: 0.5 }} />
                  </Stack>

                  {s.reasoning && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.7rem' }}>
                      {s.reasoning}
                    </Typography>
                  )}

                  {/* Campo editável antes de confirmar */}
                  <TextField
                    fullWidth size="small"
                    multiline={displayValue.length > 80}
                    rows={displayValue.length > 80 ? 3 : 1}
                    defaultValue={displayValue}
                    onChange={(e) => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                    sx={{ mb: 1, bgcolor: 'white', '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}
                  />

                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained"
                      disabled={confirming === field}
                      onClick={() => handleConfirm(field)}
                      startIcon={<IconCheck size={12} />}
                      sx={{ fontSize: '0.7rem', py: 0.25, px: 1, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                      Confirmar
                    </Button>
                    <Button size="small" variant="text"
                      onClick={() => handleDismiss(field)}
                      startIcon={<IconX size={12} />}
                      sx={{ fontSize: '0.7rem', py: 0.25, color: 'text.secondary' }}>
                      Ignorar
                    </Button>
                  </Stack>
                </Box>
              );
            })}

            {/* Campos manuais e confirmados */}
            {children}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

function getFreshness(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return 'há 2 dias';
  if (days <= 14) return `há ${days} dias`;
  return `há ${days} dias ⚠️`;
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    description: 'Descrição',
    brand_colors: 'Cores da marca',
    personality_traits: 'Traços de personalidade',
    tone_description: 'Tom de voz',
    formality_level: 'Grau de formalidade',
    emoji_usage: 'Uso de emojis',
    approved_terms: 'Termos aprovados',
    pillars: 'Pilares de conteúdo',
    keywords: 'Keywords',
    audience: 'Público-alvo',
    brand_promise: 'Promessa da marca',
    differentiators: 'Diferenciais',
    content_mix: 'Mix de conteúdo',
    must_mentions: 'Mencionar sempre',
    competitors: 'Concorrentes',
    strategic_dates: 'Datas estratégicas',
  };
  return labels[field] || field;
}
```

---

### 2.5 — Modificar a aba Perfil principal

**Arquivo a modificar**: `apps/web/app/clients/[id]/perfil/page.tsx`

Substituir a estrutura atual por:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconId, IconMicrophone2, IconChartBar, IconUsersGroup,
  IconShieldCheck, IconCalendarEvent, IconPlug
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import IntelligenceScoreBar from './IntelligenceScoreBar';
import ManualFieldsChecklist from './ManualFieldsChecklist';
import SectionEnrichmentCard from './SectionEnrichmentCard';
// ... forms de cada seção

export default function PerfilPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [clientData, setClientData] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>({});
  const [sectionsRefreshedAt, setSectionsRefreshedAt] = useState<any>({});
  const [enrichmentStatus, setEnrichmentStatus] = useState<string>('pending');
  const [intelligenceScore, setIntelligenceScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [client, sugg] = await Promise.all([
      apiGet(`/clients/${clientId}`),
      apiGet(`/clients/${clientId}/suggestions`),
    ]);
    setClientData(client);
    setSuggestions(sugg.profile_suggestions || {});
    setSectionsRefreshedAt(sugg.sections_refreshed_at || {});
    setEnrichmentStatus(sugg.enrichment_status || 'done');
    setIntelligenceScore(sugg.intelligence_score || 0);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll enquanto enriquecimento está rodando
  useEffect(() => {
    if (enrichmentStatus !== 'running') return;
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [enrichmentStatus, loadAll]);

  const profile = clientData?.profile || {};
  const kb = profile.knowledge_base || {};

  // Calcular campos manuais faltando
  const missingManualFields = [
    !profile.good_copy_examples?.length && 'good_copy_examples',
    !kb.forbidden_claims?.length && 'forbidden_claims',
    !profile.brand_colors?.length && 'brand_colors',
    !profile.logo_url && 'logo_url',
    !profile.strategic_dates?.filter((d: any) => d.type === 'client')?.length && 'strategic_dates_client',
    !profile.bad_copy_examples?.length && 'bad_copy_examples',
  ].filter(Boolean) as string[];

  // Contar total de sugestões pendentes
  const pendingCount = Object.values(suggestions).reduce((acc: number, section: any) => {
    return acc + Object.values(section?.fields || {}).filter((f: any) => f.status !== 'confirmed').length;
  }, 0);

  if (loading) return <Box sx={{ p: 3 }}>Carregando perfil...</Box>;

  return (
    <Box>
      {/* Score de inteligência */}
      <IntelligenceScoreBar
        score={intelligenceScore}
        pendingCount={pendingCount as number}
        missingManual={missingManualFields}
        clientId={clientId}
        lastRefreshed={clientData?.intelligence_refreshed_at}
        enrichmentStatus={enrichmentStatus}
      />

      {/* Campos que só o humano preenche */}
      <ManualFieldsChecklist
        missingFields={missingManualFields}
        onFieldClick={(field) => {
          // scroll para a seção correspondente e abre
          document.getElementById(`section-${field.section}`)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Seção: Identidade */}
      <SectionEnrichmentCard
        sectionKey="identity"
        title="Identidade"
        icon={<IconId size={18} />}
        suggestions={suggestions.identity?.fields}
        confirmedFields={{ description: kb.description, brand_colors: profile.brand_colors }}
        lastRefreshed={sectionsRefreshedAt.identity}
        clientId={clientId}
        onConfirmed={loadAll}
      >
        {/* Form de campos confirmados e manuais de identidade */}
        <IdentityForm clientId={clientId} profile={profile} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Tom de Voz */}
      <SectionEnrichmentCard
        sectionKey="voice"
        title="Tom de Voz"
        icon={<IconMicrophone2 size={18} />}
        suggestions={suggestions.voice?.fields}
        confirmedFields={{ tone_description: profile.tone_description }}
        lastRefreshed={sectionsRefreshedAt.voice}
        clientId={clientId}
        onConfirmed={loadAll}
      >
        <VoiceForm clientId={clientId} profile={profile} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Estratégia */}
      <SectionEnrichmentCard
        sectionKey="strategy"
        title="Estratégia de Conteúdo"
        icon={<IconChartBar size={18} />}
        suggestions={suggestions.strategy?.fields}
        confirmedFields={{ pillars: profile.pillars, keywords: profile.keywords }}
        lastRefreshed={sectionsRefreshedAt.strategy}
        clientId={clientId}
        onConfirmed={loadAll}
      >
        <StrategyForm clientId={clientId} profile={profile} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Concorrentes */}
      <SectionEnrichmentCard
        sectionKey="competitors"
        title="Concorrentes"
        icon={<IconUsersGroup size={18} />}
        suggestions={suggestions.competitors?.fields}
        confirmedFields={{ competitors: profile.competitors }}
        lastRefreshed={sectionsRefreshedAt.competitors}
        clientId={clientId}
        onConfirmed={loadAll}
      >
        <CompetitorsForm clientId={clientId} profile={profile} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Directives — manual only */}
      <SectionEnrichmentCard
        sectionKey="directives"
        title="Directives & Brand Safety"
        icon={<IconShieldCheck size={18} />}
        confirmedFields={{ forbidden_claims: kb.forbidden_claims, brand_directives: profile.brand_directives }}
        clientId={clientId}
        isManualOnly
        onConfirmed={loadAll}
      >
        <DirectivesForm clientId={clientId} profile={profile} kb={kb} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Calendário */}
      <SectionEnrichmentCard
        sectionKey="calendar"
        title="Calendário Estratégico"
        icon={<IconCalendarEvent size={18} />}
        suggestions={suggestions.calendar?.fields}
        confirmedFields={{ strategic_dates: profile.strategic_dates }}
        lastRefreshed={sectionsRefreshedAt.calendar}
        clientId={clientId}
        onConfirmed={loadAll}
      >
        <CalendarForm clientId={clientId} profile={profile} onSaved={loadAll} />
      </SectionEnrichmentCard>

      {/* Seção: Conectores */}
      <SectionEnrichmentCard
        sectionKey="connectors"
        title="Conectores"
        icon={<IconPlug size={18} />}
        confirmedFields={{ reportei_url: clientData?.reportei_url }}
        clientId={clientId}
        isManualOnly
        onConfirmed={loadAll}
      >
        {/* Componente existente de conectores */}
      </SectionEnrichmentCard>
    </Box>
  );
}
```

---

## Ordem de implementação recomendada

### Fase 1 — Backend fundação
1. Criar migration `0130_client_profile_intelligence.sql`
2. Criar `clientEnrichmentService.ts` com as 5 seções
3. Registrar worker `client.enrich` no `queueService.ts`
4. Adicionar gatilho no `POST /clients` (create)
5. Adicionar endpoints `GET /suggestions`, `POST /suggestions/confirm`, `DELETE /suggestions/:section/:field`, `POST /enrich`
6. Atualizar `assembleKnowledgeBlock` no `copyService.ts`

### Fase 2 — Frontend core
7. Criar `IntelligenceScoreBar.tsx`
8. Criar `ManualFieldsChecklist.tsx`
9. Criar `SectionEnrichmentCard.tsx`
10. Modificar `perfil/page.tsx` para orquestrar tudo

### Fase 3 — Forms por seção
11. Criar `IdentityForm.tsx` (nome, website, logo, cores — upload e color picker)
12. Criar `VoiceForm.tsx` (tom, exemplos de copy, palavras proibidas)
13. Criar `StrategyForm.tsx` (pilares, keywords, público, mix)
14. Criar `CompetitorsForm.tsx` (lista editável com toggle de monitoramento)
15. Criar `DirectivesForm.tsx` (brand safety — somente manual)
16. Criar `CalendarForm.tsx` (datas IA + datas do cliente)

### Fase 4 — Automação
17. Adicionar gatilho no `PATCH /clients/:id` para campos que afetam enriquecimento
18. Criar `scheduledEnrichment.ts` e registrar cron

---

## Notas finais para o Codex

- **Nunca sobrescrever confirmado**: a lógica de `applyFieldToProfile` só roda quando humano confirma — nunca no enrichment automático
- **Graceful degradation**: se qualquer seção do enriquecimento falhar, as outras continuam. `enrichment_status = 'done'` mesmo que algumas seções falharam (registrar no log)
- **Custo de enriquecimento**: usa Gemini (barato) para identity, strategy, competitors, calendar — apenas 1 chamada Claude para voice. Custo total ~$0.01–0.03 por cliente por enriquecimento
- **Não bloquear o create**: o enriquecimento é fire-and-forget. O `POST /clients` responde normalmente e o job roda em background
- **Testar o build**: `cd apps/web && npx next build` antes de deploy
- **Deploy backend primeiro**: as migrations e novos endpoints precisam estar up antes do frontend novo
- **Deploy backend**: `railway up --service edro-backend --detach`
- **Deploy frontend**: `railway up --service edro-web --detach`
