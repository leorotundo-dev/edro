# ROPA Preliminary - 2026-03-21

## Objetivo

Consolidar um `registro preliminar de operacoes de tratamento` com base no que ja e inferivel do produto, da configuracao de producao e dos fluxos implementados.

Este documento `nao` substitui validacao juridica. Onde houver definicao de papel ou base legal ainda nao confirmada, o item fica marcado como `validar juridico`.

## Fluxo 1 - Autenticacao e gestao de sessao

- Nome do fluxo:
  autenticacao e sessao dos portais Edro, cliente e freelancer
- Sistema / modulo:
  backend auth, `apps/web`, `apps/web-cliente`, `apps/web-freelancer`
- Owner do processo:
  operacoes + produto
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  autenticar usuarios, manter sessao, controlar acesso e revogar sessao expirada
- Categoria de titulares:
  colaboradores internos, clientes, freelancers
- Categorias de dados pessoais:
  nome, email, papel, tenant, identificadores de sessao, logs tecnicos de acesso
- Ha dado sensivel?:
  nao identificado por padrao
- Origem dos dados:
  cadastro interno, convite, login por codigo, login administrativo
- Compartilhamento interno:
  backend, portais e auditoria
- Compartilhamento externo:
  provedores de email e infraestrutura

- Papel da Edro:
  `validar juridico` por fluxo contratual
- Cliente ou parceiro relacionado:
  clientes contratantes e equipe interna
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  frontend web, backend auth
- Sistemas de destino:
  banco principal, logs, email transacional
- Pais de armazenamento:
  Brasil/EUA conforme infraestrutura e subprocessadores
- Ha transferencia internacional?:
  provavelmente sim, validar por contrato e fornecedor
- Subprocessadores envolvidos:
  Railway, email transacional, Google se houver OAuth

- Controles de acesso:
  sessao server-side, cookie `HttpOnly`, RBAC, scoping por tenant
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial, validar por camada de storage/fornecedor
- Logs / auditoria:
  sim, parcial
- Prazo de retencao:
  validar politica
- Evento que inicia a contagem:
  encerramento da relacao ou expiracao de obrigacao operacional
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  a definir no canal oficial do titular
- Como localizar os dados:
  contas de usuario, memberships, logs e sessoes
- Como corrigir / excluir / exportar:
  operacao assistida por engenharia/operacoes
- SLA interno:
  pendente de formalizacao

- Principais riscos aos titulares:
  acesso indevido, sequestro de sessao, erro de autorizacao
- Controles mitigatorios:
  cookie `HttpOnly`, headers, RBAC, isolamento por tenant
- Risco residual:
  medio
- Necessita RIPD?:
  `nao`, salvo ampliacao de perfilizacao

## Fluxo 2 - Portal do cliente

- Nome do fluxo:
  portal do cliente e aprovacoes
- Sistema / modulo:
  `apps/web-cliente`, portal do cliente no backend
- Owner do processo:
  atendimento/operacoes
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  permitir consulta de jobs, aprovacoes, faturas e relatorios
- Categoria de titulares:
  representantes e usuarios do cliente
- Categorias de dados pessoais:
  nome, email, historico de acesso, aprovacoes, anexos e dados de contexto de projeto
- Ha dado sensivel?:
  nao identificado por padrao
- Origem dos dados:
  relacionamento comercial e execucao contratual
- Compartilhamento interno:
  operacoes, financeiro, conteudo
- Compartilhamento externo:
  infraestrutura, email, eventualmente storage

- Papel da Edro:
  `validar juridico`
- Cliente ou parceiro relacionado:
  cliente contratante
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  backend principal, portal do cliente
- Sistemas de destino:
  banco principal, storage, relatórios
- Pais de armazenamento:
  Brasil/EUA conforme infraestrutura e subprocessadores
- Ha transferencia internacional?:
  provavelmente sim
- Subprocessadores envolvidos:
  Railway, storage S3, email, analytics/integracoes quando habilitadas

- Controles de acesso:
  sessao por cookie, token de portal, backend authz por cliente
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial, validar por storage e banco
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar por contrato e categoria
- Evento que inicia a contagem:
  encerramento do contrato ou substituicao do artefato
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  client_id, portal tokens, jobs, aprovacoes, faturas, relatorios
- Como corrigir / excluir / exportar:
  operacao assistida
- SLA interno:
  pendente

- Principais riscos aos titulares:
  vazamento entre clientes, exposicao de anexos, acesso por token indevido
- Controles mitigatorios:
  escopo por cliente, sessao server-side, headers, revogacao de sessao
- Risco residual:
  medio
- Necessita RIPD?:
  `avaliar`

## Fluxo 3 - Portal do freelancer

- Nome do fluxo:
  portal do freelancer
- Sistema / modulo:
  `apps/web-freelancer`
- Owner do processo:
  operacoes + financeiro
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  disponibilizar jobs, horas, pagamentos, portfolio e onboarding
- Categoria de titulares:
  freelancers e parceiros individuais
- Categorias de dados pessoais:
  nome, email, identificador de login, registros de horas, status de pagamento, portfolio
- Ha dado sensivel?:
  nao identificado por padrao
- Origem dos dados:
  cadastro e operacao interna
- Compartilhamento interno:
  operacoes, financeiro, lideranca
- Compartilhamento externo:
  infraestrutura, email, eventualmente integracoes financeiras

- Papel da Edro:
  `controladora` ou `validar juridico`
- Cliente ou parceiro relacionado:
  parceiros/freelancers
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  backend, portal freelancer
- Sistemas de destino:
  banco principal, logs, eventualmente sistemas financeiros
- Pais de armazenamento:
  Brasil/EUA conforme infraestrutura e subprocessadores
- Ha transferencia internacional?:
  possivel
- Subprocessadores envolvidos:
  Railway, email, infraestrutura financeira quando aplicavel

- Controles de acesso:
  sessao server-side, authz por recurso
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar
- Evento que inicia a contagem:
  fim da relacao contratual
- Metodo de descarte:
  validar

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  perfil freelancer, jobs, pagamentos, portfolio
- Como corrigir / excluir / exportar:
  operacao assistida
- SLA interno:
  pendente

- Principais riscos aos titulares:
  exposicao de dados financeiros e horas, acesso cruzado entre freelancers
- Controles mitigatorios:
  sessao server-side, headers, authz por recurso
- Risco residual:
  medio
- Necessita RIPD?:
  `nao` por padrao

## Fluxo 4 - Briefings, producao e operacao interna

- Nome do fluxo:
  briefing, tarefas, producao e operacao interna
- Sistema / modulo:
  `edro`, `clients`, `studio`, `planning`, `operations`
- Owner do processo:
  operacoes
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  gerenciar demandas de clientes, producao de conteudo e operacao da agencia
- Categoria de titulares:
  representantes de clientes, equipe interna, freelancers
- Categorias de dados pessoais:
  nome, cargo, email, telefone, mensagens, anexos, contexto de briefing e comentarios
- Ha dado sensivel?:
  nao identificado por padrao, mas pode surgir em anexos ou briefing livre
- Origem dos dados:
  clientes, equipe interna, grupos, integracoes e portal
- Compartilhamento interno:
  areas de conteudo, operacoes, atendimento e lideranca
- Compartilhamento externo:
  IA, storage, comunicacao e integracoes

- Papel da Edro:
  `validar juridico`
- Cliente ou parceiro relacionado:
  clientes atendidos
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  backend principal, portais, WhatsApp, portal externo
- Sistemas de destino:
  banco principal, storage, IA, notificacoes
- Pais de armazenamento:
  Brasil/EUA conforme fornecedor
- Ha transferencia internacional?:
  provavelmente sim
- Subprocessadores envolvidos:
  OpenAI, Anthropic, Google Gemini, FAL, Leonardo, Railway, storage

- Controles de acesso:
  RBAC, authz por cliente, logs
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar por categoria
- Evento que inicia a contagem:
  encerramento do contrato ou obsolescencia operacional
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  client_id, briefing_id, tarefa, anexo, comentario, message ids
- Como corrigir / excluir / exportar:
  operacao assistida e revisao de impacto contratual
- SLA interno:
  pendente

- Principais riscos aos titulares:
  excesso de retencao, uso de IA em dado nao minimizado, anexo indevido
- Controles mitigatorios:
  isolamento por cliente, authz, storage controlado, gates de seguranca
- Risco residual:
  medio/alto
- Necessita RIPD?:
  `sim`

## Fluxo 5 - Comunicacoes por WhatsApp, email e social

- Nome do fluxo:
  comunicacoes e webhooks
- Sistema / modulo:
  `webhookWhatsApp`, `webhookInstagram`, `webhookEvolution`, `emailService`, `gmailRoutes`
- Owner do processo:
  atendimento/operacoes
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  receber e enviar comunicacoes operacionais e de atendimento
- Categoria de titulares:
  clientes, contatos de cliente, equipe interna, leads conforme uso
- Categorias de dados pessoais:
  nome, telefone, identificadores de mensageria, email, conteudo de mensagem, anexos
- Ha dado sensivel?:
  possivel por entrada livre
- Origem dos dados:
  Meta, Evolution, Gmail e usuarios
- Compartilhamento interno:
  atendimento, operacoes, IA quando habilitada
- Compartilhamento externo:
  Meta, Google, Evolution, Resend/SMTP

- Papel da Edro:
  `validar juridico`
- Cliente ou parceiro relacionado:
  clientes atendidos e respectivos contatos
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  WhatsApp, Instagram, Gmail, frontend, backend
- Sistemas de destino:
  banco, logs, memoria operacional, IA
- Pais de armazenamento:
  depende do provedor
- Ha transferencia internacional?:
  sim, em varios cenarios
- Subprocessadores envolvidos:
  Meta, Google, Evolution, Resend/SMTP, Railway, IA quando habilitada

- Controles de acesso:
  autenticacao de webhook, authz por cliente, trilhas operacionais
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar
- Evento que inicia a contagem:
  encerramento do atendimento ou contrato
- Metodo de descarte:
  validar

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  telefone, email, message id, webhook event id, client_id
- Como corrigir / excluir / exportar:
  operacao assistida
- SLA interno:
  pendente

- Principais riscos aos titulares:
  exposicao de conteudo de mensagens, replay/forja de webhook, retencao excessiva
- Controles mitigatorios:
  autenticacao de webhook, headers seguros, authz
- Risco residual:
  medio/alto
- Necessita RIPD?:
  `sim`

## Fluxo 6 - Reunioes, gravacoes e transcricoes

- Nome do fluxo:
  bots de reuniao, gravacoes e transcricoes
- Sistema / modulo:
  `meetings`, `Recall`
- Owner do processo:
  operacoes
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  registrar reunioes, transcrever, resumir e apoiar operacao
- Categoria de titulares:
  colaboradores, clientes, parceiros que participem da reuniao
- Categorias de dados pessoais:
  nome, email, agenda, audio, video, transcricao, metadata de reuniao
- Ha dado sensivel?:
  possivel por conteudo falado
- Origem dos dados:
  Google login/calendar, Recall, participantes
- Compartilhamento interno:
  operacoes, atendimento, IA/resumo
- Compartilhamento externo:
  Recall, Google, IA

- Papel da Edro:
  `validar juridico`
- Cliente ou parceiro relacionado:
  clientes e participantes
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  Google, Recall, backend
- Sistemas de destino:
  banco, storage, resumos, IA
- Pais de armazenamento:
  depende do fornecedor
- Ha transferencia internacional?:
  sim, provavelmente
- Subprocessadores envolvidos:
  Google, Recall, OpenAI e/ou outros provedores de IA

- Controles de acesso:
  authz de reuniao, webhook assinado, sessao segura
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar por contrato e necessidade operacional
- Evento que inicia a contagem:
  data da reuniao ou fim do contrato
- Metodo de descarte:
  validar

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  email de participante, meeting id, recall id, transcript/recording id
- Como corrigir / excluir / exportar:
  operacao assistida com impacto contratual avaliado
- SLA interno:
  pendente

- Principais riscos aos titulares:
  captura excessiva, exposicao de audio/transcricao, uso indevido para IA
- Controles mitigatorios:
  webhook autenticado, authz, logs, segregacao
- Risco residual:
  alto
- Necessita RIPD?:
  `sim`

## Fluxo 7 - Financeiro e faturamento

- Nome do fluxo:
  faturamento, pagamentos e integracoes financeiras
- Sistema / modulo:
  `financial`, portal cliente, portal freelancer, possiveis integracoes Omie
- Owner do processo:
  financeiro
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  administrar pagamentos, faturas e acompanhamento financeiro
- Categoria de titulares:
  clientes, freelancers, parceiros
- Categorias de dados pessoais:
  nome, email, dados de fatura, historico de pagamento, anexos financeiros
- Ha dado sensivel?:
  nao identificado por padrao, mas dado financeiro merece tratamento reforcado
- Origem dos dados:
  operacao interna, clientes, freelancers, integracoes
- Compartilhamento interno:
  financeiro, operacoes, diretoria
- Compartilhamento externo:
  Omie ou outros sistemas contabeis quando habilitados

- Papel da Edro:
  `validar juridico`
- Cliente ou parceiro relacionado:
  clientes e fornecedores/freelancers
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  backend, portais, integracoes contabeis
- Sistemas de destino:
  banco, relatorios, integradores
- Pais de armazenamento:
  Brasil/EUA conforme fornecedor
- Ha transferencia internacional?:
  possivel
- Subprocessadores envolvidos:
  Railway, Omie e eventualmente email/storage

- Controles de acesso:
  authz por cliente/recurso, segregacao por portal
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar com obrigacoes legais e contratuais
- Evento que inicia a contagem:
  encerramento do exercicio/obrigacao
- Metodo de descarte:
  validar

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  client_id, freelancer_id, invoice/payment id
- Como corrigir / excluir / exportar:
  com validacao financeira e juridica
- SLA interno:
  pendente

- Principais riscos aos titulares:
  acesso indevido a faturas/pagamentos, retencao acima do necessario
- Controles mitigatorios:
  authz por recurso, portais segregados
- Risco residual:
  medio
- Necessita RIPD?:
  `avaliar`

## Fluxo 8 - Logs, auditoria e observabilidade

- Nome do fluxo:
  logs tecnicos e trilha de auditoria
- Sistema / modulo:
  backend logging, auditoria, Railway, GitHub workflows
- Owner do processo:
  seguranca/engenharia
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  `2026-03-21`
- Status:
  `ativo`

- Finalidade:
  diagnostico, seguranca, resposta a incidente e trilha de auditoria
- Categoria de titulares:
  usuarios autenticados, operadores internos, eventualmente contatos tecnicos
- Categorias de dados pessoais:
  email, user id, tenant id, IP, user-agent, metadata de evento
- Ha dado sensivel?:
  nao por desenho, mas pode haver risco de excesso em logs
- Origem dos dados:
  requests, autenticação, admin actions, webhooks
- Compartilhamento interno:
  engenharia, seguranca, operacoes
- Compartilhamento externo:
  infraestrutura/plataforma de runtime

- Papel da Edro:
  `controladora` ou `validar juridico`
- Cliente ou parceiro relacionado:
  todos os fluxos cobertos
- Base legal principal:
  `validar juridico`
- Base legal secundaria, se houver:
  `validar juridico`

- Sistemas de origem:
  backend, frontend, GitHub, Railway
- Sistemas de destino:
  logs de plataforma e storage interno
- Pais de armazenamento:
  depende da plataforma
- Ha transferencia internacional?:
  possivel
- Subprocessadores envolvidos:
  Railway, GitHub e demais plataformas de observabilidade

- Controles de acesso:
  acesso restrito por papel
- Criptografia em transito:
  sim
- Criptografia em repouso:
  validar com plataforma
- Logs / auditoria:
  sim
- Prazo de retencao:
  validar politica
- Evento que inicia a contagem:
  geracao do evento
- Metodo de descarte:
  politica de retention da plataforma e descarte controlado

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  user id, email, timestamp, request id
- Como corrigir / excluir / exportar:
  altamente condicionado a obrigacao de seguranca e auditoria
- SLA interno:
  pendente

- Principais riscos aos titulares:
  log excessivo, acesso indevido a trilhas de auditoria
- Controles mitigatorios:
  reducao de logging sensivel, acesso restrito, governanca
- Risco residual:
  medio
- Necessita RIPD?:
  `nao` por padrao
