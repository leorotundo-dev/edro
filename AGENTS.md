# AGENTS.md — Edro / MemoDrops Monorepo

## Contexto do projeto
- Monorepo pnpm workspace
- Node.js 20 + TypeScript
- Backend: Fastify (`apps/backend`)
- Frontend: Next.js App Router + React + MUI (`apps/web`)
- Shared: `packages/shared`

## Objetivo operacional
Entregar correções e evoluções com foco em causa raiz, sem desvio de escopo, mantendo qualidade técnica e velocidade de execução.

## Regras mandatórias
1. Trabalhar apenas no escopo solicitado.
2. Não alterar estética/UI sem pedido explícito.
3. Não adicionar features fora da necessidade de negócio.
4. Priorizar correção de causa raiz.
5. Não vazar/mostrar segredos em logs/output.
6. Não tocar em `.env`, `apps/**/.env`, tokens, keys.
7. Evitar breaking changes; se inevitável, implementar fallback compatível.

## Limites padrão da tarefa
- Máximo de arquivos alterados: 8
- Máximo de linhas alteradas: 400
- Refatoração: limitada
- Renomear arquivos: apenas quando necessário
- API pública: sem breaking (ou com fallback)

## Exceção de escopo (acima de 8 arquivos / 400 linhas)
1. Não executar tudo de uma vez.
2. Propor plano em fases com objetivo, arquivos, estimativa, risco e rollback.
3. Entregar primeiro menor incremento funcional.
4. Validar e reportar ao fim de cada fase.
5. Big bang só se tecnicamente inevitável.
6. Big bang exige confirmação, rollback e checklist de validação.

## Áreas/pastas a ignorar
- node_modules/**
- apps/web/.next/**
- dist/**
- **/*.tsbuildinfo
- logs/**
- _temp*/**

## Fluxo obrigatório de execução
1) O que foi feito
2) Arquivos alterados
3) Como validar
4) Status do deploy

## Quando pausar e pedir confirmação
Somente para produto, migração/DDL, breaking, exclusão em massa, risco alto de deploy.

## Comandos oficiais
- pnpm install
- pnpm dev | pnpm dev:web | pnpm dev:backend
- pnpm build | pnpm build:web | pnpm build:backend
- pnpm lint
- tsc -p apps/web/tsconfig.json --noEmit

Obs: next lint está quebrado na versão atual do Next (16.1.6); preferir eslint direto no web.

## Deploy / Infra
- railway up --service edro-backend
- railway up --service edro-web
- Não vazar segredos/env.

## DoD
Concluir apenas com causa raiz corrigida + validação explícita + status de deploy (quando aplicável).

## Convenções
- Branch: fix/<assunto> | chore/<assunto>
- Commit: Conventional Commits

## Anti-padrões
Sem mudança cosmética sem pedido, sem feature creep, sem encerrar sem validar.

