# Edro Master Plan

## Objetivo
Automatizar o fluxo interno da agencia Edro com IA, reduzindo retrabalho e acelerando entregas.

## Escopo
- Briefing interno (aberto pelo atendimento, nao pelo cliente)
- Workflow Kanban com etapas bloqueadas
- Geracao de copy por IA (PT/ES, 10 copys por briefing)
- Aprovacao por gestor
- Distribuicao do job para DA
- Atualizacao do iClips na entrada e na entrega

## Fluxo diario (Kanban bloqueado)
1. Atendimento cria briefing no portal Edro com validacao obrigatoria.
2. Etapa briefing -> iclips_in -> alinhamento -> copy_ia -> aprovacao -> producao -> revisao -> entrega -> iclips_out.
3. Reuniao no Gather (atendimento + trafego + DA) para alinhamento do briefing.
4. Trafego recebe notificacao por email + WhatsApp quando briefing entra.
5. Copy IA gera 10 copys; gestor aprova.
6. Trafego dispara job para DA (WhatsApp + email com briefing e copy).
7. DA entrega; sistema atualiza iClips.

## Plataformas e contas
- Edro Web + API (interno)
- iClips (gestao de tarefas)
- Power Automate (orquestracao)
- ChatGPT API (copys criativas)
- Gemini API (validacao e formatacao)
- Ad Creative (geracao visual)
- Gather (alinhamento)
- WhatsApp provider (notificacoes)
- Google Workspace (email)

## Regras chave
- Login interno por codigo via email @edro.digital.
- Aprovacao so por gestor.
- Etapa seguinte so libera se etapa atual estiver ok.
- iClips recebe update na entrada e na entrega (API ou fallback por email).

## Observacoes
- Gravacao das reunioes no Gather depende do plano e permissao do provedor.
- Integracoes externas devem usar contas separadas (custo por plataforma).
