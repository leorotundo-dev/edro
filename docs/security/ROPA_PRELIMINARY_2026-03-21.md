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

## Fluxo 9 - Geracao de copy e conteudo via IA

- Nome do fluxo:
  geracao autonoma de copy, conteudo e briefing via agentes de IA
- Sistema / modulo:
  services/ai, agentWriter, agentPlanner, agentAuditor, agentRedator, agentDiretorArte, copyOrchestrator, jobAutomationService
- Owner do processo:
  produto/conteudo
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  2026-03-21
- Status:
  ativo

- Finalidade:
  gerar drafts de copy, campanhas e briefings usando perfis de clientes, historico de engajamento e regras aprendidas
- Categoria de titulares:
  representantes de clientes, audiencias e segmentos mencionados nos briefings, equipe interna
- Categorias de dados pessoais:
  nome e email de clientes referenciados no briefing, dados de comportamento de audiencia (anonimizados), regras de tom e marca derivadas de dados historicos
- Ha dado sensivel?:
  possivel quando briefing menciona saude, financas ou dados de criancas
- Origem dos dados:
  briefings internos, perfis de cliente, metricas de engajamento, feedbacks de copy, regras de aprendizado
- Compartilhamento interno:
  produto, atendimento, conteudo
- Compartilhamento externo:
  OpenAI, Anthropic Claude, Google Gemini, FAL, Leonardo conforme provedor configurado

- Papel da Edro:
  validar juridico (controladora para dados do cliente; papel em relacao a audiencias depende do contrato)
- Cliente ou parceiro relacionado:
  clientes atendidos
- Base legal principal:
  validar juridico (execucao contratual ou legitimo interesse)
- Base legal secundaria, se houver:
  validar juridico

- Sistemas de origem:
  banco principal (briefings, perfis, metricas), backend
- Sistemas de destino:
  provedores de IA externos, banco (resultados armazenados), portais internos
- Pais de armazenamento:
  EUA (provedores de IA); Brasil/EUA banco principal
- Ha transferencia internacional?:
  sim, dados enviados a provedores de IA fora do Brasil
- Subprocessadores envolvidos:
  OpenAI, Anthropic, Google, FAL, Leonardo; Railway como infraestrutura

- Controles de acesso:
  authz por cliente, dados minimizados antes do envio, sem PII direta quando possivel
- Criptografia em transito:
  sim (TLS para chamadas de API)
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial (entradas e saidas armazenadas em campaign_behavioral_copies)
- Prazo de retencao:
  validar por categoria e necessidade operacional
- Evento que inicia a contagem:
  fim do contrato ou obsolescencia do conteudo
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  briefing_id, campaign_id, behavioral_copy_id, client_id
- Como corrigir / excluir / exportar:
  operacao assistida; outputs de IA podem conter dados pessoais derivados que precisam de revisao manual
- SLA interno:
  pendente

- Principais riscos aos titulares:
  transferencia de dado pessoal a provedor de IA sem base legal ou DPA adequado, retencao de output contendo PII, uso de dado sensivel sem avaliacao de RIPD
- Controles mitigatorios:
  minimizacao de dados, DPAs com provedores de IA, restricoes de forbidden_claims no perfil do cliente, gates de brand safety via agentAuditor
- Risco residual:
  alto
- Necessita RIPD?:
  sim

## Fluxo 10 - Instagram Direct Messages

- Nome do fluxo:
  recepcao e processamento de mensagens diretas do Instagram
- Sistema / modulo:
  webhookInstagram, instagram_messages, briefingRepository
- Owner do processo:
  atendimento/operacoes
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  2026-03-21
- Status:
  ativo

- Finalidade:
  receber DMs de clientes via Instagram, armazenar o conteudo e auto-criar briefings para a agencia
- Categoria de titulares:
  seguidores/contatos do cliente que enviam DMs, representantes de clientes
- Categorias de dados pessoais:
  sender_id do Instagram, conteudo de mensagem (texto, audio, imagem, video, story_reply), media_url, raw_payload do evento Meta
- Ha dado sensivel?:
  possivel por entrada livre no conteudo das mensagens
- Origem dos dados:
  Meta/Instagram via webhook; autenticado por verify_token e assinatura HMAC opcional
- Compartilhamento interno:
  atendimento, operacoes, IA (briefing automatico via Gemini)
- Compartilhamento externo:
  Meta (fonte), Google Gemini (processamento de briefing), Railway

- Papel da Edro:
  validar juridico (operadora em relacao ao cliente dono da pagina; controladora dos dados armazenados internamente)
- Cliente ou parceiro relacionado:
  clientes donos das paginas do Instagram configuradas
- Base legal principal:
  validar juridico (execucao contratual com o cliente)
- Base legal secundaria, se houver:
  validar juridico

- Sistemas de origem:
  Meta Graph API (webhook POST)
- Sistemas de destino:
  banco (instagram_messages), IA (Gemini), banco (edro_briefings quando auto-criado)
- Pais de armazenamento:
  Brasil/EUA conforme Railway; EUA para Gemini
- Ha transferencia internacional?:
  sim
- Subprocessadores envolvidos:
  Meta, Google Gemini, Railway

- Controles de acesso:
  verify_token + assinatura HMAC, isolamento por tenant via page_id, idempotencia por message_id
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  sim (raw_payload armazenado; jarvis_processed flag)
- Prazo de retencao:
  validar; raw_payload contem dado pessoal do remetente
- Evento que inicia a contagem:
  encerramento do contrato ou solicitacao de exclusao
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  sender_id do Instagram, instagram_thread_id, message_id (mid), client_id, tenant_id
- Como corrigir / excluir / exportar:
  operacao assistida; impacta briefings gerados automaticamente
- SLA interno:
  pendente

- Principais riscos aos titulares:
  armazenamento de conteudo sensivel enviado por DM, transferencia de conteudo para IA sem consentimento do remetente, identificacao de remetentes anonimos
- Controles mitigatorios:
  autenticacao HMAC, isolamento por tenant, minimizacao no envio a IA (apenas texto), DPA com Meta e Google
- Risco residual:
  alto
- Necessita RIPD?:
  sim

## Fluxo 11 - Social Listening e monitoramento de conteudo externo

- Nome do fluxo:
  coleta e analise de conteudo publico de redes sociais e concorrentes
- Sistema / modulo:
  SocialListeningService, socialListeningRoutes, opportunityDetector, competitorIntelligence
- Owner do processo:
  produto/estrategia
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  2026-03-21
- Status:
  ativo

- Finalidade:
  monitorar mencoes, tendencias, concorrentes e oportunidades de conteudo em plataformas publicas
- Categoria de titulares:
  autores de posts publicos coletados, perfis de concorrentes, clientes monitorados
- Categorias de dados pessoais:
  handles publicos, conteudo de posts publicos, metadata de engajamento publico, identificadores de conta
- Ha dado sensivel?:
  nao identificado por padrao, mas depende do contexto coletado
- Origem dos dados:
  APIs de plataformas sociais, Proxycurl, scraping autorizado
- Compartilhamento interno:
  produto, estrategia, atendimento
- Compartilhamento externo:
  Proxycurl e demais integradores de dados sociais quando habilitados, IA para analise

- Papel da Edro:
  validar juridico (tratamento de dados publicos requer avaliacao de base legal)
- Cliente ou parceiro relacionado:
  clientes atendidos beneficiados pelo monitoramento
- Base legal principal:
  validar juridico (legitimo interesse ou contrato, dependendo da finalidade)
- Base legal secundaria, se houver:
  validar juridico

- Sistemas de origem:
  plataformas sociais via API ou Proxycurl, backend
- Sistemas de destino:
  banco, IA, relatorios internos
- Pais de armazenamento:
  Brasil/EUA conforme fornecedor
- Ha transferencia internacional?:
  sim
- Subprocessadores envolvidos:
  Proxycurl, APIs de plataformas, provedores de IA, Railway

- Controles de acesso:
  authz por cliente, dados isolados por tenant
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar; dados de terceiros publicos sao de curta relevancia operacional
- Evento que inicia a contagem:
  obsolescencia operacional ou fim do contrato
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar (quando aplicavel a dado publico)
- Como localizar os dados:
  handle, post_id, client_id, timestamp de coleta
- Como corrigir / excluir / exportar:
  operacao assistida; dado publico tem restricoes especificas de LGPD
- SLA interno:
  pendente

- Principais riscos aos titulares:
  coleta de dado publico sem base legal adequada, uso de perfis de terceiros sem avaliacao de RIPD, repasse a IA sem consentimento
- Controles mitigatorios:
  minimizacao de coleta, avaliacao de base legal por finalidade, DPAs com integradores
- Risco residual:
  medio/alto
- Necessita RIPD?:
  avaliar

## Fluxo 12 - Analytics e metricas de engajamento

- Nome do fluxo:
  sincronizacao e analise de metricas de desempenho de conteudo
- Sistema / modulo:
  metaSyncWorker, reporteiSync, format_performance_metrics, learningLoopService, copyRoiWorker
- Owner do processo:
  produto/dados
- Owner tecnico:
  engenharia
- Data da ultima revisao:
  2026-03-21
- Status:
  ativo

- Finalidade:
  coletar metricas de engajamento de plataformas, alimentar o learning engine, calcular ROI de copy e reportar ao cliente
- Categoria de titulares:
  membros da audiencia dos clientes cujos dados de engajamento sao coletados (em forma agregada ou anonimizada conforme plataforma)
- Categorias de dados pessoais:
  metricas de desempenho agregadas (likes, saves, shares, CTR, alcance), potencialmente identificadores de post/conteudo, dados de conta do cliente nas plataformas
- Ha dado sensivel?:
  nao identificado por padrao
- Origem dos dados:
  Meta Graph API (Instagram/Facebook insights), Reportei, plataformas de analytics, feedback de copy interno
- Compartilhamento interno:
  produto, conteudo, atendimento, IA/learning engine
- Compartilhamento externo:
  Reportei, Meta, plataformas de analytics, eventualmente visualizacoes para o cliente

- Papel da Edro:
  operadora em relacao ao cliente (dados de audiencia sao do cliente); controladora para dados de aprendizado internos
- Cliente ou parceiro relacionado:
  clientes atendidos
- Base legal principal:
  validar juridico (execucao contratual; dado de audiencia esta sujeito a consentimento do titular na plataforma)
- Base legal secundaria, se houver:
  validar juridico

- Sistemas de origem:
  Meta, Reportei, plataformas sociais, banco interno
- Sistemas de destino:
  banco (format_performance_metrics, client_behavior_profiles, campaign_behavioral_copies), relatorios, IA
- Pais de armazenamento:
  Brasil/EUA
- Ha transferencia internacional?:
  possivel
- Subprocessadores envolvidos:
  Meta, Reportei, Railway, IA quando learning engine e acionado

- Controles de acesso:
  authz por cliente, metricas isoladas por tenant
- Criptografia em transito:
  sim
- Criptografia em repouso:
  parcial
- Logs / auditoria:
  parcial
- Prazo de retencao:
  validar por periodo de relevancia operacional e obrigacoes contratuais
- Evento que inicia a contagem:
  fim do contrato ou pedido de exclusao
- Metodo de descarte:
  validar politica

- Canal de atendimento:
  canal do titular a formalizar
- Como localizar os dados:
  campaign_format_id, client_id, post_id, tenant_id, data de coleta
- Como corrigir / excluir / exportar:
  operacao assistida; exclusao de metricas afeta precisao do learning engine
- SLA interno:
  pendente

- Principais riscos aos titulares:
  uso de metricas de audiencia para perfilizacao sem avaliacao de RIPD, retencao alem da necessidade operacional
- Controles mitigatorios:
  dados em forma agregada quando possivel, isolamento por cliente, DPAs com provedores
- Risco residual:
  medio
- Necessita RIPD?:
  avaliar

---

## Pendencias para validacao juridica e operacional

Os seguintes itens estao pendentes de decisao da empresa ou revisao juridica:

1. Definir bases legais para cada fluxo (execucao contratual, legitimo interesse, consentimento)
2. Confirmar papel da Edro (controladora, operadora, co-controladora) por fluxo
3. Formalizar prazos de retencao e metodos de descarte por categoria de dado
4. Assinar DPAs com subprocessadores: OpenAI, Anthropic, Google, Meta, Recall, Proxycurl, Reportei, Railway
5. Confirmar nome, cargo e contato do DPO (ou encarregado)
6. Definir canal oficial de atendimento ao titular (email, formulario)
7. Avaliar necessidade de RIPD para fluxos 4, 5, 6, 9, 10 (marcados como sim)
8. Revisar fluxos 7, 8, 11, 12 (marcados como avaliar) apos analise juridica
9. Validar transferencias internacionais conforme art. 33 LGPD
