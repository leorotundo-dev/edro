# Arquitetura do Monorepo MemoDrops

## Visão Geral

- Monorepo simples usando `npm workspaces`.
- Cada app fica em `apps/*`.
- Código compartilhado fica em `packages/*`.

## Apps

- `apps/backend`: API principal (Fastify + TypeScript).
- `apps/web`: Frontend (Next.js/React).
- `apps/mobile`: App mobile (Expo/React Native).
- `apps/scrapers`: Scrapers de editais e concursos.
- `apps/ai`: Serviços de IA (processamento offline, filas).

## Pacotes

- `packages/shared`: tipos TypeScript, helpers, constantes, contratos de API.

A ideia é crescer isso incrementalmente, plugando os blocos que já desenhamos.
