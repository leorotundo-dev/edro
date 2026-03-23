# Security Release Bundle - 2026-03-22

## Objetivo

Isolar o lote de seguranca ja construido no repositório em um pacote que possa ser revisado, staged e publicado sem misturar mudancas funcionais ou arquivos temporarios do worktree compartilhado.

## Estado atual

- branch atual: `main`
- worktree: compartilhado e bastante sujo
- validacao local mais recente:
  - `pnpm security:repo` verde
  - `pnpm test` verde
  - `pnpm security:verify` verde
- validacao de runtime ja registrada em:
  - `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md`
  - `PRODUCTION_RUNTIME_SMOKE_2026-03-21.md`

## Principio de corte

Use este bundle para separar:

- `bucket 1`: arquivos claramente novos e de ownership de seguranca, que podem ser staged em lote
- `bucket 2`: arquivos existentes endurecidos por seguranca, mas que devem passar por revisao manual porque o worktree e compartilhado
- `bucket 3`: arquivos gerados ou temporarios, que nao devem entrar no release

## Bucket 1 - Auto-stage seguro

Use o arquivo `SECURITY_AUTOSTAGE_CANDIDATES_2026-03-22.txt` para stage dos itens abaixo com `git add --pathspec-from-file`.

Inclui:

- `.github/`
- `SECURITY.md`
- `docs/security/`
- `scripts/security/`
- novas migracoes/repositorios/servicos de seguranca do backend
- novas suites de teste de seguranca
- novas rotas server-side de auth/proxy dos tres portais
- `apps/web/proxy.ts`
- `security_best_practices_report.md`

## Bucket 2 - Revisao manual obrigatoria

Os arquivos abaixo sao parte da trilha de seguranca, mas vivem em arquivos ja existentes e podem ter sobreposicao com outras frentes. Eles precisam de revisao humana antes de stage/merge.

### Backend core

- `apps/backend/package.json`
- `apps/backend/src/auth/clientPerms.ts`
- `apps/backend/src/auth/oidc.ts`
- `apps/backend/src/auth/rbac.ts`
- `apps/backend/src/auth/refresh.ts`
- `apps/backend/src/auth/tenantGuard.ts`
- `apps/backend/src/env.ts`
- `apps/backend/src/server.ts`
- `apps/backend/src/services/authService.ts`

### Backend auth, webhook e integrações

- `apps/backend/src/routes/auth.ts`
- `apps/backend/src/routes/sso.ts`
- `apps/backend/src/routes/metaOAuth.ts`
- `apps/backend/src/routes/portalClient.ts`
- `apps/backend/src/routes/webhookEvolution.ts`
- `apps/backend/src/routes/webhookInstagram.ts`
- `apps/backend/src/routes/webhookRecall.ts`
- `apps/backend/src/routes/webhookWhatsApp.ts`
- `apps/backend/src/routes/webhooks.ts`
- `apps/backend/src/routes/index.ts`
- `apps/backend/src/routes/gmailRoutes.ts`
- `apps/backend/src/routes/googleCalendarRoutes.ts`
- `apps/backend/src/routes/integrationHealthRoutes.ts`
- `apps/backend/src/services/integrations/gmailService.ts`
- `apps/backend/src/services/integrations/googleCalendarService.ts`

### Backend autorizacao e tenancy

- `apps/backend/src/routes/adminAiCosts.ts`
- `apps/backend/src/routes/adminReportei.ts`
- `apps/backend/src/routes/analytics.ts`
- `apps/backend/src/routes/behaviorProfiles.ts`
- `apps/backend/src/routes/calendar.ts`
- `apps/backend/src/routes/campaigns.ts`
- `apps/backend/src/routes/clients.ts`
- `apps/backend/src/routes/darkFunnel.ts`
- `apps/backend/src/routes/evolutionRoutes.ts`
- `apps/backend/src/routes/financial.ts`
- `apps/backend/src/routes/integrationData.ts`
- `apps/backend/src/routes/learningRules.ts`
- `apps/backend/src/routes/meetings.ts`
- `apps/backend/src/routes/reports.ts`
- `apps/backend/src/routes/security.ts`
- `apps/backend/src/routes/studioCanvas.ts`
- `apps/backend/src/routes/studioCreative.ts`
- `apps/backend/src/routes/studioRecipes.ts`
- `apps/backend/src/routes/webhookUniversal.ts`
- `apps/backend/src/routes/whatsappInbox.ts`
- `apps/backend/src/jobs/monthlyReportsWorker.ts`
- `apps/backend/src/jobs/performanceAlertWorker.ts`
- `apps/backend/src/services/reporteiLearningSync.ts`

### Portal Edro

- `apps/web/app/login/page.tsx`
- `apps/web/app/api/proxy/[...path]/route.ts`
- `apps/web/app/auth/meta/select/page.tsx`
- `apps/web/app/portal/[token]/page.tsx`
- `apps/web/app/portal/dashboard/page.tsx`
- `apps/web/components/AuthGate.tsx`
- `apps/web/lib/api.ts`
- `apps/web/next.config.mjs`
- `apps/web/package.json`
- `apps/web/public/ux/edro-studio-api.js`

### Portal Edro - pontos funcionais endurecidos

- `apps/web/app/admin/events/import/page.tsx`
- `apps/web/app/admin/pagamentos/page.tsx`
- `apps/web/app/admin/reunioes/MeetingsDashboardClient.tsx`
- `apps/web/app/admin/equipe/[id]/FreelancerProfileClient.tsx`
- `apps/web/app/admin/integrations/IntegrationSetupDialog.tsx`
- `apps/web/app/calendar/CalendarClient.tsx`
- `apps/web/app/calendar/[id]/page.tsx`
- `apps/web/app/clients/ClientsClient.tsx`
- `apps/web/app/clients/[id]/ClientLayoutClient.tsx`
- `apps/web/app/clients/[id]/campaigns/CampaignsClient.tsx`
- `apps/web/app/clients/[id]/connectors/page.tsx`
- `apps/web/app/clients/[id]/library/ClientLibraryClient.tsx`
- `apps/web/app/clients/[id]/meetings/MeetingsClient.tsx`
- `apps/web/app/clients/[id]/perfil/BrandTokensCard.tsx`
- `apps/web/app/clients/[id]/portal/PortalLinksClient.tsx`
- `apps/web/app/clients/[id]/reports/page.tsx`
- `apps/web/app/clipping/dashboard/page.tsx`
- `apps/web/app/collab/[briefingId]/page.tsx`
- `apps/web/app/edro/BriefingCardDrawer.tsx`
- `apps/web/app/edro/BriefingsClient.tsx`
- `apps/web/app/library/GlobalLibraryClient.tsx`
- `apps/web/app/library/LibraryClient.tsx`
- `apps/web/app/studio/biblioteca/BibliotecaClient.tsx`
- `apps/web/app/studio/canvas/CanvasClient.tsx`
- `apps/web/app/studio/layout.tsx`
- `apps/web/app/studio/simulation/SimulationClient.tsx`
- `apps/web/components/layout/header/Profile.tsx`
- `apps/web/components/pipeline/nodes/ExportNode.tsx`
- `apps/web/components/pipeline/nodes/MultiFormatNode.tsx`

### Portal Cliente e Freelancer

- `apps/web-cliente/app/login/page.tsx`
- `apps/web-cliente/components/PortalShell.tsx`
- `apps/web-cliente/lib/api.ts`
- `apps/web-cliente/middleware.ts`
- `apps/web-cliente/next.config.mjs`
- `apps/web-cliente/package.json`
- `apps/web-freelancer/app/(portal)/jobs/[id]/page.tsx`
- `apps/web-freelancer/app/(portal)/studio/[briefingId]/page.tsx`
- `apps/web-freelancer/app/login/page.tsx`
- `apps/web-freelancer/lib/api.ts`
- `apps/web-freelancer/middleware.ts`
- `apps/web-freelancer/next.config.mjs`
- `apps/web-freelancer/package.json`

### Root

- `package.json`

## Bucket 3 - Nao publicar

- `apps/web/tsconfig.tsbuildinfo`
- `apps/web-cliente/tsconfig.tsbuildinfo`
- `apps/web-freelancer/tsconfig.tsbuildinfo`
- `apps/web-cliente/next-env.d.ts`
- `apps/web-freelancer/next-env.d.ts`
- `tmp_admin_equipe_live.html`

## Comando de stage do bucket 1

```bash
git add --pathspec-from-file=docs/security/SECURITY_AUTOSTAGE_CANDIDATES_2026-03-22.txt
```

Ou:

```bash
pnpm security:release:stage:auto
```

## Sequencia de revisao do bucket 2

1. revisar `backend core`
2. revisar `backend auth/webhook/integracoes`
3. revisar `backend autorizacao/tenancy`
4. revisar `portal Edro`
5. revisar `portal cliente/freelancer`
6. revisar `package.json` raiz

## Sequencia de rollout recomendada

1. merge do lote de seguranca em branch dedicada
2. deploy do backend primeiro
3. aplicar migracao `0296_user_mfa.sql`
4. manter `EDRO_ENFORCE_PRIVILEGED_MFA=false` no primeiro deploy
5. deploy do `web`, `web-cliente` e `web-freelancer`
6. executar `pnpm security:smoke` contra as URLs publicas
7. cadastrar `admin` e `manager` no MFA
8. virar `EDRO_ENFORCE_PRIVILEGED_MFA=true`
9. repetir smoke e registrar evidencia

## Validacao minima antes de merge/deploy

```bash
pnpm security:repo
pnpm test
pnpm security:verify
```

## Rollback

- reverter o deploy do backend primeiro se houver pico anormal de `401`, `403` ou `5xx`
- manter `EDRO_ENFORCE_PRIVILEGED_MFA=false` ate o cadastro de perfis privilegiados estar completo
- se houver regressao de sessao, derrubar primeiro os frontends novos e manter backend com compatibilidade
- se webhook critico falhar, restaurar a versao anterior do backend antes de mexer nos portais

## Itens que continuam fora do release de código

- `WAF/edge`
- dominio canonico final
- `full restore` com `RTO/RPO`
- `tabletop` de incidente
- pentest externo
- aprovacao juridica final do `DPA` e do aviso

## Critério de pronto deste bundle

Este bundle so deve ser considerado pronto quando:

- o `bucket 1` estiver staged sem ruido
- o `bucket 2` tiver sido revisado e staged seletivamente
- os arquivos do `bucket 3` estiverem fora do commit
- os tres gates locais estiverem verdes no commit final
