# GitHub Hardening Baseline

## Objetivo

Definir o minimo de protecao no repositorio GitHub para que a trilha de seguranca do codigo nao regreda por processo fraco.

## Branch protection para `main`

- bloquear push direto
- exigir pull request antes de merge
- exigir pelo menos `1` review aprovando
- exigir que reviews vencidas sejam refeitas quando o branch mudar
- exigir conversa resolvida antes de merge
- exigir status checks antes de merge
- impedir bypass para quem nao for owner autorizado

## Status checks que devem ser obrigatorios

- `Security Gates / verify`
- `CodeQL / analyze`
- `Gitleaks / scan`
- `Dependency Review / dependency-review`

## Regras complementares recomendadas

- habilitar `secret scanning`
- habilitar `push protection` para segredos
- habilitar `Dependabot alerts`
- habilitar `Dependabot security updates`
- restringir administradores de bypass a um grupo minimo
- exigir branch atualizada antes do merge se o volume de PR for alto

## CODEOWNERS

- manter `CODEOWNERS` para backend auth, rotas publicas, proxies, webhooks e `docs/security`
- quando o time crescer, separar pelo menos `backend`, `frontend` e `security/compliance`

## Evidencia minima

- print da regra da branch
- lista dos status checks obrigatorios
- print de `secret scanning` ativo
- print de `Dependabot alerts` ativo
- owner responsavel pela manutencao dessas configuracoes

## Observacao

Sem essas regras, mesmo com o codigo endurecido, o repositorio continua vulneravel a regressao operacional.
