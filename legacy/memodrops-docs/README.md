# MemoDrops Monorepo

Estrutura base:
- `apps/backend` — API Fastify (Node/TS)
- `apps/web` — Frontend web (Next.js/React)
- `apps/mobile` — App mobile (Expo/React Native)
- `apps/scrapers` — Scrapers de editais/bancas
- `apps/ai` — Serviços de IA (pipelines, workers)
- `packages/shared` — Tipos/utilitários compartilhados
- `docs` — Documentação

## Roadmap das 7 Fases
O alinhamento completo aos 49 capítulos está em `docs/roadmap-fases.md`.  
Use esse arquivo como fonte única de fases, critérios de conclusão e checklist de progresso.

## Ambiente local rápido
1) Já deixei um `.env` na raiz. Ajuste apenas `OPENAI_API_KEY` com sua chave.  
2) Para subir tudo (Postgres, Redis, backend, web):  
   - Windows/PowerShell: `.\scripts\start-local.ps1`  
3) Para derrubar:  
   - Windows/PowerShell: `.\scripts\stop-local.ps1`  
Serviços: backend em http://localhost:3333/health e web em http://localhost:3000.***
