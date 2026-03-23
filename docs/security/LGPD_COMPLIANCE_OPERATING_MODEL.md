# LGPD Compliance Operating Model - Edro Digital

## Objetivo

Transformar privacidade em operacao real, nao apenas texto contratual. Este documento nao substitui assessoria juridica, mas organiza o modelo minimo que a Edro precisa para operar de forma defensavel diante de clientes grandes e fiscalizacao.

## Premissas

- A classificacao de `controlador` e `operador` pode mudar conforme a operacao.
- Toda decisao sobre papel, base legal e retencao precisa ser documentada.
- Privacidade sem evidencia operacional nao sustenta due diligence.

## Estrutura minima de governanca

### Papeis internos

- `Responsavel executivo`
  Sponsor do programa, remove bloqueios e aprova prioridade.
- `Encarregado / DPO`
  Ponto de contato com titulares e ANPD, com canal funcional.
- `Lider tecnico`
  Garante que os controles definidos entram em produto, API e infraestrutura.
- `Juridico / privacidade`
  Fecha base legal, contratos, avisos, subprocessadores e transferencia internacional.
- `Operacoes`
  Executa direitos do titular, retencao, descarte e incidente.

## Mapa operacional a produzir

### Registro de operacoes de tratamento

Para cada fluxo, registrar:

- sistema
- dado pessoal tratado
- finalidade
- base legal
- categoria de titular
- papel da Edro
- compartilhamento
- transferencia internacional
- prazo de retencao
- owner do processo

### Fluxos minimos a mapear

- autenticacao e cadastro
- portal cliente
- portal freelancer
- briefing e workflow interno
- financeiro e faturamento
- email, WhatsApp e notificacoes
- analytics, relatorios e score
- IA generativa e enriquecimento
- suporte, tickets e gravacoes de reuniao
- logs e auditoria

## Pontos de decisao juridico-operacionais

### Papel da Edro

A Edro precisa decidir e documentar, por fluxo, quando atua como:

- `controladora`
- `operadora`
- `controladora conjunta`, se aplicavel por contrato

Essa decisao afeta:

- aviso de privacidade
- DPA
- canal do titular
- responsabilidade em incidente
- compartilhamento e transferencia internacional

### Subprocessadores

Manter inventario vivo com:

- fornecedor
- servico prestado
- categoria de dado
- pais de tratamento
- clausula contratual
- base de transferencia internacional
- owner interno

## Direitos do titular

### Processo operacional minimo

1. Receber pedido por canal oficial.
2. Validar identidade do solicitante.
3. Classificar tipo de pedido.
4. Localizar sistemas e dados afetados.
5. Executar resposta, correcao, anonimizar, excluir ou justificar impossibilidade.
6. Registrar prazo, owner, evidencias e resposta enviada.

### O que precisa existir

- canal funcional e publico
- playbook por tipo de solicitacao
- fila unica ou sistema de tickets
- templates de resposta
- SLA interno
- criterio de escalonamento para juridico

## Incidente de seguranca com dado pessoal

### Processo minimo

1. Detectar e classificar.
2. Conter o incidente.
3. Preservar evidencias.
4. Medir dados, titulares, risco e impacto.
5. Acionar juridico, privacidade e lideranca.
6. Decidir comunicacao a clientes, titulares e ANPD.
7. Registrar causa raiz e acao corretiva.

### Observacao regulatoria

Em `2026-03-21`, a pagina oficial da ANPD informa prazo de `3 dias uteis` para comunicacao de incidente de seguranca com risco ou dano relevante. O processo interno precisa ser mais rapido que isso.

## RIPD

### Quando avaliar obrigatoriedade ou necessidade pratica

- uso de IA em decisao ou perfilizacao relevante
- dados de grande volume
- dados sensiveis, se houver
- vigilancia ou monitoramento
- integracoes externas com impacto significativo
- compartilhamento ampliado ou transferencia internacional

### Conteudo minimo

- descricao do tratamento
- necessidade e proporcionalidade
- riscos aos titulares
- controles mitigatorios
- risco residual
- aprovacao e owner

## Retencao e descarte

### Politica minima

Toda categoria de dado precisa ter:

- fundamento de retencao
- prazo
- evento de inicio da contagem
- forma de descarte
- excecoes legais e contratuais

### Categorias que exigem tabela propria

- autenticacao
- anexos e arquivos
- conversas e notificacoes
- relatorios
- financeiro e faturamento
- logs e auditoria
- dados de integracao
- backups

## Evidencias que precisam existir

- inventario de dados e subprocessadores
- aviso de privacidade atualizado
- DPA padrao
- lista publica ou controlada de subprocessadores
- designacao do encarregado
- registros de atendimento ao titular
- RIPD quando aplicavel
- registro de incidente e tabletop
- politica de retencao e descarte
- prova de treinamento minimo do time

## O que nao fazer

- publicar politica bonita sem processo por tras
- responder titular manualmente sem registro
- aceitar fornecedor sem mapear pais e clausula contratual
- prometer conformidade sem inventario, owner e SLA
- tratar transferencia internacional como assunto apenas juridico

## Fontes oficiais

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD incidente: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD transferencia internacional: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
- ANPD RIPD: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
- ANPD fiscalizacao de encarregado/canal: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-fiscaliza-20-empresas-por-falta-de-encarregado-e-canal-de-comunicacao
