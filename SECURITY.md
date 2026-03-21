# Security Policy

## Objetivo

Definir o canal oficial para reporte de vulnerabilidades e o tratamento minimo esperado para incidentes e achados de seguranca na Edro Digital.

## Como reportar

Nao abra vulnerabilidade sensivel em issue publica.

Envie o relato por canal privado do time responsavel, contendo:

- titulo objetivo
- impacto esperado
- componente afetado
- passos de reproducao
- evidencias minimas
- sugestao de mitigacao, se houver

## O que incluir no relato

- portal ou servico afetado
- ambiente afetado
- severidade percebida
- pre-condicoes
- payload ou request minimamente reproduzivel
- risco de exploracao e impacto em cliente

## O que a Edro deve fazer ao receber

- confirmar recebimento em ate 1 dia util
- classificar severidade
- definir owner tecnico
- registrar mitigacao imediata quando aplicavel
- corrigir e validar antes de divulgar internamente como resolvido

## Severidade orientativa

- `critica`
  execucao remota, vazamento cross-tenant, bypass de auth, sequestro de sessao, exposicao de segredo
- `alta`
  escalacao de privilegio, webhook forjado, acesso indevido a recurso sensivel
- `media`
  hardening ausente, enumeracao de recurso, exposicao indevida limitada
- `baixa`
  problema de cabecalho, leak de metadado ou defesa em profundidade

## Escopo esperado

- `apps/web`
- `apps/web-cliente`
- `apps/web-freelancer`
- `apps/backend`
- integracoes e webhooks publicados pela Edro

## Fora de escopo

- problemas dependentes exclusivamente de dispositivo local comprometido
- indisponibilidade causada por terceiro fora do controle da Edro
- achados sem impacto demonstravel e sem evidencias minimas

## Boas praticas para reporte

- nao acesse dados de terceiros alem do minimo necessario para provar o achado
- nao altere, destrua ou exfiltre dados
- nao execute carga abusiva ou negacao de servico
- preserve evidencias e horario aproximado da reproducao

## Observacao

Este arquivo define o processo minimo. O tratamento operacional completo deve seguir os artefatos em [docs/security](C:/Users/leoro/Documents/Edro.Digital/docs/security/README.md).
