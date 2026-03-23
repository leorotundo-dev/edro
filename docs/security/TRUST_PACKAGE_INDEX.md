# Trust Package Index

## Objetivo

Organizar o pacote de confianca que a Edro deve conseguir enviar para cliente grande sem improviso.

## Estrutura recomendada do pacote

### 1. Resumo executivo

- visao de alto nivel da plataforma
- resumo da postura de seguranca
- resumo da postura de privacidade
- escopo dos ambientes e servicos cobertos

### 2. Controles tecnicos

- modelo de autenticacao e sessao
- MFA e modelo de acesso
- segregacao entre tenants
- protecao de APIs publicas e webhooks
- logs, auditoria e monitoramento
- backup e restore

### 3. Privacidade e LGPD

- aviso de privacidade
- papel no tratamento por fluxo principal
- encarregado e canal do titular
- processo de direitos do titular
- lista de subprocessadores
- transferencia internacional, quando existir

### 4. Operacao e resposta

- politica de seguranca
- politica publica de reporte de vulnerabilidade
- politica de resposta a incidente
- janelas e governanca de mudanca
- processo de vulnerabilidade e patch

### 5. Evidencias

- resultado resumido de pentest
- restore testado
- workflow CI de seguranca
- matriz de acessos ou resumo de RBAC
- status do programa de seguranca

## Links internos do pacote atual

- [Plano Master](/C:/Users/leoro/Documents/Edro.Digital/docs/security/ENTERPRISE_SECURITY_MASTER_PLAN.md)
- [Tracker Executivo](/C:/Users/leoro/Documents/Edro.Digital/docs/security/SECURITY_PROGRAM_TRACKER.md)
- [Matriz por Portal](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PORTAL_SECURITY_MATRIX.md)
- [Modelo Operacional LGPD](/C:/Users/leoro/Documents/Edro.Digital/docs/security/LGPD_COMPLIANCE_OPERATING_MODEL.md)
- [Checklist de Due Diligence](/C:/Users/leoro/Documents/Edro.Digital/docs/security/CLIENT_DUE_DILIGENCE_CHECKLIST.md)
- [Baseline de Deploy](/C:/Users/leoro/Documents/Edro.Digital/docs/security/DEPLOYMENT_SECURITY_BASELINE.md)
- [Checklist de Rollout](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PRODUCTION_ROLLOUT_CHECKLIST.md)
- [Checklist de Homologacao](/C:/Users/leoro/Documents/Edro.Digital/docs/security/SECURITY_HOMOLOGATION_CHECKLIST.md)
- [Relatorio de Homologacao de Producao](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md)
- [Smoke de Runtime em Producao](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PRODUCTION_RUNTIME_SMOKE_2026-03-21.md)
- [Drill de Backup e Restore](/C:/Users/leoro/Documents/Edro.Digital/docs/security/BACKUP_RESTORE_DRILL_2026-03-21.md)
- [Plano de WAF e Edge](/C:/Users/leoro/Documents/Edro.Digital/docs/security/WAF_EDGE_HARDENING_PLAN.md)
- [Plano de Cutover para Dominio Canonico](/C:/Users/leoro/Documents/Edro.Digital/docs/security/EDGE_CUSTOM_DOMAIN_CUTOVER_PLAN.md)
- [Runbook de Restore Full](/C:/Users/leoro/Documents/Edro.Digital/docs/security/FULL_RESTORE_RUNBOOK.md)
- [Template de Relatorio de Restore Full](/C:/Users/leoro/Documents/Edro.Digital/docs/security/FULL_RESTORE_REPORT_TEMPLATE.md)
- [Runbook de Rollout do MFA](/C:/Users/leoro/Documents/Edro.Digital/docs/security/MFA_ROLLOUT_RUNBOOK.md)
- [Runbook de Tabletop de Incidente](/C:/Users/leoro/Documents/Edro.Digital/docs/security/INCIDENT_TABLETOP_RUNBOOK.md)
- [Pacote de Prontidao para Pentest](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PENTEST_READINESS_PACKAGE_2026-03-21.md)
- [Matriz de Evidencias LGPD](/C:/Users/leoro/Documents/Edro.Digital/docs/security/LGPD_EVIDENCE_MATRIX_2026-03-21.md)
- [ROPA Preliminar](/C:/Users/leoro/Documents/Edro.Digital/docs/security/ROPA_PRELIMINARY_2026-03-21.md)
- [Registro Preliminar de Subprocessadores](/C:/Users/leoro/Documents/Edro.Digital/docs/security/SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md)
- [Registro Compartilhavel de Subprocessadores](/C:/Users/leoro/Documents/Edro.Digital/docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md)
- [Runbook de Direitos do Titular](/C:/Users/leoro/Documents/Edro.Digital/docs/security/DATA_SUBJECT_REQUEST_RUNBOOK.md)
- [Checklist de Prontidao para DPA](/C:/Users/leoro/Documents/Edro.Digital/docs/security/DPA_READINESS_CHECKLIST.md)
- [Gap Checklist do Aviso de Privacidade](/C:/Users/leoro/Documents/Edro.Digital/docs/security/PRIVACY_NOTICE_GAP_CHECKLIST.md)
- [Template Base de DPA](/C:/Users/leoro/Documents/Edro.Digital/docs/security/templates/DPA_TEMPLATE.md)
- [Template Base de Aviso de Privacidade](/C:/Users/leoro/Documents/Edro.Digital/docs/security/templates/PRIVACY_NOTICE_TEMPLATE.md)
- [Resposta Padrao de Questionario de Seguranca](/C:/Users/leoro/Documents/Edro.Digital/docs/security/STANDARD_SECURITY_QUESTIONNAIRE_RESPONSE.md)
- [Status Atual do Trust Package](/C:/Users/leoro/Documents/Edro.Digital/docs/security/TRUST_PACKAGE_STATUS_2026-03-21.md)
- [Matriz de Segredos](/C:/Users/leoro/Documents/Edro.Digital/docs/security/SECRETS_AND_ROTATION_MATRIX.md)
- [Security Policy](/C:/Users/leoro/Documents/Edro.Digital/SECURITY.md)

## Regra comercial

- nao enviar promessa sem evidencia
- separar claramente `implementado`, `em rollout`, `em roadmap`
- separar `controle tecnico ativo` de `plano operacional pronto para execucao`
- manter versao interna e versao compartilhavel com cliente

## SLA interno

- pacote basico pronto em ate 48h
- questionario padrao respondido em ate 5 dias uteis
- owner unico para consolidar resposta final
