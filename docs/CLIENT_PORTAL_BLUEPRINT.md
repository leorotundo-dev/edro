# Client Portal Blueprint

## Objetivo

Transformar o portal do cliente de um mini painel orientado a `jobs/request` em uma `Sala da Conta`, onde o cliente enxerga a relação com a agência de forma clara, autônoma e previsível.

## Estrutura atual

Hoje o portal está organizado assim:

- `Início`
- `Projetos`
- `Aprovações`
- `Solicitações`
- `Relatórios`
- `Faturas`

Principais rotas atuais no `web-cliente`:

- `/(portal)/page.tsx`
- `/(portal)/jobs/page.tsx`
- `/(portal)/jobs/[id]/page.tsx`
- `/(portal)/briefing/page.tsx`
- `/(portal)/briefing/novo/page.tsx`
- `/(portal)/aprovacoes/page.tsx`
- `/(portal)/relatorios/page.tsx`
- `/(portal)/faturas/page.tsx`

O problema estrutural é que o cliente hoje navega por objetos internos da agência:

- request de briefing
- job
- relatório
- fatura

Em vez de navegar por objetos que façam sentido para ele:

- pedido
- agenda
- aprovação
- biblioteca
- resultado
- conta

## Arquitetura alvo

### Navegação final

- `Início`
- `Pedidos`
- `Agenda`
- `Aprovações`
- `Biblioteca`
- `Resultados`
- `Conta`
- `Assistente`

### Regra de produto

O cliente não vê a máquina interna da agência. Ele vê a operação traduzida em:

- compromisso
- prazo
- próxima ação
- pendência dele
- memória da conta
- resultado percebido

## Migração

### Atual -> alvo

- `Início` -> `Início`
- `Projetos` + `Solicitações` -> `Pedidos`
- `Aprovações` -> `Aprovações`
- `Relatórios` -> `Resultados`
- `Faturas` -> `Conta`
- `Agenda` -> nasce nova
- `Biblioteca` -> nasce nova
- `Assistente` -> nasce nova

### Ordem de implementação

1. `Início`
2. `Pedidos`
3. `Agenda`
4. `Aprovações`
5. `Biblioteca`
6. `Resultados`
7. `Conta`
8. `Assistente`

## Áreas

### 1. Início

Objetivo:

- resumir a relação da conta em uma tela

Blocos:

- `Em andamento`
- `Próximas entregas`
- `Pendências suas`
- `Últimas entregas`
- `Próxima reunião`
- `Novo pedido`

### 2. Pedidos

Objetivo:

- substituir a distinção entre request e job por uma jornada única

Subtelas:

- `Lista de pedidos`
- `Novo pedido`
- `Detalhe do pedido`

Status traduzidos:

- `Enviado`
- `Em análise`
- `Aceito`
- `Em produção`
- `Aguardando aprovação`
- `Entregue`

### 3. Agenda

Objetivo:

- reunir pauta e agendador da agência

Subáreas:

- `Pauta`
- `Reuniões`

Regra:

- job usa `janela de entrega`
- reunião usa `slot real`

### 4. Aprovações

Objetivo:

- transformar aprovação em fila própria

Cada item deve mostrar:

- preview
- contexto
- prazo
- impacto do atraso
- ação clara

### 5. Biblioteca

Objetivo:

- ser a memória documental da conta

Subáreas:

- `Entregas`
- `Marca`
- `Campanhas`
- `Documentos`

### 6. Resultados

Objetivo:

- substituir a lista de relatórios por leitura executiva

Blocos:

- `Resumo do período`
- `O que performou`
- `Aprendizados`
- `Próximos movimentos`

### 7. Conta

Objetivo:

- reunir governança da relação

Blocos:

- contatos
- aprovadores
- acessos
- dados cadastrais
- faturas
- preferências

### 8. Assistente

Objetivo:

- criar a camada conversacional da conta

Perguntas esperadas:

- “o que depende de mim?”
- “qual a próxima entrega?”
- “que pedidos estão abertos?”
- “quando conseguimos entregar isso?”
- “o que foi decidido na última reunião?”

## Contratos do backend

### Reaproveitamento

Hoje já existem contratos úteis em:

- `GET /portal/client/me`
- `GET /portal/client/jobs`
- `GET /portal/client/jobs/:id`
- `POST /portal/client/jobs/:id/approve`
- `POST /portal/client/jobs/:id/revision`
- `GET /portal/client/briefings`
- `POST /portal/client/briefings/enrich`
- `POST /portal/client/briefings`
- `GET /portal/client/reports`
- `GET /portal/client/reports/:month/pdf`
- `GET /portal/client/invoices`
- `GET /portal/client/jobs/:id/artworks`
- `POST /portal/client/artworks/:id/approve`
- `POST /portal/client/artworks/:id/revision`

### Novos contratos canônicos

- `GET /portal/client/home`
- `GET /portal/client/requests`
- `POST /portal/client/requests`
- `GET /portal/client/requests/:id`
- `GET /portal/client/calendar`
- `GET /portal/client/meeting-slots`
- `POST /portal/client/meetings`
- `POST /portal/client/requests/availability`
- `GET /portal/client/approvals`
- `GET /portal/client/approvals/:id`
- `GET /portal/client/library`
- `GET /portal/client/library/:id`
- `GET /portal/client/results`
- `GET /portal/client/account`
- `GET /portal/client/account/contacts`
- `GET /portal/client/account/access`
- `POST /portal/client/assistant`

## Código de scaffolding

Este blueprint foi codificado em:

- `apps/web-cliente/lib/portalBlueprint.ts`
- `apps/web-cliente/components/portal-blueprint/PortalBlueprintWorkspace.tsx`
- `apps/web-cliente/components/portal-blueprint/PortalBlueprintIndex.tsx`

O objetivo desses arquivos é deixar a implementação pronta para Claude:

- navegação alvo
- mapa de migração
- blocos por área
- contratos esperados
- ordem de build

Claude não precisa redesenhar a arquitetura. Só precisa plugar dados, componentes e rotas reais em cima desse blueprint.
