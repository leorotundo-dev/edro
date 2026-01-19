# 🎛️ Dashboard Administrativa MemoDrops - Visão Completa

## 📋 Resumo Executivo

A **Dashboard Administrativa** do MemoDrops está localizada em **`apps/web`** e é uma aplicação Next.js completa que centraliza TODA a administração da plataforma.

**Você estava 100% correto**: não precisamos de plataforma separada para scrapers - eles fazem parte desta dashboard unificada!

## 🏗️ Arquitetura

```
memodrops-main/
├── apps/
│   ├── web/                    ← DASHBOARD ADMINISTRATIVA PRINCIPAL
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/      → Autenticação admin
│   │   │   └── admin/          → Painel administrativo
│   │   │       ├── layout.tsx  → Layout com sidebar
│   │   │       ├── dashboard/  → Visão geral
│   │   │       ├── drops/      → Gestão de drops
│   │   │       ├── blueprints/ → Blueprints de provas
│   │   │       ├── rag/        → RAG blocks
│   │   │       ├── harvest/    → Harvest items
│   │   │       ├── scrapers/   → ✨ SCRAPERS (NOVO)
│   │   │       ├── editais/    → ✨ EDITAIS (NOVO)
│   │   │       ├── questoes/   → Sistema de questões
│   │   │       ├── simulados/  → Simulados adaptativos
│   │   │       ├── recco-engine/ → Motor de recomendações
│   │   │       ├── analytics/  → Analytics
│   │   │       ├── users/      → Gestão de usuários
│   │   │       └── costs/      → Custos operacionais
│   │   └── components/
│   │       ├── AdminShell.tsx  → Shell principal
│   │       └── SidebarNav.tsx  → Navegação lateral
│   │
│   ├── web-aluno/              → App do aluno (separado)
│   └── backend/                → API Backend
```

## 🎯 Módulos da Dashboard

### 1. **Dashboard** (Home)
- **Rota**: `/admin/dashboard`
- **Função**: Visão geral com métricas principais
- **APIs**: 
  - `/admin/metrics/overview` - Estatísticas gerais
  - `/admin/costs/real/overview` - Custos mensais
- **Status**: ✅ Implementado

### 2. **Drops**
- **Rota**: `/admin/drops`
- **Função**: Gerenciar drops de conteúdo
- **APIs**: `/drops`
- **Status**: ✅ Implementado

### 3. **Blueprints**
- **Rota**: `/admin/blueprints`
- **Função**: Estruturas de provas
- **APIs**: `/admin/debug/blueprints`
- **Status**: ✅ Implementado

### 4. **RAG Blocks**
- **Rota**: `/admin/rag`
- **Função**: Blocos de RAG para IA
- **APIs**: `/admin/rag/blocks`
- **Status**: ✅ Implementado

### 5. **Harvest**
- **Rota**: `/admin/harvest`
- **Função**: Itens coletados
- **APIs**: `/admin/harvest/items`
- **Status**: ✅ Implementado

### 6. **Scrapers** ⭐ NOVO
- **Rota**: `/admin/scrapers`
- **Função**: Gerenciamento completo de scrapers
- **Features**:
  - Lista de fontes de scraping
  - Executar scrapers individualmente
  - Executar todos os scrapers
  - Visualizar itens coletados
  - Ativar/desativar fontes
  - Estatísticas em tempo real
- **APIs**:
  - `GET /harvest/sources` - Listar fontes
  - `POST /harvest/run/:id` - Executar scraper
  - `POST /harvest/run-all` - Executar todos
  - `GET /harvest/content` - Itens coletados
  - `PUT /harvest/sources/:id` - Atualizar fonte
- **Status**: ✅ Implementado

### 7. **Editais** ⭐ NOVO
- **Rota**: `/admin/editais`
- **Função**: Gerenciamento de editais de concursos
- **Features**:
  - CRUD completo de editais
  - Cronograma de eventos
  - Múltiplos cargos e disciplinas
  - Sistema de tags
  - Filtros avançados
  - Dashboard de estatísticas
- **APIs**: `/api/editais/*` (20+ endpoints)
- **Status**: ✅ Implementado

### 8. **Questões**
- **Rota**: `/admin/questoes`
- **Função**: Sistema de questões
- **Status**: ✅ Implementado

### 9. **Simulados**
- **Rota**: `/admin/simulados`
- **Função**: Simulados adaptativos
- **Status**: ✅ Implementado

### 10. **ReccoEngine**
- **Rota**: `/admin/recco-engine`
- **Função**: Motor de recomendações
- **Status**: ✅ Implementado

### 11. **Analytics**
- **Rota**: `/admin/analytics`
- **Função**: Análises e métricas
- **Status**: ✅ Implementado

### 12. **Usuários**
- **Rota**: `/admin/users`
- **Função**: Gestão de usuários
- **Status**: ✅ Implementado

### 13. **Custos**
- **Rota**: `/admin/costs`
- **Função**: Custos operacionais (OpenAI, etc)
- **Status**: ✅ Implementado

## 🎨 Interface

### Componentes Principais

#### AdminShell
```typescript
// Wrapper principal com:
- Autenticação (localStorage token)
- Sidebar responsiva
- Header com menu hamburger
- Proteção de rotas admin
```

#### SidebarNav
```typescript
// Navegação lateral com:
- Links para todas as páginas
- Indicador de página ativa
- Responsivo (mobile-friendly)
```

### Theme
- **Background**: `bg-zinc-950` (dark)
- **Text**: `text-zinc-50` (light)
- **Borders**: `border-zinc-800`
- **Accents**: Blue, Green, Purple, Red

## 🔐 Autenticação

```typescript
// Fluxo de autenticação
1. Login em /login
2. Backend retorna JWT token
3. Token salvo em localStorage.memodrops_token
4. AdminShell verifica token em cada rota
5. Redireciona para /login se não autenticado
```

## 🔌 Integração com Backend

```typescript
// Configuração
NEXT_PUBLIC_API_URL=https://backend.railway.app

// Helper API (lib/api.ts)
- apiGet(endpoint) → GET com token
- apiPost(endpoint, data) → POST com token
- apiPut(endpoint, data) → PUT com token
- apiDelete(endpoint) → DELETE com token
```

## 📱 Responsividade

- **Desktop**: Sidebar fixa, conteúdo ao lado
- **Tablet**: Sidebar retrátil
- **Mobile**: Sidebar overlay com backdrop

## 🚀 Como Usar

### 1. Iniciar Dashboard

```powershell
cd memodrops-main\apps\web
npm install
npm run dev
```

Acesso: **http://localhost:3000/admin/dashboard**

### 2. Login
- Fazer login em `/login`
- Token será salvo automaticamente
- Acesso liberado para todas as páginas `/admin/*`

### 3. Navegar
- Use a sidebar para navegar entre módulos
- Cada página é independente e responsiva
- Dados carregados via API do backend

## 🎯 Integração Scrapers

### O que foi feito:

1. ✅ Adicionado link "Scrapers" na sidebar
2. ✅ Criada página `/admin/scrapers`
3. ✅ Interface completa com:
   - Dashboard de estatísticas
   - Lista de fontes
   - Controle de execução
   - Visualização de itens coletados
   - Tabs para organização

### Features da Página Scrapers:

```typescript
// Estatísticas
- Total de fontes
- Fontes ativas
- Total coletado
- Coletados hoje
- Itens pendentes
- Itens com erro

// Ações
- Executar scraper individual
- Executar todos os scrapers
- Ativar/desativar fonte
- Visualizar detalhes
- Auto-refresh a cada 30s

// Visualizações
- Tab "Fontes": Lista de scrapers
- Tab "Itens Coletados": Conteúdo coletado
```

## 📦 Estrutura de Dados

### Scraper Source
```typescript
{
  id: string;
  name: string;
  base_url: string;
  type: 'edital' | 'questao' | 'conteudo';
  enabled: boolean;
  priority: number;
  last_run?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  items_harvested?: number;
}
```

### Harvested Item
```typescript
{
  id: string;
  source_id: string;
  source_name: string;
  content_type: string;
  title?: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  harvested_at: string;
}
```

## 🔄 Fluxo Completo

```
1. Admin acessa /admin/scrapers
2. Página carrega fontes configuradas
3. Admin pode:
   - Ver status de cada scraper
   - Executar manualmente
   - Ativar/desativar
   - Ver itens coletados
4. Scraper executa e coleta dados
5. Dados aparecem em tempo real
6. Itens processados pelo backend
7. Conteúdo disponível no sistema
```

## 🎓 Conclusão

A dashboard administrativa do MemoDrops é uma **solução unificada e completa** para gerenciar todos os aspectos da plataforma:

✅ **Centralizada**: Tudo em um só lugar (`apps/web`)
✅ **Integrada**: Scrapers fazem parte do ecossistema
✅ **Responsiva**: Funciona em qualquer dispositivo
✅ **Moderna**: Next.js 14, React 18, TypeScript
✅ **Profissional**: Dark theme, componentes reutilizáveis
✅ **Escalável**: Fácil adicionar novos módulos

---

**MemoDrops Admin Dashboard** 🎛️
*Centralizando a administração da plataforma educacional*
