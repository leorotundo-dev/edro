# System Go-Live Audit — 2026-04-06

## Objetivo

Auditoria de prontidão de produção do Edro para colocar o sistema inteiro no ar com o menor risco operacional possível.

Escopo auditado:

- `@edro/backend`
- `@edro/web`
- `@edro/web-cliente`
- `@edro/web-freelancer`
- autenticação, portais, operações, Trello, Jarvis/Studio, integrações, notificações e workers

## Estado Executivo

Status geral em `2026-04-06`:

- `Backend`: pronto estruturalmente
- `Admin web`: pronto após hardening de build
- `Portal cliente`: pronto estruturalmente
- `Portal freelancer`: pronto estruturalmente
- `Segurança de env/repo`: boa
- `Integrações`: endurecidas, mas ainda dependem de smoke test real por canal
- `QA automatizado`: insuficiente para chamar de cobertura ampla

Leitura objetiva:

- a base de deploy está forte
- o maior risco residual não é mais build
- o maior risco residual agora é `cobertura funcional incompleta` em fluxos críticos e a ausência de `readiness/health` mais profundo para produção

## Evidências Executadas

Validações que passaram durante esta auditoria:

```bash
pnpm --filter @edro/backend exec tsc --noEmit --pretty false
pnpm --filter @edro/backend build
pnpm --filter @edro/web exec tsc --noEmit --pretty false
pnpm --filter @edro/web-cliente exec tsc --noEmit --pretty false
pnpm --filter @edro/web-freelancer exec tsc --noEmit --pretty false
pnpm --filter @edro/web build
pnpm --filter @edro/web-cliente build
pnpm --filter @edro/web-freelancer build
pnpm security:repo
pnpm security:artifacts
```

Resultados:

- `backend build`: ok
- `web build`: ok, após hardening local de build
- `web-cliente build`: ok
- `web-freelancer build`: ok
- `security:repo`: ok
- `security:artifacts`: ok

## Hardening Aplicado Durante a Auditoria

### 1. Admin web build hardened

Problema encontrado:

- `@edro/web` falhava em build local com Turbopack
- erro: `Symlink [project]/node_modules is invalid, it points out of the filesystem root`

Correção aplicada:

- `apps/web/package.json`
  - `next build` -> `next build --webpack`
- `apps/web/next.config.mjs`
  - `outputFileTracingRoot: repoRoot`
- `apps/web-cliente/next.config.mjs`
  - `outputFileTracingRoot: repoRoot`
- `apps/web-freelancer/next.config.mjs`
  - `outputFileTracingRoot: repoRoot`

Efeito:

- o build do admin ficou determinístico localmente
- os frontends passaram a usar uma raiz de tracing explícita
- reduziu ruído de monorepo e risco de deploy quebrar por detecção ambígua de workspace

## Mapa de Risco por Domínio

### 1. Backend bootstrap e runtime

Arquivos principais:

- [index.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/index.ts)
- [server.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/server.ts)
- [jobsRunner.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/jobs/jobsRunner.ts)

Estado:

- `forte`, com ressalvas

Pontos positivos:

- migração automática na subida
- bootstrap de calendário isolado por `try/catch`
- webhooks Evolution auto-configurados
- CORS, JWT, rate limit e body limits aplicados no bootstrap
- `jobsRunner` evita overlap por worker

Riscos residuais:

- muitos workers no mesmo processo principal
- falhas de worker não derrubam a aplicação, o que é bom para disponibilidade, mas ruim para visibilidade se não houver monitoramento externo forte

### 2. Segurança de ambiente

Arquivos principais:

- [env.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/env.ts)
- [check-deploy-env.mjs](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/scripts/security/check-deploy-env.mjs)

Estado:

- `forte`

Pontos positivos:

- schema centralizado com `zod`
- bloqueios explícitos para produção/staging
- verificação de URLs, segredos inseguros e integrações parciais
- exigência de secrets para Gmail, Recall, Evolution, D4Sign e gateway

Risco residual:

- o código protege bem a configuração
- ainda depende de smoke test vivo para confirmar tokens ativos e webhooks externos funcionando

### 3. Health e observabilidade

Arquivos principais:

- [health.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/health.ts)
- [systemHealth.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/systemHealth.ts)
- [integrationHealthRoutes.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/integrationHealthRoutes.ts)

Estado:

- `parcial`

Pontos positivos:

- existe `system-health` para admin
- existe `integration monitor`
- existe status consolidado para gaps, conectores, alertas e sinais

Risco residual:

- `/health` é raso demais e sempre responde apenas `{ status: 'ok' }`
- para go-live completo, ainda falta um endpoint de readiness mais profundo com:
  - DB
  - Redis
  - workers críticos
  - integrações principais
  - última atividade por canal

### 4. Operações e Trello

Arquivos principais:

- [trello.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/trello.ts)
- [OperationsOverviewClient.tsx](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/web/app/admin/operacoes/OperationsOverviewClient.tsx)
- [OperationsJobsClient.tsx](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/web/app/admin/operacoes/jobs/OperationsJobsClient.tsx)
- [TRELLO_OPERATIONS_DATA_MODEL.md](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/docs/TRELLO_OPERATIONS_DATA_MODEL.md)

Estado:

- `forte`

Pontos positivos:

- Trello está tratado como fonte operacional
- filtro por ano vigente já foi aplicado em feeds relevantes
- Central de Operações passou por limpeza forte de IA, vistas e popup
- detalhamento do card reflete melhor briefing/checklists/comentários do Trello

Risco residual:

- precisa manter smoke test contínuo de sync bidirecional real
- operações dependem de bastante semântica derivada sobre cards/listas/status

### 5. Portais

Arquivos principais:

- [portalClient.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/portalClient.ts)
- [freelancers.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/freelancers.ts)
- `apps/web-cliente/app/*`
- `apps/web-freelancer/app/*`

Estado:

- `forte`, com risco moderado de regressão por fluxo complexo

Pontos positivos:

- portal cliente com capabilities por contato
- portal freelancer com onboarding, termos, extrato, agenda e studio
- builds dos dois portais passaram

Risco residual:

- falta cobertura automatizada mais forte dos fluxos:
  - onboarding
  - contrato
  - aprovação
  - entrega

### 6. Jarvis e Studio

Arquivos principais:

- [jarvis.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/jarvis.ts)
- [studioCreative.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/studioCreative.ts)
- [JARVIS_UNIFICATION_SPEC.md](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/docs/JARVIS_UNIFICATION_SPEC.md)

Estado:

- `forte`, mas com dependência alta de integrações e contexto

Pontos positivos:

- governança e permissões de tool foram endurecidas
- Jarvis global e capability criativa do Studio já estão mais próximos
- memória e integração multicanal estão melhores

Risco residual:

- fluxo é amplo demais para depender só de verificação manual esporádica
- precisa smoke test roteado por contexto real:
  - operações
  - cliente
  - briefing
  - publicação

### 7. WhatsApp, Gmail e reuniões

Arquivos principais:

- [notificationService.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/services/notificationService.ts)
- [gmailService.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/services/integrations/gmailService.ts)
- [gmailRoutes.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/gmailRoutes.ts)
- [integrationHealthRoutes.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/integrationHealthRoutes.ts)

Estado:

- `forte`, comparado ao que estava antes

Pontos positivos:

- Gmail endurecido para não ficar “conectado” sem watch saudável
- WhatsApp com fallback Meta -> Evolution
- colaboradores já resolvidos a partir do banco, não de lista fixa
- admin já enxerga readiness, bloqueio e teste por colaborador

Risco residual:

- entrega externa ainda depende de estado real dos provedores
- allowlist/bloqueio da Meta continua sendo risco fora do código

### 8. QA automatizado

Evidência:

- backend tem `10` testes unitários/integrados localizados
- e2e tem `6` specs Playwright

Estado:

- `fraco`

Pontos positivos:

- já existem bases de teste para auth, segurança, briefing e aprovação pública

Risco residual:

- cobertura insuficiente para o tamanho do sistema
- faltam e2e críticos para:
  - operações + Trello
  - portal cliente
  - portal freelancer
  - integrações de notificação
  - Jarvis contextual

## Achados Prioritários

### P0

1. `Health/readiness` ainda é superficial demais.
   - `/health` não prova nada além de processo vivo.

2. `QA automática` está abaixo do tamanho e criticidade do sistema.
   - poucas specs para uma malha de dezenas de rotas, workers e integrações.

3. `jobsRunner` concentra muita responsabilidade.
   - precisa de observabilidade mais explícita por worker.

### P1

1. `integrações externas` continuam exigindo smoke test vivo e recorrente.
2. `portais` precisam de cobertura automatizada de fluxos completos.

### P2

1. ampliar visibilidade de readiness no admin
2. documentar runbook operacional de incidentes
3. adicionar smoke test guiado por canal

## Recomendações Imediatas

### Fazer agora

1. Criar `/health/ready` ou `/system/ready` com checagem de:
   - DB
   - Redis
   - storage
   - workers críticos
   - Gmail watch
   - Google Calendar watch
   - Evolution/WhatsApp
   - Recall webhook freshness

2. Criar e2e mínimos de go-live para:
   - login admin
   - operação / central
   - portal cliente
   - portal freelancer
   - aprovação pública

### Fazer em seguida

1. Surface de health operacional no admin
2. Alertas explícitos de worker parado
3. Smoke tests agendados das integrações críticas

## Veredito

O sistema já está `muito mais perto de produção real` do que de protótipo:

- builds principais passaram
- segurança de env está forte
- integrações principais foram endurecidas
- operações/Trello e Central já estão em patamar produtivo

O que ainda impede chamar de “blindado”:

- health/readiness raso
- cobertura automatizada ainda curta
- alguns fluxos amplos demais para depender só de validação manual

Veredito final:

- `Go-live estrutural`: `sim`
- `Go-live blindado`: `ainda não`

## Próximo Lote Recomendado

1. readiness endpoint profundo
2. fix dos warnings do portal freelancer
3. e2e de operações + portais
4. smoke tests guiados de integrações
