# 🤖 Jarvis Intelligence System - Edro Planning

## 📋 Visão Geral

O **Jarvis** é um sistema de inteligência estratégica para a Planning Page da Edro que integra múltiplas fontes de dados (passado, presente e futuro) para auxiliar planners na criação de estratégias, campanhas e conteúdo.

### Principais Funcionalidades

- ✅ **Intelligence Context** - Agregação automática de dados de Library, Clipping, Social, Calendar, Performance
- ✅ **Opportunity Detection** - Detecção automática de oportunidades de clipping, social trends e eventos
- ✅ **Anti-Repetition Engine** - Validação semântica para prevenir repetição de copies
- ✅ **Multi-Agent AI** - Orquestração de Gemini, Claude e OpenAI para criação colaborativa
- ✅ **3-Column UI** - Layout otimizado (Context + Main Work + Outputs)
- ✅ **Real-time Validation** - Validação debounced de copy com badges visuais

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│           JARVIS INTELLIGENCE SYSTEM            │
├─────────────────────────────────────────────────┤
│                                                  │
│  PASSADO          PRESENTE         FUTURO       │
│  ├─ Library       ├─ Calendar      ├─ Opport.   │
│  ├─ Clipping      ├─ Profile       ├─ Briefings │
│  ├─ Performance   ├─ Social        ├─ Roadmap   │
│  └─ Copy History  └─ Connectors    └─ Predict.  │
│                                                  │
│              ↓                                   │
│    Intelligence Engine                          │
│    (Context Builder + Token Budget)             │
│              ↓                                   │
│    Multi-Agent AI Orchestrator                  │
│    (Gemini → Claude → OpenAI)                   │
│              ↓                                   │
│    Validation & Output                          │
│    (Anti-Repetition + Brand Safety)             │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

### Backend

```
apps/backend/src/
├── services/
│   ├── intelligenceEngine.ts       # Core: agrega dados de todas as fontes
│   ├── antiRepetitionEngine.ts     # Detecção de repetição semântica
│   └── ai/
│       └── copyOrchestrator.ts     # Multi-provider AI
│
├── jobs/
│   └── opportunityDetector.ts      # Detecção automática de oportunidades
│
├── routes/
│   └── planning.ts                 # Rotas da Planning Page
│
└── db/migrations/
    └── 0150_jarvis_intelligence.sql # Schema changes
```

### Frontend

```
apps/web/app/clients/[id]/planning/
├── PlanningClient.tsx              # Main component (3-column layout)
│
└── components/
    ├── ContextPanel.tsx            # Stats de inteligência
    ├── InsumosList.tsx             # Library + Clipping browser
    ├── OpportunitiesList.tsx       # AI opportunities cards
    ├── AIAssistant.tsx             # Chat interface
    ├── OutputsList.tsx             # Briefings + Copies
    └── AntiRepetitionValidator.tsx # Copy validation
```

---

## 🚀 Setup e Instalação

### 1. Pré-requisitos

- PostgreSQL com extensão **pgvector**
- Node.js 18+
- pnpm

### 2. Instalar pgvector

```bash
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# macOS (Homebrew)
brew install pgvector

# Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password pgvector/pgvector:pg15
```

### 3. Habilitar extensão no banco

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Rodar migration

```bash
cd apps/backend
npm run db:migrate
```

Isso irá executar a migration `0150_jarvis_intelligence.sql` que adiciona:

- `edro_copy_versions.output_hash` (TEXT)
- `edro_copy_versions.embedding` (vector(1536))
- `ai_opportunities.opportunity_hash` (TEXT)
- `ai_opportunities.score` (NUMERIC)
- `ai_opportunities.trending_up` (BOOLEAN)
- `edro_briefings.source_opportunity_id` (UUID)
- Índices IVFFlat para busca vetorial

### 5. Configurar variáveis de ambiente

```bash
# apps/backend/.env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

DATABASE_URL=postgresql://user:password@localhost:5432/edro
```

---

## 📖 Uso da Planning Page

### 1. Stats Bar (Topo)

- **Mode Switch**: Alternar entre "Exploração" e "Execução"
- **Stats Chips**: Library count, Clipping matches, Oportunidades ativas
- **Refresh Button**: Recarregar contexto de inteligência

### 2. Coluna Esquerda: Context & Insumos

#### ContextPanel
- Mostra stats visuais: Library, Clipping, Social, Eventos, Oportunidades
- Top keywords do clipping
- Badge vermelho se houver oportunidades urgentes

#### InsumosList
- **Tabs**: Library | Clipping
- Upload de arquivos (PDF, DOCX, TXT)
- Adicionar links de referência
- Click em item para adicionar ao contexto do chat

### 3. Coluna Central: AI Assistant & Opportunities

#### AIAssistant
- **Mode Switch**: Comandos | Chat
- **Provider Selector**: OpenAI, Claude, Gemini, Collaborative
- **Quick Prompts**: Sugestões rápidas
- **Stepper Visual**: Quando collaborative mode (Gemini → OpenAI → Claude)
- Indicador de contexto carregado (✓)

#### OpportunitiesList
- Cards de oportunidades com:
  - Source icon (clipping/social/calendar)
  - Priority badge (urgent/high/medium/low)
  - Confidence score (0-100%)
  - Descrição e ação sugerida
- **Ações**: "Criar Briefing" | "Dismiss"
- **Filtro**: Todas | Urgentes | Alta
- **Botão**: "Detectar Novas" - Scan manual

### 4. Coluna Direita: Outputs & Validation

#### OutputsList
- **Tabs**: Briefings | Copies
- Lista de briefings recentes com status
- Lista de copies geradas com preview
- Click para visualizar

#### Copy Validation
- Campo de texto para colar copy
- Validação automática debounced (1s após digitação)
- **Badges**:
  - ✅ Original (verde) - Similarity < 70%
  - ⚠️ Similar (amarelo) - Similarity 70-85%
  - ❌ Repetido (vermelho) - Similarity > 85%
  - 🚫 Violação (vermelho) - Negative keywords detectados
- Expansível para ver copies similares
- Botão "Forçar Aprovação" se review necessária

#### Notes
- Campo de texto livre para notas estratégicas
- Botão "Salvar notas"

---

## 🔌 API Endpoints

### POST /clients/:clientId/planning/context

Carrega contexto de inteligência completo.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "context": { /* IntelligenceContext */ },
    "stats": {
      "library": { "totalItems": 10 },
      "clipping": { "totalMatches": 5, "topKeywords": ["AI", "sustentabilidade"] },
      "social": { "totalMentions": 120, "sentimentAvg": 75 },
      "calendar": { "next14Days": 3, "highRelevance": 1 },
      "opportunities": { "active": 8, "urgent": 2, "highConfidence": 5 },
      "briefings": { "recent": 12, "pending": 3 },
      "copies": { "recentHashes": 45, "usedAngles": 20 }
    }
  }
}
```

---

### POST /clients/:clientId/planning/validate-copy

Valida copy para repetição e brand safety.

**Request:**
```json
{
  "copyText": "Texto da copy a ser validado..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isOriginal": false,
    "similarityScore": 0.87,
    "matchedCopies": [
      {
        "id": "uuid",
        "output": "Copy similar anterior...",
        "similarity": 0.87,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "recommendation": "review",
    "reason": "Copy tem 87% de similaridade com 1 versão anterior",
    "brandSafetyViolations": []
  }
}
```

**Recommendations:**
- `approve` - Copy original (similarity < 70%)
- `review` - Copy similar (similarity 70-85%)
- `reject` - Copy repetida (similarity > 85%) ou violation

---

### POST /clients/:clientId/planning/opportunities/detect

Detecta novas oportunidades de clipping, social e calendar.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inserted": 5,
    "sources": {
      "clipping": 2,
      "social": 1,
      "calendar": 2
    }
  }
}
```

**Critérios de detecção:**
- **Clipping**: score > 80, status NEW, últimos 7 dias
- **Social**: trending UP 30%+ (momentum crescente)
- **Calendar**: próximos 14 dias, relevance > 70

---

### POST /clients/:clientId/planning/opportunities/:oppId/action

Executa ação em uma opportunity.

**Request:**
```json
{
  "action": "create_briefing" | "dismiss"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "briefingId": "uuid",
    "opportunityId": "uuid",
    "status": "actioned"
  }
}
```

**Ações disponíveis:**
- `create_briefing` - Cria briefing linkado (source_opportunity_id)
- `dismiss` - Marca opportunity como dismissed

---

## ⚙️ Configuração Técnica

### Token Budget

O Intelligence Engine valida e trunca contexto para caber no token limit:

```typescript
// Threshold padrão: 8000 tokens
const maxTokens = 8000;

// Distribuição:
// - Library: máx 30% (2400 tokens)
// - Clipping: top 5 items
// - Social: top 5 trends
// - Opportunities: intacto (alta prioridade)
// - Calendar: next 14 days only
```

### Similarity Threshold

```typescript
// Anti-Repetition Engine
const threshold = 0.85; // padrão

// Classificação:
if (similarity >= 0.95) → "reject" (quase idêntica)
if (similarity >= 0.85) → "review" (similar)
if (similarity < 0.85) → "approve" (original)
```

### Temporal Scoring

Opportunities recebem boost baseado em proximidade temporal:

```typescript
if (daysAway <= 7) score += 10;  // Próximos 7 dias
if (daysAway <= 3) score += 10;  // Próximos 3 dias (extra)
```

### Deduplication

```typescript
// Opportunities: MD5 hash de title + description
const hash = MD5(title.toLowerCase() + description.toLowerCase());

// Copies: SHA256 hash de output
const hash = SHA256(output.toLowerCase().trim());
```

---

## 🔧 Troubleshooting

### "Failed to load context"

**Causa**: Backend não está rodando ou erro na API.

**Solução**:
```bash
cd apps/backend
npm run dev
```

Verificar logs do backend.

---

### "pgvector extension not found"

**Causa**: Extension pgvector não instalada no PostgreSQL.

**Solução**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Se não funcionar, instalar pgvector primeiro (ver Setup).

---

### "Validation always returns similarity 0"

**Causa**: Embeddings não foram gerados para copies anteriores.

**Solução**:
Executar script de backfill para gerar embeddings de copies existentes:

```bash
cd apps/backend
npm run scripts:backfill-embeddings
```

---

### "Opportunities not being detected"

**Causa**: Não há dados nas fontes (clipping, social, calendar).

**Solução**:
1. Verificar que há clipping items com score > 80
2. Verificar que há social_listening_trends recentes
3. Verificar que há events nos próximos 14 dias

---

### "Stats bar shows 0 everywhere"

**Causa**: Contexto não foi carregado corretamente.

**Solução**:
1. Click no botão "Refresh" no stats bar
2. Verificar console do browser para erros
3. Verificar que `/clients/:id/planning/context` está retornando dados

---

## 📊 Monitoramento

### Logs Estruturados

O sistema gera logs estruturados no backend:

```typescript
request.log?.info({
  action: 'intelligence_context_built',
  client_id: params.client_id,
  stats: {
    library: context.library.totalItems,
    opportunities: context.opportunities.active.length,
  },
  duration_ms: Date.now() - startTime,
});
```

### Métricas Recomendadas

- Context build time (p50, p95, p99)
- AI pipeline duration por stage
- Repetition detection accuracy
- Opportunity acceptance rate (actioned / total)
- Copy validation time

---

## 🚧 Roadmap Futuro

### Sprint 4 (Semana 4): Validação em Tempo Real + Polish
- ✅ Debounced validation implementada
- ✅ Badge system visual completo
- ⏳ Learning loop básico (performance → preferências)
- ⏳ Testes E2E (Playwright/Cypress)

### Fase 5: Learning Loop
- Integrar performance real dos posts publicados
- Feedback loop: copies com alta performance → boost similar angles
- A/B testing de estratégias

### Fase 6: Predictive Intelligence
- Predict best posting times baseado em histórico
- Suggest optimal content mix (awareness vs engagement vs conversion)
- Forecast campaign performance

### Fase 7: Multi-tenant Intelligence
- Cross-client insights (anonimizados)
- Industry benchmarks por segmento
- Trend detection cross-segment

---

## 👥 Contribuindo

### Code Style

- TypeScript strict: false
- MUI components preferred
- Functional components com hooks
- Async/await over promises

### Commit Messages

```
feat: add opportunity detector
fix: validation threshold not working
docs: update README with troubleshooting
```

---

## 📄 Licença

Propriedade de Edro.Digital - Todos os direitos reservados.

---

## 📞 Suporte

Para dúvidas ou problemas:
- Documentação técnica: `/docs/API_PLANNING.md`
- Plano completo: `C:\Users\leoro\.claude\plans\linear-wobbling-dove.md`

---

**Última atualização**: 2025-02-07
**Versão**: 1.0.0 (Sprint 1-3 completos)
