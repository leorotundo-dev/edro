# Stage 20 — RAG Feeder (Alimentação de Contexto RAG)

**Commit:** `e870445`  
**Data:** Nov 25, 2025  
**Status:** ✅ Completo

---

## 📋 Resumo Executivo

Stage 20 implementa o **RAG Feeder**, um sistema de alimentação automática de contexto RAG que busca conteúdo de fontes educativas externas, gera resumos com IA e os armazena em `rag_blocks` para melhorar a qualidade das respostas de IA.

Este stage transforma o sistema RAG em um **sistema alimentado por conteúdo externo**, permitindo que a IA tenha acesso a conhecimento atualizado e relevante para concursos públicos.

---

## 🏗️ Arquitetura

### Fluxo de Alimentação RAG

```
Startup do Backend
    ↓
initializeScheduler()
    ├─ Buscar job_schedule
    ├─ Registrar rag-feeder job
    └─ Agendar execução automática
    ↓
Cron Dispara (diariamente às 2h)
    ├─ Buscar lista de URLs educativas
    ├─ Para cada URL:
    │  ├─ Buscar HTML
    │  ├─ Extrair texto limpo
    │  ├─ Gerar resumo com IA
    │  └─ Salvar em rag_blocks
    └─ Registrar log
    ↓
rag_blocks (com summary preenchido)
    ↓
Usado em RAG context para melhorar respostas
```

### Componentes Implementados

#### 1. **Pipeline de Resumo** (`services/ai/summarizeRAG.ts`)

**Função:** `summarizeRAGBlock(input)`
- Recebe conteúdo HTML extraído
- Gera resumo didático com IA
- Otimizado para concursos públicos
- Temperature 0.3 (respostas consistentes)

**Input:**
```typescript
{
  disciplina: string;
  topicCode: string;
  topicName: string;
  banca?: string;
  sourceUrl: string;
  content: string;
}
```

**Output:**
```typescript
{
  summary: string;
}
```

#### 2. **Prompt de Resumo** (`prompts/summarizeRAG.prompt.txt`)

**Características:**
- ✅ Linguagem simples e objetiva
- ✅ Focado em concursos públicos
- ✅ Evita detalhes irrelevantes
- ✅ Sem markdown, apenas texto corrido
- ✅ Sem citação de fontes

**Exemplo:**
```
Você é um professor de concursos públicos.
Sua tarefa é ler o texto fornecido e devolver
UM RESUMO didático, curto e objetivo...
```

#### 3. **Job RAG Feeder** (`jobs/rag-feeder.ts`)

**Fluxo:**
1. Busca lista estática de URLs educativas
2. Para cada URL:
   - Verifica se já existe em `rag_blocks`
   - Busca HTML da URL
   - Extrai texto limpo (remove scripts, styles, tags)
   - Valida tamanho mínimo (500 caracteres)
   - Gera resumo com IA
   - Insere em `rag_blocks`

**Características:**
- ✅ Deduplicação automática
- ✅ Validação de conteúdo
- ✅ Limpeza de HTML robusta
- ✅ Tratamento de erros
- ✅ Logging detalhado

#### 4. **Integração no Scheduler** (`scheduler/jobScheduler.ts`)

**Função:** `ragFeederJob()`
- Integrada no scheduler com node-cron
- Executa automaticamente conforme agendamento
- Registra logs em `job_logs`
- Suporta execução manual via API

**Agendamento Padrão:**
```sql
('rag-feeder', '0 2 * * *', true)  -- Diariamente às 2h da manhã
```

---

## 📊 Fontes Padrão

Inseridas automaticamente:

| Disciplina | Tópico | URL |
|-----------|--------|-----|
| Português | PT-01 Morfologia | brasilescola.uol.com.br/gramatica/morfologia.htm |
| Direito Constitucional | DC-01 Constituição Federal | todamateria.com.br/constituicao-federal/ |

**Como Adicionar Novas Fontes:**
1. Editar `RAG_SOURCES` em `scheduler/jobScheduler.ts`
2. Adicionar objeto com disciplina, topicCode, topicName, sourceUrl
3. Fazer deploy

---

## 🔄 Fluxo Completo

### 1. Execução Automática (Cron)
```
[scheduler] ⏰ Executando job: rag-feeder
[scheduler] Iniciando job: rag-feeder
[scheduler] Processando: PT-01 - Morfologia
[scheduler] Buscando: https://brasilescola.uol.com.br/gramatica/morfologia.htm
[scheduler] Gerando resumo com IA...
[scheduler] ✅ Bloco inserido em rag_blocks.
[scheduler] ✅ Job rag-feeder finalizado: 2 processados, 0 falhas
```

### 2. Execução Manual (API)
```bash
curl -X POST http://localhost:3333/api/jobs/run/rag-feeder
```

**Resposta:**
```json
{
  "message": "Job rag-feeder iniciado",
  "jobName": "rag-feeder"
}
```

### 3. Execução Manual (CLI)
```bash
npm run job:rag-feeder
```

### 4. Consultar Status
```bash
curl http://localhost:3333/api/jobs/logs?jobName=rag-feeder | jq
```

---

## 📂 Arquivos Criados/Modificados

### Novos Arquivos
- `apps/ai/prompts/summarizeRAG.prompt.txt` - Prompt de resumo
- `apps/ai/src/pipelines/summarizeRAGBlock.ts` - Pipeline de resumo (AI app)
- `apps/backend/src/jobs/rag-feeder.ts` - Job de alimentação
- `apps/backend/src/services/ai/summarizeRAG.ts` - Wrapper de resumo (backend)

### Arquivos Modificados
- `apps/ai/src/index.ts` - Adicionado export de summarizeRAGBlock
- `apps/backend/src/scheduler/jobScheduler.ts` - Integrado ragFeederJob
- `apps/backend/src/db/migrations/0003_stage19_tables.sql` - Adicionado agendamento
- `apps/backend/package.json` - Adicionado script job:rag-feeder
- `apps/backend/tsconfig.json` - Adicionado path mapping

### Total
- **4 arquivos novos** (480 linhas)
- **5 arquivos modificados**
- **Build:** ✅ Sem erros TypeScript

---

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Rodar em desenvolvimento
npm run dev

# Logs do rag-feeder
[scheduler] Inicializando scheduler de jobs...
[scheduler] Agendando job: rag-feeder com cron: 0 2 * * *
```

### Executar Manualmente

```bash
# Via API
curl -X POST http://localhost:3333/api/jobs/run/rag-feeder

# Via CLI
npm run job:rag-feeder
```

### Consultar Logs

```bash
# Logs do rag-feeder
curl http://localhost:3333/api/jobs/logs?jobName=rag-feeder | jq

# Último log
curl http://localhost:3333/api/jobs/logs/rag-feeder/latest | jq
```

### Adicionar Novas Fontes

Editar `RAG_SOURCES` em `scheduler/jobScheduler.ts`:

```typescript
const RAG_SOURCES = [
  {
    disciplina: 'Sua Disciplina',
    topicCode: 'XX-01',
    topicName: 'Seu Tópico',
    banca: null,
    sourceUrl: 'https://sua-url-educativa.com'
  }
];
```

---

## 📋 Tabelas Utilizadas

### rag_blocks
- `id` - PK
- `disciplina` - Disciplina
- `topic_code` - Código do tópico
- `banca` - Banca (opcional)
- `source_url` - URL da fonte
- `summary` - Resumo gerado pela IA
- `embedding` - Embedding (NULL por enquanto)
- `created_at` - Timestamp

### job_logs
- Registra todas as execuções
- Status, items processados, falhas
- Mensagens de erro

### job_schedule
- Configuração do agendamento
- Cron expression
- Ativo/inativo

---

## ✅ Checklist de Implementação

- [x] Criar pipeline de resumo com IA
- [x] Criar prompt de resumo didático
- [x] Implementar job rag-feeder
- [x] Integrar no scheduler
- [x] Adicionar execução manual
- [x] Adicionar agendamento padrão
- [x] Corrigir imports e tipos
- [x] Fazer build sem erros
- [x] Fazer commit e push
- [x] Documentar Stage 20

---

## 🔗 Referências

- **Commit:** https://github.com/leorotundo-dev/memodrops/commit/e870445
- **Branch:** main
- **Documentação:** docs/STAGE_20_COMPLETO.md

---

## 📌 Notas Importantes

1. **Tamanho Mínimo:** Conteúdo extraído deve ter pelo menos 500 caracteres
2. **Deduplicação:** Verifica se já existe antes de processar
3. **Limpeza HTML:** Remove scripts, styles e tags HTML
4. **Temperature:** 0.3 para respostas mais consistentes
5. **Timeout:** Sem timeout específico, mas pode levar alguns segundos por URL
6. **Erros:** Continua processando outras fontes mesmo se uma falhar

---

## 🎯 Métricas de Sucesso

- ✅ Backend compila sem erros
- ✅ Job rag-feeder executa corretamente
- ✅ Resumos são gerados com IA
- ✅ Dados salvos em rag_blocks
- ✅ Logs registrados em job_logs
- ✅ Execução manual funciona
- ✅ Agendamento automático funciona

---

## 🚀 Próximos Passos (Stages 21+)

### Stage 21: Embedding Generation
- Gerar embeddings para rag_blocks
- Usar modelo de embedding (OpenAI, local)
- Armazenar embeddings no banco

### Stage 22: RAG Search
- Implementar busca por similaridade
- Usar embeddings para encontrar contexto relevante
- Integrar com geração de drops

### Stage 23: RAG Context Injection
- Injetar contexto RAG nas prompts de IA
- Melhorar qualidade das respostas
- Validar com testes

---

**Status:** ✅ COMPLETO E PRONTO PARA PRODUÇÃO

Próximo Stage: 21 (Embedding Generation)
