# Security Homologation Checklist

## Objetivo

Padronizar a homologacao de seguranca antes de liberar funcionalidade nova, portal novo ou integracao nova.

## Auth e sessao

- login exige o fluxo previsto e nao aceita bypass
- logout invalida sessao no servidor e no browser
- cookie sensivel e `HttpOnly`
- cookie sensivel e `Secure` em producao
- `SameSite` esta configurado deliberadamente
- token de integracao nao aparece no frontend
- sessao expirada resulta em 401 e limpeza de cookie

## Autorizacao

- usuario sem login recebe 401/redirect onde aplicavel
- usuario logado sem role adequada recebe 403
- usuario de outro tenant nao consegue ver ou mutar recurso
- usuario de cliente nao acessa escopo de outro cliente
- usuario freelancer nao acessa escopo de outro freelancer

## Frontend e proxy

- nenhuma tela sensivel usa token de `localStorage`
- upload autenticado usa proxy same-origin ou handler server-side
- download autenticado usa proxy same-origin ou handler server-side
- endpoint state-changing bloqueia origin indevida
- pagina sensivel nao fica cacheada de forma compartilhada

## Webhooks e integracoes

- webhook usa verificacao de autenticidade
- webhook invalido e rejeitado
- segredo do webhook vem de ambiente
- integracao nao expoe segredo em log, frontend ou erro
- callback OAuth valida usuario, tenant e recurso

## Dados e privacidade

- payloads sensiveis nao aparecem em logs de debug
- exportacoes e downloads exigem autorizacao
- retencao do novo dado foi definida
- owner do dado e finalidade foram identificados para o inventario

## Resiliencia

- erro interno retorna resposta generica ao cliente
- logs capturam contexto suficiente para investigacao
- fluxo critico tem smoke test manual ou automatizado
- rollback ou feature flag foi previsto quando a mudanca for arriscada

## Critério de aprovacao

- nenhum item critico acima pode ficar "nao avaliado"
- qualquer excecao precisa de aceite formal e prazo
- homologacao so termina com owner, data e evidencias anexadas

## Metadados do teste

- feature:
- ambiente:
- owner tecnico:
- owner de negocio:
- data:
- commit:
- resultado:
- excecoes aprovadas:
