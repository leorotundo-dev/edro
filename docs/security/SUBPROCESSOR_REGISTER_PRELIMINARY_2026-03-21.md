# Subprocessor Register Preliminary - 2026-03-21

## Objetivo

Mapear os subprocessadores e fornecedores tecnicos ja inferiveis do ambiente e do codigo da Edro.

Este registro e `preliminar`. Onde houver duvida de escopo contratual, pais ou papel, o item fica marcado para validacao.

| Fornecedor | Servico prestado | Sistemas impactados | Categoria de dados | Papel da Edro no fluxo | Pais de tratamento | Ha transferencia internacional | Base contratual | DPA assinado | Owner interno | Ultima revisao |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Railway | hospedagem de aplicacao, runtime, rede e banco gerenciado | backend, portais, banco, redis | dados de aplicacao, logs tecnicos, dados pessoais operacionais | varia por fluxo, validar | EUA | sim | validar contrato vigente | validar | engenharia/infra | 2026-03-21 |
| Amazon Web Services / S3 | armazenamento de arquivos e bibliotecas | uploads, biblioteca, anexos | anexos, arquivos e metadata | varia por fluxo | validar regiao/contrato | possivel | validar contrato vigente | validar | engenharia | 2026-03-21 |
| Resend / SMTP | email transacional | auth, notificacoes, onboarding | email, metadata de envio | varia por fluxo | validar | sim ou validar | validar contrato vigente | validar | operacoes/engenharia | 2026-03-21 |
| Google | OAuth, Gmail, Calendar e possiveis artefatos de reuniao | auth Google, Gmail, Calendar, meetings | email, agenda, metadata de conta, eventos de calendario | varia por fluxo | validar | sim | validar contrato vigente | validar | engenharia | 2026-03-21 |
| Meta | WhatsApp, Instagram, webhooks e OAuth | comunicacoes, webhooks, conectores | telefone, identificadores, conteudo de mensagem, metadata social | varia por fluxo | validar | sim | validar contrato vigente | validar | engenharia/atendimento | 2026-03-21 |
| Recall.ai | bots de reuniao, gravacao e transcricao | meetings | metadata de reuniao, participantes, gravacoes, transcricoes | varia por fluxo | validar | sim | validar contrato vigente | validar | engenharia/operacoes | 2026-03-21 |
| Evolution API | integracao operacional de WhatsApp | grupos WhatsApp, mensagens, conexoes | telefone, JID, nome, conteudo de mensagem, metadata de grupo | varia por fluxo | validar hospedagem real | validar | validar contrato vigente | validar | engenharia | 2026-03-21 |
| OpenAI | IA generativa, transcricao e enriquecimento | briefing, copy, meetings, inteligencia | texto, prompts, transcricoes, contexto operacional | varia por fluxo | EUA | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Anthropic | IA generativa | automacoes, criacao e apoio operacional | texto, prompts, contexto operacional | varia por fluxo | EUA | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Google Gemini | IA generativa | criatividade, copy, enriquecimento | texto, prompts, contexto operacional | varia por fluxo | validar | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| FAL.ai | geracao/transformacao de imagem | studio, canvas, criativos | imagens, prompts, referencias visuais | varia por fluxo | validar | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Leonardo AI | geracao de imagem | studio, criativos | imagens, prompts, referencias visuais | varia por fluxo | validar | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Serper | pesquisa web | intelligence, studio, enriquecimento | termos de busca, contexto de pesquisa | varia por fluxo | validar | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Tavily | pesquisa/extracao web | intelligence, studio, enriquecimento | termos de busca, URLs, contexto de pesquisa | varia por fluxo | validar | sim | validar contrato vigente | validar | plataforma IA | 2026-03-21 |
| Reportei | metricas e analytics de marketing | reportei, relatorios, metricas | dados de performance e identificadores de conta/conector | varia por fluxo | validar | validar | validar contrato vigente | validar | operacoes/analytics | 2026-03-21 |
| Omie | integracao financeira/contabil quando ativa | financeiro, faturamento | dados de faturamento e metadata operacional | varia por fluxo | Brasil ou validar | validar | validar contrato vigente | validar | financeiro | 2026-03-21 |

## Campos de apoio

- URL da politica de privacidade do fornecedor:
  preencher por fornecedor antes de envio externo
- URL do DPA:
  preencher por fornecedor antes de envio externo
- URL da documentacao de seguranca:
  preencher por fornecedor antes de envio externo
- Risco do fornecedor:
  `medio/alto` para provedores com conteudo de cliente, reuniao, IA ou infraestrutura principal
- Observacoes:
  este registro deve ser refinado com juridico e compras antes de uso comercial final

## Proximas acoes

1. confirmar quais fornecedores estao `ativos em producao` versus apenas `suportados pelo codigo`
2. anexar URL de politica, DPA e documentacao de seguranca
3. registrar pais de tratamento com base contratual correta
4. marcar `DPA assinado` como `sim/nao`
