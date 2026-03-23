# Edge and Custom Domain Cutover Plan

## Objetivo

Levar as superficies publicas endurecidas da Edro para dominios controlados pela empresa, com edge sob governanca propria e espaco real para `WAF`, anti-bot e politicas de rede mais fortes.

## Estado observado em 2026-03-21

- `edro.digital` resolve para `185.239.210.113`
- resposta HTTP de `https://edro.digital` indica `Hostinger` / `LiteSpeed`
- `www.edro.digital` nao resolve
- os apps operacionais endurecidos estao em subdominios `*.up.railway.app`

Isso significa que, hoje, a borda publica da aplicacao principal ainda nao esta consolidada sob um edge controlado pela Edro.

## Risco pratico

- `WAF` e rate limiting enterprise ficam limitados ao que o runtime/aplicacao ja faz
- nao existe dominio canonico unico para aplicar politicas fortes de borda
- due diligence de cliente grande fica mais fraca porque a superficie publica esta fragmentada

## Arquitetura alvo

### Dominio canonico

- `app.edro.digital` -> portal interno Edro
- `cliente.edro.digital` -> portal cliente
- `freelancer.edro.digital` -> portal freelancer
- `api.edro.digital` -> backend

Opcional:

- `www.edro.digital` -> site institucional
- `edro.digital` -> redirect para `www.edro.digital`

### Edge recomendado

- `Cloudflare` ou provedor equivalente na frente dos dominios canonicos
- Railway mantido como origin
- TLS, `WAF`, anti-bot, rate limit e observabilidade no edge

## Plano de execucao

### Fase 1 - Preparacao de DNS e ownership

- definir quem controla a zona DNS da Edro
- decidir se o site institucional continua em `Hostinger`
- reservar os subdominios de aplicacao e API para o stack da Edro

### Fase 2 - Edge provider

- criar zona no provider de edge
- importar/replicar os registros DNS atuais
- manter `edro.digital` e `www` apontando para o site institucional ate o cutover planejado
- criar registros para:
  - `app.edro.digital`
  - `cliente.edro.digital`
  - `freelancer.edro.digital`
  - `api.edro.digital`

### Fase 3 - Railway custom domains

- anexar cada dominio ao servico correspondente no Railway
- validar emissao de certificado
- confirmar respostas HTTPS corretas

### Fase 4 - Politicas de edge

- ativar managed rules
- aplicar rate limit e challenge nas rotas prioritarias
- revisar falsos positivos

### Fase 5 - Cutover e validacao

- atualizar `WEB_URL`, `PUBLIC_API_URL` e origins canonicas
- rodar `pnpm security:deploy`
- rodar `pnpm security:smoke` nas novas URLs
- testar redirects e sessao

## Dependencias

- acesso ao provedor de DNS/edge
- acesso administrativo ao projeto Railway
- janela de mudanca para troca de origem canonica

## Criterio de sucesso

- os quatro servicos publicos respondem em dominios `edro.digital`
- `WAF` e logs de borda ficam ativos nessas entradas
- as URLs `*.up.railway.app` deixam de ser a superficie canonica usada por clientes
