# MFA Rollout Runbook - Edro Digital

## Objetivo

Executar o rollout do `MFA` para perfis privilegiados da Edro sem ambiguidade operacional e sem lockout acidental de administradores.

## Controle de rollout

O backend usa a variavel:

- `EDRO_ENFORCE_PRIVILEGED_MFA`

Valor esperado:

- `false`: MFA implementado, mas ainda nao exigido para `admin` e `manager`
- `true`: MFA exigido para `admin` e `manager`

## Regra de seguranca

Em `production` e `staging`, essa variavel deve ser configurada **explicitamente**. O verificador de ambiente em `scripts/security/check-deploy-env.mjs` considera ausencia dessa variavel um erro de rollout.

## Fases recomendadas

### Fase 0. Preparo

- confirmar que o pacote de seguranca foi isolado para deploy controlado
- confirmar que `pnpm security:verify` esta verde
- comunicar o time administrativo sobre a janela de rollout
- definir owner de suporte durante a ativacao

### Fase 1. Deploy com enforcement desligado

Configurar:

- `EDRO_ENFORCE_PRIVILEGED_MFA=false`

Objetivo:

- colocar o codigo em producao sem bloquear acesso de `admin` e `manager`
- validar que login, refresh, SSO e sessao seguem operacionais

Checklist:

- login OTP do portal principal funcionando
- callback SSO funcionando
- `/auth/me` retornando `mfa_enforced=false` para perfil privilegiado
- nenhuma regressao em logout e refresh

### Fase 2. Janela de ativacao

Antes de ativar:

- selecionar usuarios `admin` e `manager` ativos
- avisar sobre a mudanca
- manter suporte de plantao
- confirmar que a tela/fluxo de setup MFA no login esta funcional

### Fase 3. Enforcement ligado

Configurar:

- `EDRO_ENFORCE_PRIVILEGED_MFA=true`

Objetivo:

- exigir setup/desafio MFA para `admin` e `manager`

Comportamento esperado:

- usuario privilegiado sem MFA entra no fluxo `mfa_setup`
- usuario privilegiado com MFA entra no fluxo `mfa_challenge`
- `authGuard` bloqueia token privilegiado sem claim `mfa=true`
- refresh token sem `mfa_verified=true` passa a exigir novo login

## Smoke test minimo apos ativacao

1. login de `admin` sem MFA previamente habilitado
   resultado esperado: fluxo de setup MFA
2. login de `admin` com MFA ja habilitado
   resultado esperado: desafio MFA
3. acesso a rota administrativa com token privilegiado sem `mfa=true`
   resultado esperado: `403 mfa_required`
4. refresh de sessao privilegiada sem `mfa_verified`
   resultado esperado: `401 mfa_reauth_required`
5. usuario nao privilegiado
   resultado esperado: fluxo continua normal, sem exigencia de MFA

## Rollback

Se houver regressao operacional:

- voltar `EDRO_ENFORCE_PRIVILEGED_MFA=false`
- redeploy do backend
- validar login e refresh
- abrir analise de causa raiz antes de nova tentativa

## Evidencia de pronto

- valor da variavel registrado
- data/hora da ativacao
- owner responsavel
- smoke test registrado
- lista de usuarios privilegiados validados
