# Trust Package Status - 2026-03-23

## Atualizado em relacao a versao de 2026-03-21

Ver tambem: `TRUST_PACKAGE_STATUS_2026-03-21.md` (baseline)

---

## O que avancou desde 2026-03-21

### Auth e autorizacao

- MFA ativo em producao para roles `admin` e `manager` (`EDRO_ENFORCE_PRIVILEGED_MFA=true` no Railway)
- 403 `mfa_required` tratado no frontend — redireciona para login ao inves de silenciar
- Bug de bypass em rotas `client-approval` corrigido (PR #20, commit `e22fbaf0`)
- Rate limiting incompativel com `node-redis` corrigido em `server.ts` (PR #20, commit `51b9f052`)

### LGPD e privacidade

- ROPA completa com 12 fluxos documentados (`ROPA_PRELIMINARY_2026-03-21.md`)
- 5 RIPDs produzidos em rascunho para os fluxos de maior risco:
  - Fluxo 9: geracao de copy via IA (`RIPD_IA_COPY_GENERATION_DRAFT_2026-03-23.md`)
  - Fluxo 4: briefings e producao (`RIPD_BRIEFINGS_PRODUCAO_DRAFT_2026-03-23.md`)
  - Fluxo 5: comunicacoes/webhooks (`RIPD_COMUNICACOES_WEBHOOKS_DRAFT_2026-03-23.md`)
  - Fluxo 6: reunioes/gravacoes (`RIPD_REUNIOES_GRAVACOES_DRAFT_2026-03-23.md`) — ALTO RISCO
  - Fluxo 10: Instagram DMs (`RIPD_INSTAGRAM_DMS_DRAFT_2026-03-23.md`)
- Template RIPD disponivel para novos fluxos (`templates/RIPD_TEMPLATE.md`)
- DPA template com secoes 3 e 4 preenchidas (categorias, dados, finalidades)

### Continuidade e resposta a incidente

- Script automatizado de backup drill: `scripts/backup_restore_drill.sh`
  - suporta `--schema-only` (LGPD-safe) e drill completo com dados
  - gera relatorio automatico com RTO medido
- Cenario de tabletop de incidente estruturado: `INCIDENT_TABLETOP_SCENARIO_2026-03-23.md`
  - 5 blocos, 19 perguntas, cenario de vazamento de briefings
  - Cenario 2 (credencial comprometida) documentado como proximo exercicio

### Pentest

- Criterios de qualificacao do contratado documentados
- Guia contratual (NDA, DPA, clausulas) documentado
- Estimativa de esforco: 8-10 dias de teste, 2-3 testadores
- Prazo alvo: contratacao antes de 2026-05-01, execucao maio/junho 2026

---

## O que pode ser afirmado hoje (2026-03-23)

- codigo e runtime endurecidos
- webhooks criticos autenticados e fail-closed
- sessao segura server-side nos tres portais
- MFA ativo em producao para perfis administrativos
- homologacao de producao executada
- restore tecnico de schema validado
- 35+ workers autonomos com testes de seguranca cobrindo auth, tenancy, MFA e rotas financeiras
- ROPA com 12 fluxos documentados e RIPDs rascunhados para os 5 fluxos de maior risco
- programa de seguranca documentado com backlog priorizado

---

## O que ainda nao pode ser prometido como concluido

- WAF/edge anti-bot formalizado (plano existe; execucao depende de DNS Hostinger + Cloudflare)
- pentest externo executado (prontidao documentada; fornecedor nao contratado)
- restore full com dados em ambiente isolado e RTO/RPO medidos (runbook e script prontos; execucao depende de janela aprovada)
- pacote LGPD totalmente fechado (endereco, DPO, email de privacidade, DPAs de IA pendentes)
- tabletop de incidente executado com ata (cenario pronto; data nao agendada)

---

## Pendencias que o usuario deve resolver

| Pendencia | Impacto | Urgencia |
| --- | --- | --- |
| ~~Endereco, email privacidade, DPO, signatario DPA~~ | ✅ Resolvido 2026-03-23 — templates DPA e Aviso preenchidos | — |
| DPAs com OpenAI, Anthropic, Google, Meta, Recall | Valida transferencias internacionais para clientes enterprise | Alta |
| DNS cutover para Cloudflare (WAF) | Protecao de borda e dominio canonico | Media |
| Contratar fornecedor de pentest | Finaliza SEC-117; necessario para clientes enterprise grandes | Media |
| Agendar e executar tabletop de incidente | Fecha SEC-115 | Media |
| Drill completo de backup com RTO/RPO | Fecha SEC-110 | Media |
| Avisar de gravacao / clausula contratual para Recall | Mitiga risco alto do fluxo 6 (reunioes) | Alta |

---

## Evidencias disponibilizaveis para due diligence

| Artefato | Tipo | Shareavel |
| --- | --- | --- |
| `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md` | Relatorio tecnico | Sim |
| `BACKUP_RESTORE_DRILL_2026-03-21.md` | Evidencia de restore | Sim |
| `GITHUB_HARDENING_BASELINE.md` | Evidencia de CI/CD | Sim |
| `DEPLOYMENT_SECURITY_BASELINE.md` | Baseline de deploy | Sim |
| `SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md` | Lista de subprocessadores | Sim |
| `STANDARD_SECURITY_QUESTIONNAIRE_RESPONSE.md` | Questionario respondido | Sim |
| `CLIENT_DUE_DILIGENCE_CHECKLIST.md` | Checklist de due diligence | Sim |
| `templates/DPA_TEMPLATE.md` | Template DPA (lapidacao juridica pendente) | Interno |
| `templates/PRIVACY_NOTICE_TEMPLATE.md` | Template aviso (publicacao pendente) | Interno |
| RIPDs (`RIPD_*_DRAFT_2026-03-23.md`) | Rascunhos RIPD (revisao juridica pendente) | Interno |
