# Edro Web — Admin Dashboard

Este app Next.js (App Router) é o front de administração do Edro.

## Estrutura

- `app/(auth)/login` — login admin (consome `/auth/login`)
- `app/admin` — layout do painel
  - `/admin/dashboard` — visão geral (consome `/admin/metrics/daily`)
  - `/admin/drops` — lista drops (GET `/drops`)
  - `/admin/blueprints` — lista blueprints (GET `/admin/debug/blueprints`)
  - `/admin/rag` — lista blocos de RAG (GET `/admin/rag/blocks`)
  - `/admin/harvest` - lista itens coletados (GET `/admin/harvest/items`, usa harvested_content)
  - `/admin/scrapers` — gerenciamento de scrapers (GET `/harvest/sources`, POST `/harvest/run`)
  - `/admin/editais` — gerenciamento de editais (GET `/editais`)
  - `/admin/questoes` — sistema de questões
  - `/admin/simulados` — simulados adaptativos
  - `/admin/recco-engine` — motor de recomendações
  - `/admin/analytics` — análises e métricas
  - `/admin/users` — lista usuários (GET `/admin/users`)
  - `/admin/costs` — custos operacionais

## Integração com backend

Defina no `.env` do app web:

```env
NEXT_PUBLIC_API_URL=https://seu-backend-no-railway.com
```

O helper `lib/api.ts` usa esse valor e injeta `Authorization: Bearer <token>`
a partir do `localStorage.edro_token`.

O login em `/login` espera que o backend responda algo como:

```json
{ "token": "jwt-aqui" }
```

e guarda esse token no `localStorage`.

## Como rodar localmente

Na pasta `apps/web`:

```bash
npm install
npm run dev
```

## Proteção das rotas admin

O componente `AdminShell`:

- Lê `localStorage.edro_token`
- Se não existir e a rota começar com `/admin`, redireciona para `/login`.

Você pode evoluir isso depois para um esquema mais robusto com cookies / middleware.
