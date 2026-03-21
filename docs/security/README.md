# Security Program - Edro Digital

## Objetivo

Organizar a trilha de seguranca, compliance e evidencias enterprise da Edro em um pacote unico, reutilizavel em execucao interna, auditoria e due diligence com clientes grandes.

## Escopo

- Portal Edro (interno/admin)
- Portal Freelancer
- Portal Cliente
- Backend API e jobs
- Webhooks publicos e integracoes
- Infra, observabilidade e resposta a incidente
- LGPD, privacidade operacional e evidencias contratuais

## Artefatos

- `ENTERPRISE_SECURITY_MASTER_PLAN.md`
  Plano master com alvo, principios, gates e roadmap 30/60/90 dias.
- `SECURITY_PROGRAM_TRACKER.md`
  Backlog executivo com prioridade, owner, esforco, evidencia e prazo.
- `PORTAL_SECURITY_MATRIX.md`
  Matriz de controles por portal e superficie de ataque.
- `LGPD_COMPLIANCE_OPERATING_MODEL.md`
  Modelo operacional de privacidade e conformidade LGPD.
- `CLIENT_DUE_DILIGENCE_CHECKLIST.md`
  Pacote de evidencias e checklist para clientes enterprise.
- `DEPLOYMENT_SECURITY_BASELINE.md`
  Baseline minimo de runtime, edge e operacao para producao enterprise.
- `PRODUCTION_ROLLOUT_CHECKLIST.md`
  Checklist de pre-deploy, smoke test, rollback e evidencia de rollout.
- `SECURITY_HOMOLOGATION_CHECKLIST.md`
  Checklist de homologacao de seguranca para novas features e integracoes.
- `SECRETS_AND_ROTATION_MATRIX.md`
  Matriz inicial de segredos, owner e frequencia de rotacao.
- `TRUST_PACKAGE_INDEX.md`
  Indice do pacote de confianca para cliente enterprise e due diligence.
- `GITHUB_HARDENING_BASELINE.md`
  Baseline manual de branch protection, status checks e recursos nativos do GitHub.
- `templates/`
  Modelos preenchiveis para inventario, incidente, subprocessadores e revisao de acesso.

## Como usar

1. Ler o plano master para alinhar o alvo.
2. Executar o tracker como backlog oficial de seguranca.
3. Usar a matriz por portal para orientar implementacao tecnica.
4. Usar o modelo LGPD para fechar processo, contrato e governanca.
5. Usar o checklist de due diligence para preparar material comercial e auditoria.
6. Rodar `pnpm security:repo` para detectar regressao local de seguranca no repositorio.
7. Rodar `pnpm security:deploy -- --env-file <arquivo>` antes de rollout para validar baseline de ambiente.

## Relacao com o relatorio tecnico ja existente

O arquivo `security_best_practices_report.md` continua sendo o relatorio tecnico de riscos e gaps encontrados no sistema. Os documentos desta pasta transformam aquele diagnostico em programa de execucao e material enterprise.
