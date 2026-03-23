# Security Program Tracker - Edro Digital

## Como usar

Este arquivo e o backlog executivo da trilha de seguranca. Cada item precisa ter owner unico, prazo, status e evidencia. Sem evidencia, o item nao deve ser considerado concluido.

## Status snapshot em 2026-03-23

### Blocos essencialmente concluidos

- `SEC-101`
  Sessao dos 3 portais migrada para cookie `HttpOnly` com validacao server-side.
- `SEC-105`
  Webhooks criticos `Evolution`, `Recall`, `Meta/WhatsApp` endurecidos no runtime.
- `SEC-106`
  Headers de seguranca aplicados em backend e nos 3 portais.
- `SEC-107`
  Gates de seguranca e branch protection ativos no GitHub, com `security:repo` cobrindo regressao de token no browser, segredos inseguros, links `target="_blank"` sem protecao e novos `dangerouslySetInnerHTML` fora dos pontos revisados. Pipeline `.github/workflows/security-gates.yml` atualizado em 2026-03-23 para bloquear merge em falha de typecheck (`pnpm security:verify`), unit tests (`pnpm test`) e lint por pacote (`@edro/web`, `@edro/web-freelancer`, `@edro/web-cliente`). Todos os 4 apps (backend, web, web-freelancer, web-cliente) compilam sem erros TS. Commit: `ee8d958c` no branch `security/bucket2-and-d4sign`.

### Blocos parcialmente concluidos

- `SEC-102`
  MFA/step-up entrou no codigo do portal principal e do backend, com cobertura automatizada no backend e runbook de rollout; falta rollout e homologacao em producao.
- `SEC-103`
  Autorizacao endurecida nas rotas mais sensiveis, com suite negativa para `authGuard`, `tenantGuard`, `requireClientPerm`, refresh/MFA, `security dashboard` e rotas financeiras por `:id`; ainda vale expandir cobertura para mais rotas client-scoped.
- `SEC-104`
  Isolamento multi-tenant fortalecido nas rotas e jobs principais, com evidencia automatizada para membership, client scope, dashboard de seguranca e lookups financeiros por `tenant_id`; permanece revisao continua para jobs e superficies menos usadas.
- `SEC-110`
  Restore tecnico validado em modo `schema-only`; runbook e template de relatorio do `full restore` prontos, faltando exercicio completo com medicao formal de `RTO/RPO`.
- `SEC-115`
  Template de playbook e runbook de tabletop prontos; falta aprovacao operacional e execucao do simulador com registro de licoes aprendidas.
- `SEC-114`
  Prontidao documental para `DPA`, aviso e questionario padrao montada, com templates-base no pacote; falta template juridico final aprovado e validacao contratual.
- `SEC-118`
  Trust package, homologacao de producao e evidencias tecnicas montados; falta fechar bloco LGPD final e pentest.

### Blocos prioritarios ainda abertos

- `SEC-108`
  WAF e protecao de borda seguem abertos, com controle compensatorio de rate limiting consistente aplicado no backend para auth, SSO, aprovacoes publicas e webhooks e com plano de edge/WAF ja definido para execucao.
- `SEC-112` a `SEC-116`
  LGPD operacional, subprocessadores, titular, incidente e RIPD.
- `SEC-117`
  Pentest externo.

## Backlog prioritario

| ID | Frente | Acao | Prioridade | Owner primario | Esforco | Dependencia | Evidencia de pronto | Prazo alvo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-101 | Sessao | Migrar os 3 portais de token em browser para cookie `HttpOnly` com revogacao server-side | P0 | Backend + Frontend | Alto | Definicao de sessao | Teste de login, logout, revogacao e tentativa de exfiltracao sem token acessivel | 2026-04-10 |
| SEC-102 | Auth | Exigir `MFA` para admins e step-up auth para acoes criticas | P0 | Backend + Produto | Medio | SEC-101 | Fluxo funcional, auditoria de ativacao e bloqueio de conta sem MFA | 2026-04-15 |
| SEC-103 | AuthZ | Auditar e fechar todas as rotas `admin`, rotas por cliente e rotas de portal por permissao explicita | P0 | Backend | Alto | Mapa de rotas | Suite negativa cobrindo acessos indevidos por role e tenant | 2026-04-15 |
| SEC-104 | Tenancy | Revisar jobs e tabelas para garantir escopo por `tenant_id` e eliminar efeitos globais indevidos | P0 | Backend | Alto | SEC-103 | Testes de isolamento e revisao manual de jobs criticos | 2026-04-20 |
| SEC-105 | Webhooks | Implementar assinatura, validacao de autenticidade, replay window e rate limit em todos os webhooks publicos | P0 | Backend | Alto | Inventario de integracoes | Teste de webhook valido, invalido, replay e flood | 2026-04-20 |
| SEC-106 | Frontend | Aplicar `CSP`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e `CSRF` | P0 | Frontend + Backend | Medio | SEC-101 | Headers visiveis em producao e checklist de excecoes aprovado | 2026-04-20 |
| SEC-107 | CI/CD | Bloquear merge com falha em typecheck, lint, teste, SAST, dependency scan e secret scan | P0 | DevOps | Medio | Ajuste de scripts | Pipeline verde e politicas de branch aplicadas | 2026-04-20 |
| SEC-108 | Borda | Colocar WAF, rate limit, limite de payload e alertas de abuso nas APIs publicas | P0 | Infra | Medio | Inventario de entradas publicas | Evidencia de regra ativa e teste de limitacao | 2026-04-20 |
| SEC-109 | Logs | Centralizar logs de auth, admin, exportacao, integracao, webhook e erro de seguranca | P1 | Infra + Backend | Medio | Plataforma de logs | Dashboard, retention, alertas e trilha de auditoria consultavel | 2026-05-05 |
| SEC-110 | Backup | Testar backup e restauracao com `RTO` e `RPO` definidos | P1 | Infra | Medio | Politica de backup | Ata de restore com horario, resultado e owner | 2026-05-10 |
| SEC-111 | Segredos | Mapear segredos, remover fallback inseguro e implantar rotacao formal | P1 | Infra + Backend | Medio | Inventario de ambientes | Registro de rotacao e runbook de emergencia | 2026-05-10 |
| SEC-112 | Dados | Produzir inventario de dados pessoais, finalidade, base legal, compartilhamento e retencao | P1 | Privacidade + Produto | Alto | Discovery interno | ROPA aprovada e publicada internamente | 2026-05-15 |
| SEC-113 | Titular | Implantar fluxo operacional de direitos do titular com SLA e registro | P1 | Privacidade + Operacoes | Medio | SEC-112 | Canal funcional, fila, templates e medicao de SLA | 2026-05-20 |
| SEC-114 | Contratos | Padronizar DPA, lista de subprocessadores e clausulas de transferencia internacional | P1 | Juridico | Medio | SEC-112 | Kit contratual aprovado | 2026-05-20 |
| SEC-115 | Incidente | Formalizar playbook de incidente, severidade, escalonamento e comunicacao | P1 | Seguranca + Juridico + Operacoes | Medio | Logs centralizados | Playbook aprovado e tabletop executado | 2026-05-25 |
| SEC-116 | RIPD | Selecionar fluxos de maior risco e produzir RIPD inicial | P1 | Privacidade | Medio | SEC-112 | RIPD emitido e armazenado | 2026-06-05 |
| SEC-117 | Pentest | Contratar e concluir pentest externo dos 3 portais e APIs publicas | P1 | Seguranca | Medio | Bloco P0 concluido | Relatorio, plano de remediacao e revalidacao | 2026-06-10 |
| SEC-118 | Due diligence | Montar trust package de seguranca e privacidade para clientes enterprise | P1 | Comercial + Seguranca + Juridico | Medio | SEC-109 a SEC-117 | Pacote pronto para envio em ate 48h | 2026-06-15 |
| SEC-119 | ISO readiness | Rodar gap assessment para `ISO 27001` e `ISO 27701` | P2 | GRC / Lideranca | Medio | Programa minimo em operacao | Relatorio de gap com owners e prazo | 2026-06-20 |
| SEC-120 | Treinamento | Treinar time em incidente, phishing, acesso e manuseio de dados pessoais | P2 | RH + Seguranca | Baixo | Playbook pronto | Lista de presenca e quiz minimo | 2026-06-25 |

## Riscos que bloqueiam venda enterprise

- rotas administrativas sem autorizacao forte
- token sensivel exposto no browser
- webhook publico sem autenticidade
- falta de MFA em perfil de alto privilegio
- ausencia de restore testado
- ausencia de canal do titular e encarregado

## Cadencia recomendada

- reuniao semanal de 30 minutos com owners
- revisao quinzenal com diretoria
- semaforo `verde/amarelo/vermelho` por item P0 e P1
- nenhum item critico fecha sem evidencia anexada

## Dependencias com CVE pendente de migracao maior

- **fastify** v4.29.1 (GHSA-rcmh-qjqh-p98v): Content-Type tab char bypass. Fix requer upgrade v4→v5 (breaking). Risco: baixo em producao pois exige acesso ao servidor.
  - Para migrar: fastify `^5.7.2`, `@fastify/jwt` v6→v9, `@fastify/cors` v9→v10, `@fastify/multipart` v8→v9, `@fastify/rate-limit` v8→v10. Requer teste completo do servidor. Não fazer autonomamente.
- **nodemailer** v6.10.1: addressparser DoS via ReDoS. Fix requer upgrade v6→v7 (breaking). Risco: baixo em producao pois exige enderecos de email maliciosos como input.
  - Para migrar: nodemailer `^7.0.11` + `@types/nodemailer` atualizado. Verificar compatibilidade de API (createTransport, transporter.sendMail).
- Todos os outros 33 CVEs (critical, high, moderate, low) foram mitigados em 2026-03-23 via overrides pnpm e bump de axios para 1.13.5.

## Evidencia operacional ja pronta para os itens ainda abertos

- `SEC-108`
  `WAF_EDGE_HARDENING_PLAN.md`
- `SEC-108`
  `EDGE_CUSTOM_DOMAIN_CUTOVER_PLAN.md`
- `SEC-110`
  `FULL_RESTORE_RUNBOOK.md` e `FULL_RESTORE_REPORT_TEMPLATE.md`
- `SEC-115`
  `templates/INCIDENT_PLAYBOOK_TEMPLATE.md` e `INCIDENT_TABLETOP_RUNBOOK.md`
- `SEC-117`
  `PENTEST_READINESS_PACKAGE_2026-03-21.md`
