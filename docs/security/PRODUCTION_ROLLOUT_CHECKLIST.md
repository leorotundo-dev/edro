# Production Rollout Checklist

## Objetivo

Garantir que qualquer deploy relevante da Edro entre em producao com seguranca, reversibilidade e evidencia minima.

## Gate de inicio

- owner tecnico definido
- owner de negocio definido
- janela de deploy aprovada
- plano de rollback descrito
- changelog objetivo do que vai entrar

## Pre-deploy tecnico

- `security-gates.yml` verde no commit exato que sera deployado
- nenhum finding critico aberto em auth, autorizacao, webhook ou tenant isolation
- migracoes de banco revisadas e com impacto conhecido
- variaveis de ambiente validadas para o ambiente alvo
- segredos conferidos no secret manager e sem uso de valor hardcoded
- `EDRO_LOGIN_ECHO_CODE=false`
- `ENABLE_TEMP_PGVECTOR_CHECK=false`
- `META_APP_SECRET` configurado quando houver webhook Meta ativo
- `EVOLUTION_WEBHOOK_SECRET` configurado quando houver webhook Evolution ativo
- `RECALL_WEBHOOK_SECRET` configurado quando Recall.ai estiver habilitado
- `D4SIGN_TOKEN_API` + `D4SIGN_CRYPT_KEY` + `D4SIGN_SAFE_UUID` + `D4SIGN_WEBHOOK_SECRET` configurados quando D4Sign estiver habilitado
- `EDRO_ENFORCE_PRIVILEGED_MFA=true` após todos os usuários admin/manager terem feito enroll de MFA (ver MFA_ROLLOUT_RUNBOOK.md)
- `ALLOWED_ORIGINS` fechado para os domínios reais dos portais
- Migrations pendentes aplicadas em ordem: 0108, 0293, 0294, 0295, 0296

## Pre-deploy de borda e runtime

- HTTPS ativo no edge
- `WAF` e rate limiting aplicados nas APIs publicas
- logs de aplicacao chegando ao agregador central
- alertas minimos ativos para auth, erro 5xx e webhook invalido
- backup recente valido antes da mudanca
- ponto de restauracao conhecido antes de migracao destrutiva

## Deploy

- publicar backend primeiro quando houver mudanca de contrato de API
- publicar portais depois do backend quando houver mudanca de sessao ou proxy
- acompanhar logs e healthcheck por pelo menos 30 minutos
- congelar novas mudancas durante a observacao inicial

## Smoke test obrigatorio apos deploy

- login admin no portal Edro
- login no portal cliente
- login no portal freelancer
- logout nos tres portais
- carga de sessao por cookie e refresh server-side no portal Edro
- upload autenticado via proxy same-origin
- download autenticado via proxy same-origin
- rota administrativa sensivel bloqueando usuario sem role adequada
- webhook invalido retornando erro
- webhook valido processando com sucesso
- `/admin/integrations/health` retorna `d4sign.token_api: true` e `auth.mfa_enforced: true` após ativar flags
- `audit_log` recebendo entradas após login (consultar: `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5`)

## Critérios de rollback

- aumento anormal de 401, 403 ou 5xx
- falha de login ou perda de sessao recorrente
- falha em webhook critico de cliente
- vazamento cross-tenant ou permissao indevida detectada
- falha em migracao que degrade operacao core

## Pos-deploy

- registrar data, hora, commit, owner e resultado
- anexar evidencias do smoke test
- registrar incidentes ou desvios observados
- abrir follow-up para qualquer excepcao assumida no rollout

## Evidencias de pronto

- print ou link do pipeline verde
- link do deploy/versao
- checklist preenchido
- evidencias do smoke test
- link do ticket de rollout e do ticket de rollback, se usado
