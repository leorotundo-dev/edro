# RIPD - Briefings, Producao e Operacao Interna

## Identificacao

- Nome do fluxo / processamento:
  Briefing, tarefas, producao de conteudo e operacao interna da agencia
- Referencia ROPA:
  Fluxo 4 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  operacoes
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE — enviar para revisao antes de aprovar
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma Edro centraliza o fluxo operacional da agencia: criacao de briefings por clientes ou equipe interna, atribuicao de tarefas, producao de conteudo (copy, imagem, roteiro), aprovacao interna e pelo cliente, e arquivamento do historico de producao. Os dados pessoais surgem em tres fontes principais:

- informacoes de contato e contexto dos representantes de clientes inseridas nos briefings
- comunicacoes internas (comentarios, mensagens, instrucoes de producao)
- anexos e arquivos enviados por clientes ou membros da equipe

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Execucao do servico contratado (producao de conteudo) | Art. 7, II — execucao de contrato | Central ao contrato com o cliente; sem esses dados nao ha como executar o job |
| Historico operacional e defesa de direitos | Art. 7, II e IX — contrato e legitimo interesse | Historico e necessario para resolucao de disputas e continuidade do servico |
| Comunicacao interna e coordenacao de producao | Art. 7, II — execucao de contrato | Necessario para coordenar a equipe e entregar o servico |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| Identificacao de representantes | nome, cargo, email, telefone do contato do cliente | por cliente | nao |
| Conteudo de briefings | texto livre descrevendo o job, produto, campanha, instrucoes | por job | possivel — depende do setor do cliente |
| Comentarios e instrucoes | mensagens internas entre equipe e cliente | por tarefa | possivel por entrada livre |
| Anexos e arquivos | imagens, PDFs, planilhas enviados pelo cliente ou equipe | por job | possivel — cliente pode enviar material com dados de terceiros |
| Metadados de producao | timestamps, status, assignees, historico de alteracoes | por job | nao diretamente |

### 1.4 Titulares

- Perfil dos titulares: representantes de clientes empresariais (B2B) e colaboradores internos
- Relacao de poder: relacao contratual equilibrada no caso de clientes B2B; colaboradores internos podem ter menor poder de barganha
- Expectativa razoavel: clientes sabem que seus dados de briefing sao usados para producao; colaboradores sabem que suas acoes na plataforma sao registradas

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Criacao do briefing | Portal interno / portal do cliente | dados do cliente + instrucoes do job | nao |
| 2. Armazenamento | banco principal (edro_briefings) | todos os campos do briefing | Railway |
| 3. Atribuicao e producao | Portal interno | assignees, comentarios, status | nao |
| 4. Envio a IA (quando habilitado) | copyOrchestrator | fragmentos do briefing | OpenAI / Anthropic / Gemini |
| 5. Armazenamento de anexos | storage (S3/equivalente) | arquivos enviados | provedor de storage |
| 6. Aprovacao | portal do cliente | output de producao + comentarios | nao |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido atualmente — PENDENTE definicao
- Evento que inicia a contagem: encerramento do contrato ou obsolescencia operacional
- Metodo de descarte: PENDENTE definicao de politica

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim. O briefing e o artefato central do servico de agencia. Sem ele nao e possivel executar o job. O registro historico serve tanto para defesa de direitos quanto para melhoria continua do servico.

### 2.2 Os dados sao minimos para a finalidade?

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| Nome e email do contato do cliente | Sim — necessario para comunicacao | Nao ha alternativa |
| Conteudo do briefing (texto livre) | Sim — define o job | Poderia ter campos estruturados para reduzir dado sensivel acidental |
| Comentarios internos | Sim — coordenacao da equipe | Poderia ter TTL de retencao menor |
| Anexos | Sim — entrega do job | Verificar se todos os anexos sao retidos ou apenas os essenciais |
| Historico completo de status | Util para auditoria | Granularidade poderia ser reduzida apos encerramento do contrato |

Recomendacao: avaliar campos estruturados de briefing para reduzir risco de dado sensivel acidental em texto livre. Definir TTL diferenciado para comentarios internos vs artefatos de entrega.

### 2.3 Ha transferencia internacional?

- Paises de destino: EUA (OpenAI, Anthropic, Google Gemini — quando IA e acionada nos jobs; Railway como infraestrutura; storage quando fora do Brasil)
- Mecanismo de adequacao: clausulas contratuais padrao dos provedores
- DPA assinado: PENDENTE verificacao e formalizacao

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Acesso entre tenants | Colaborador acessa briefings de outro cliente | Baixa | Alta | BA | RBAC + authz por tenant; IDOR corrigido (SEC-104) |
| Anexo com dado de terceiro | Cliente envia arquivo com dados pessoais de consumidores finais | Media | Alta | MA | Nenhum controle preventivo; tratamento post-hoc via DSR |
| Dado sensivel em briefing livre | Cliente descreve campanha envolvendo saude, financas ou menores | Media | Alta | MA | agentAuditor como gate parcial; sem controle preventivo |
| Retencao indefinida | Briefings e anexos sem politica de expiracao | Alta | Media | AM | Nenhum — PENDENTE |
| Vazamento via IA | Fragmento do briefing enviado a provedor sem DPA formal | Media | Media | MM | Mitigado parcialmente por minimizacao; DPA PENDENTE |
| Acesso indevido por colaborador demitido | Token ou sessao nao revogada apos desligamento | Baixa | Alta | BA | Revogacao de sessao implementada; processo operacional PENDENTE |

### Risco residual geral

- Nivel: medio
- Justificativa: os principais riscos sao mitigaveis por politica (retencao, processo de desligamento) e por acao tecnica simples (formalizacao de DPAs). O risco de dado sensivel acidental em campos livres e o mais complexo e requer avaliacao continua.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Definir politica de retencao e TTL para briefings e comentarios | Retencao indefinida | Juridico + Engenharia | 2026-05-15 | PENDENTE |
| Formalizar DPAs com OpenAI, Anthropic e Google | Vazamento via IA | Juridico | 2026-05-01 | PENDENTE |
| Processo formal de revogacao de acesso no desligamento de colaboradores | Acesso indevido pos-desligamento | RH + Operacoes | 2026-04-30 | PENDENTE |
| Avisar usuario ao iniciar briefing sobre nao incluir dados pessoais de terceiros em texto livre | Dado sensivel acidental | Produto | 2026-06-01 | PENDENTE |
| Definir politica de retencao e exclusao de anexos | Retencao indefinida + vazamento | Juridico + Engenharia | 2026-05-15 | PENDENTE |

---

## 5. Consultores e stakeholders consultados

| Papel | Nome | Data |
| --- | --- | --- |
| Elaboracao inicial (tecnica) | Engenharia/Produto | 2026-03-23 |
| Juridico/privacidade | PENDENTE | — |
| Operacoes | PENDENTE | — |

---

## 6. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com as medidas listadas na secao 4 implementadas

### Justificativa

O tratamento tem base legal solida (execucao de contrato) e e central ao negocio. Os riscos identificados sao mitigaveis. O ponto critico e a definicao de politicas de retencao e a formalizacao dos DPAs com provedores de IA. Nenhum dado sensivel e coletado intencionalmente, mas o risco de entrada acidental em campos livres justifica alertas preventivos no produto.

### Consulta a ANPD necessaria?

- [x] Nao — riscos residuais medios, dado nao sensivel por padrao, controles em implementacao

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
