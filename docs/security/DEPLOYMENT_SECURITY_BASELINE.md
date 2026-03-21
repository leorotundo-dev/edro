# Deployment Security Baseline

## Objetivo

Definir o baseline minimo de runtime, configuracao e operacao para colocar a Edro em producao com postura de seguranca coerente com clientes enterprise.

## Variaveis obrigatorias

- `JWT_SECRET`
  Segredo forte, gerado aleatoriamente e rotacionado sob processo controlado.
- `ALLOWED_ORIGINS`
  Lista fechada de origins web autorizadas a chamar a API.
- `EDRO_BACKEND_URL` ou `RAILWAY_SERVICE_EDRO_BACKEND_URL`
  Origem canonica do backend consumida pelos portais e pelos callbacks de auth.
- `META_APP_SECRET`
  Necessario para validar assinatura de webhooks Meta.
- `EVOLUTION_WEBHOOK_SECRET`
  Necessario para autenticar webhooks Evolution.
- `EDRO_LOGIN_SECRET`
  Segredo dedicado para OTP e magic link.

## Variaveis que devem ficar desligadas em producao

- `EDRO_LOGIN_ECHO_CODE=false`
  Nunca ecoar OTP na resposta em ambiente produtivo.
- `ENABLE_TEMP_PGVECTOR_CHECK=false`
  Endpoint temporario deve permanecer desabilitado.

## Baseline de borda e rede

- Todo trafego externo deve passar por HTTPS no edge.
- Colocar `WAF`, rate limiting e filtro anti-bot na frente do backend.
- Limitar acesso administrativo por allowlist, VPN ou IdP quando possivel.
- Bloquear exposicao publica de ambientes de homologacao e previews com dados reais.

## Baseline de operacao

- Rotacionar segredos de integracao e refresh sob processo formal.
- Centralizar logs, trilha de auditoria e alertas de auth, admin e webhooks.
- Testar restauracao de backup de banco e arquivos periodicamente.
- Manter playbook de incidente e responsaveis de escalonamento atualizados.

## Baseline de entrega

- PR so entra com `security-gates.yml` verde.
- Dependencias novas passam por `dependency-review.yml`.
- Repositorio deve ter `CodeQL` ativo para analise continua de codigo.
- Pentest externo antes de onboarding de cliente enterprise ou mudanca estrutural grande.

## Observacoes

- Portais `cliente` e `freelancer` agora dependem de cookies `HttpOnly` e proxy same-origin; nao reintroduzir bearer token no browser.
- Qualquer novo webhook publico deve entrar com verificacao de assinatura e replay protection antes de ir para producao.
