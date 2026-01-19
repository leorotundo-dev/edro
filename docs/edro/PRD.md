# PRD - Plataforma Edro

## Visao
Plataforma interna para atendimento, trafego e gestores operarem o fluxo de criacao com IA e controle por Kanban.

## Objetivos
- Reduzir retrabalho e tempo de entrega.
- Padronizar briefing, copy e aprovacao.
- Dar visibilidade de gargalos e SLA.

## Nao objetivos
- Portal de cliente final.
- Publicacao direta de midia paga nesta fase.

## Usuarios e papeis
- Atendimento: cria briefing e agenda alinhamento.
- Trafego: controla ritmo, distribui jobs e prazos.
- DA: produz a arte e entrega.
- Gestor: aprova copy e etapas criticas.

## Jornada principal
1. Atendimento cria briefing interno.
2. Alinhamento no Gather.
3. Copy IA gera 10 copys (PT/ES).
4. Gestor aprova.
5. Trafego envia job para DA.
6. DA entrega e etapa segue para revisao e entrega.
7. iClips recebe update na entrada e na entrega.

## Requisitos funcionais
- Login por codigo via email (dominio edro.digital).
- Workflow Kanban bloqueado por etapa.
- Briefing com campos obrigatorios (cliente, tipo, publico, objetivo, canal, prazo).
- Geracao de copy com templates por tipo de campanha.
- Validacao automatica de copy (score e checklist).
- Aprovacao por gestor.
- Notificacoes por email e WhatsApp.
- Integracao iClips (entrada e entrega).

## Requisitos nao funcionais
- Logs de auditoria por etapa.
- Tempo de resposta de API < 2s para operacoes comuns.
- Seguranca de dados e segregacao de contas por plataforma.

## Integracoes
- ChatGPT API
- iClips (API ou fallback email)
- Power Automate
- Ad Creative
- WhatsApp provider
- Google Workspace (SMTP)

## Metricas
- Tempo medio de criacao e aprovacao.
- Taxa de aprovacao automatica.
- Retrabalho por etapa.
- Copys geradas por cliente.
