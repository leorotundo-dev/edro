# Production Runtime Smoke - 2026-03-21

## Objetivo

Registrar a execucao do smoke de seguranca das superficies publicas da Edro apos o endurecimento tecnico e a adicao do script `security:smoke`.

## Comando executado

```bash
pnpm security:smoke -- \
  --backend-url https://edro-backend-production.up.railway.app \
  --web-url https://edro-production.up.railway.app \
  --cliente-url https://edro-web-cliente-production.up.railway.app \
  --freelancer-url https://edro-web-freelancer-production.up.railway.app
```

## Resultado

Status final:

- `passed`

Checks validados:

- backend `/health` retornando `200` com headers de seguranca
- backend `/_temp/pgvector-check` retornando `404`
- backend `/webhook/evolution` sem assinatura retornando `401`
- backend `/webhook/recall` sem assinatura retornando `401`
- portal principal `/api/auth/session` retornando `401` com headers de seguranca
- portal cliente `/api/auth/session` retornando `401`
- portal freelancer `/api/auth/session` retornando `401`

## Leitura operacional

Este smoke nao substitui homologacao funcional completa, `pentest`, `restore full` ou validacao de `WAF`, mas confirma rapidamente que os controles publicos mais sensiveis continuam ativos apos deploy:

- endpoint temporario nao exposto
- webhooks criticos rejeitando request invalido
- sessoes publicas nao abertas
- headers de seguranca presentes no runtime validado

## Artefato relacionado

- `scripts/security/smoke-public-runtime.mjs`
