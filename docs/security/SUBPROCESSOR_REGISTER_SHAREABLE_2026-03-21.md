# Subprocessor Register Shareable - 2026-03-21

## Objetivo

Disponibilizar uma versao `compartilhavel` do registro de subprocessadores da Edro para uso em due diligence e resposta a cliente enterprise, sem substituir o registro preliminar interno e sem prometer clausulas ainda nao validadas.

## Regra de uso

- usar este documento como resumo comercial/tecnico inicial
- confirmar com juridico e compras antes de anexar a contrato
- onde houver `validar`, nao afirmar para cliente como posicao final

## Registro resumido

| Fornecedor | Servico principal | Ativo em producao inferido | Customer-facing | Categoria de dados envolvida | Transferencia internacional potencial | Status contratual/documental |
| --- | --- | --- | --- | --- | --- | --- |
| Railway | hospedagem de aplicacao, runtime e banco | sim | nao direto | dados de aplicacao, logs tecnicos, dados operacionais | sim | validar contrato e localizacao final |
| Amazon Web Services / S3 | armazenamento de arquivos e anexos | suportado pelo ambiente, validar uso ativo por bucket/regiao | nao direto | anexos, arquivos, metadata | validar por regiao | validar contrato e regiao efetiva |
| Resend / SMTP | email transacional | sim ou validar por ambiente final | indireto | email, metadata de envio | sim ou validar | validar fornecedor ativo e DPA |
| Google | OAuth, Gmail, Calendar e servicos associados | sim quando conectores estao habilitados | indireto | email, agenda, metadata de conta, eventos | sim | validar produtos efetivamente usados e clausulas |
| Meta | WhatsApp, Instagram, webhooks e OAuth | sim | sim | telefone, identificadores, conteudo de mensagem, metadata social | sim | validar app/business e termos aplicaveis |
| Recall.ai | reunioes, gravacoes e transcricoes | sim | indireto | metadata de reuniao, participantes, gravacoes, transcricoes | sim | validar contrato e politica do fornecedor |
| Evolution API | integracao operacional de WhatsApp | sim | indireto | telefone, nome, JID, mensagens e metadata de grupo | validar hospedagem real | validar hospedagem e acordo aplicavel |
| OpenAI | IA generativa, transcricao e enriquecimento | suportado pelo ambiente, validar fluxos ativos por cliente | indireto | prompts, texto, transcricoes, contexto operacional | sim | validar escopo contratual e opt-outs aplicaveis |
| Anthropic | IA generativa | suportado pelo ambiente | indireto | prompts, texto, contexto operacional | sim | validar uso ativo e clausulas |
| Google Gemini | IA generativa | suportado pelo ambiente | indireto | prompts, texto, contexto operacional | sim | validar uso ativo e clausulas |
| FAL.ai | geracao/transformacao de imagem | suportado pelo ambiente | indireto | imagens, prompts, referencias visuais | sim | validar uso ativo e clausulas |
| Leonardo AI | geracao de imagem | suportado pelo ambiente | indireto | imagens, prompts, referencias visuais | sim | validar uso ativo e clausulas |
| Serper | pesquisa web | suportado pelo ambiente | indireto | termos de busca, contexto de pesquisa | sim | validar uso ativo e clausulas |
| Tavily | pesquisa/extracao web | suportado pelo ambiente | indireto | termos de busca, URLs, contexto de pesquisa | sim | validar uso ativo e clausulas |
| Reportei | metricas e analytics de marketing | suportado pelo ambiente, validar conta ativa | indireto | dados de performance e identificadores de conta | validar | validar contrato e escopo de uso |
| Omie | integracao financeira/contabil | suportado pelo ambiente, validar uso ativo | indireto | dados de faturamento e metadata financeira | validar | validar conta ativa e base contratual |

## Como interpretar os status

- `sim`
  ha evidencia tecnica suficiente de presenca no runtime, codigo ou configuracao de producao
- `suportado pelo ambiente`
  o sistema suporta o fornecedor, mas a ativacao real pode variar por cliente, tenant ou momento operacional
- `validar`
  depende de confirmacao contratual, comercial ou de configuracao efetiva

## O que pode ser afirmado com seguranca hoje

- a Edro ja possui um inventario preliminar de subprocessadores tecnicos
- parte relevante desses fornecedores pode envolver transferencia internacional
- o bloco contratual final ainda depende de validacao juridica e documental por fornecedor

## O que nao deve ser afirmado com base apenas neste documento

- que todos os fornecedores listados estao ativos para todos os clientes
- que todos os `DPAs` ja estao assinados
- que nao existe transferencia internacional
- que a localizacao exata de tratamento esta fechada para todos os fluxos

## Documentos relacionados

- `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md`
- `LGPD_EVIDENCE_MATRIX_2026-03-21.md`
- `DPA_READINESS_CHECKLIST.md`
- `STANDARD_SECURITY_QUESTIONNAIRE_RESPONSE.md`
