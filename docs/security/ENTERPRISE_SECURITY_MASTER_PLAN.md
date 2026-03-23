# Enterprise Security Master Plan - Edro Digital

## Resumo executivo

A Edro precisa operar como plataforma enterprise multi-tenant, nao apenas como sistema funcional. O alvo nao e "inviolavel". O alvo correto e "defensavel", com controles preventivos, detectivos e reativos suficientes para reduzir probabilidade de incidente, limitar impacto, provar governanca e sustentar due diligence.

Hoje a prioridade nao e certificacao. A prioridade e fechar os controles basicos que sustentam qualquer certificacao futura:

- autenticacao forte
- autorizacao consistente
- isolamento entre tenants
- protecao de webhooks e integracoes
- observabilidade e auditoria
- resposta a incidente
- higiene de desenvolvimento seguro
- processo operacional LGPD

Quando esses blocos estiverem maduros, a Edro passa a ter base real para `ISO/IEC 27001`, `ISO/IEC 27701` e, se fizer sentido comercial, `SOC 2 Type II`.

## Escopo do programa

- Frontend `apps/web`
- Frontend `apps/web-freelancer`
- Frontend `apps/web-cliente`
- Backend `apps/backend`
- Integracoes de email, WhatsApp, Meta, Google, Trello e outras APIs terceiras
- Banco, filas, jobs, caches, arquivos e logs
- Processo de privacidade e resposta regulatoria

## Principios nao negociaveis

1. Seguranca precisa ser server-side antes de ser UX.
2. Todo acesso sensivel precisa de autenticacao, autorizacao e auditoria.
3. Todo dado precisa ter owner, finalidade, retencao e descarte.
4. Todo endpoint publico precisa de autenticidade, limite e rastreabilidade.
5. Todo tenant precisa ser isolado por codigo, teste e preferencialmente restricao de dados.
6. Nenhum controle e considerado implementado sem evidencia.

## Estado alvo

### Blindagem tecnica

- Sessao por cookie `HttpOnly` e nao por token em browser storage.
- `MFA` para contas administrativas e step-up auth para acoes criticas.
- `RBAC` e escopo por tenant, cliente, freelancer e recurso em toda rota.
- Webhooks e callbacks com validacao de autenticidade, replay window e rate limit.
- `CSP`, headers de seguranca, protecao `CSRF`, validacao de upload e hardening de frontend.
- Segregacao de ambiente, segredos rotacionados e zero fallback de producao em codigo de app.

### Operacao segura

- Logs centralizados, trilha de auditoria, alertas e revisao de eventos de alto risco.
- Backup com restore testado e objetivos `RTO` e `RPO` definidos.
- Processo de resposta a incidente com papeis, severidade e comunicacao.
- Pipeline com gates reais de qualidade e seguranca.

### Privacidade e compliance

- Inventario de dados pessoais por fluxo.
- Base legal, finalidade, compartilhamento e transferencia internacional mapeados.
- Canal do titular, encarregado, SLA de atendimento e registro de solicitacoes.
- RIPD para tratamentos de maior risco.
- DPA, lista de subprocessadores e politica de retencao.

## Gates para vender com confianca a clientes grandes

### Gate 1 - Seguranca minima para exposicao enterprise

Nao vender como "seguro enterprise" antes de:

- migrar sessao sensivel para cookie seguro
- fechar rotas administrativas e de tenant com autorizacao forte
- corrigir webhook publico sem assinatura
- colocar rate limiting e observabilidade nas APIs publicas
- exigir MFA para perfis administrativos
- remover exposicao de token terceiro ao frontend

### Gate 2 - Compliance operacional minimo

Nao vender como "em conformidade LGPD" antes de:

- nomear responsavel e canal de privacidade funcional
- concluir inventario de dados e subprocessadores
- implementar fluxo de direitos do titular
- formalizar politica de retencao e descarte
- formalizar plano de incidente e governanca de comunicacao

### Gate 3 - Maturidade enterprise auditavel

Nao prometer maturidade enterprise sem:

- restore testado
- pentest externo
- trust package organizado
- backlog de riscos com owner e prazo
- evidencias de treinamento e operacao

## Roadmap 30/60/90 dias

### 0 a 30 dias

Objetivo: fechar a superficie de ataque mais perigosa.

- Migrar os tres portais para sessao por cookie `HttpOnly`, `Secure` em producao e `SameSite`.
- Exigir `MFA` para admin e step-up auth em acoes de alto impacto.
- Revisar todas as rotas `admin`, rotas por cliente e rotas de webhook para autorizacao e autenticidade.
- Implementar `CSP`, headers de seguranca, `CSRF` e validacao de upload.
- Colocar `WAF`, rate limit, limites de payload e alerta para abuso.
- Remover fallback de ambiente que aponte trafego local ou preview para producao.
- Corrigir pipeline para bloquear merge com erro de typecheck, lint, teste, dependencias e secret scan.

### 31 a 60 dias

Objetivo: tornar o ambiente operavel e defensavel.

- Centralizar logs de autenticacao, autorizacao, exportacao, webhook e administracao.
- Formalizar processo de incidente, severidade, owners e comunicacao.
- Testar restore e documentar `RTO` e `RPO`.
- Inventariar dados pessoais, subprocessadores e transferencias internacionais.
- Implantar fluxo de direitos do titular com registro e SLA.
- Fechar politica de retencao e descarte.

### 61 a 90 dias

Objetivo: gerar evidencias e preparar auditoria.

- Executar pentest externo nos tres portais e APIs publicas.
- Produzir `RIPD` para fluxos de maior risco.
- Organizar trust package para due diligence.
- Rodar gap assessment contra `ISO 27001` e `ISO 27701`.
- Definir se a proxima etapa sera certificacao, SOC 2 ou apenas programa interno reforcado.

## Owners recomendados

- `CTO / Head de Engenharia`
  Auth, autorizacao, API, jobs, CI/CD, backlog tecnico.
- `DevOps / Infra`
  WAF, observabilidade, segredos, backup, restore, hardening de borda.
- `Produto / Operacoes`
  Fluxo de aprovacao, retencao, direitos do titular, treinamento e resposta operacional.
- `Juridico / Privacidade`
  DPA, avisos, subprocessadores, base legal, transferencia internacional, RIPD.
- `Founder / Comercial enterprise`
  Governance review, posicionamento, trust package e negociacao de due diligence.

## KPIs do programa

- percentual de rotas sensiveis com autorizacao negativa testada
- percentual de contas administrativas com MFA ativo
- percentual de sistemas com logs de auditoria centralizados
- tempo medio de deteccao e triagem de incidente
- tempo medio de atendimento a solicitacao de titular
- percentual de subprocessadores com contrato e inventario completos
- sucesso em teste de restore dentro do RTO acordado
- percentual de backlog critico de seguranca fechado no prazo

## O que nao pode ser afirmado sem evidencia

- "Somos LGPD compliant" sem processo, inventario e canal real
- "Temos seguranca enterprise" sem MFA, logs, restore e pentest
- "Seus dados estao isolados" sem testes e revisao tecnica
- "Nao usamos compartilhamento externo" sem inventario de subprocessadores
- "Temos resposta a incidente" sem playbook e dono definido

## Referenciais recomendados

- `NIST CSF 2.0` para governanca de risco
- `NIST SSDF` para desenvolvimento seguro
- `OWASP ASVS` para baseline tecnico de aplicacao web
- `ISO/IEC 27001` para gestao de seguranca
- `ISO/IEC 27701` para gestao de privacidade

## Fontes oficiais

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD incidente: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD transferencia internacional: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
- ANPD RIPD: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
- ANPD fiscalizacao de encarregado/canal: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-fiscaliza-20-empresas-por-falta-de-encarregado-e-canal-de-comunicacao
- NIST CSF 2.0: https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20
- NIST SSDF: https://csrc.nist.gov/pubs/sp/800/218/final
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- ISO 27001: https://www.iso.org/standard/27001
- ISO 27701: https://www.iso.org/standard/27701
- SOC 2: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
