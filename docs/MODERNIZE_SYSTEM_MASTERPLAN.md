# Modernize System Master Plan

## Objetivo
Parar de desenhar telas do `EdroDigital` como soluções isoladas e passar a encaixar cada domínio em um arquétipo canônico do `Modernize`.

Regra:
- primeiro escolhemos o arquétipo
- depois aplicamos a lógica da Edro
- só fica custom o que for produto proprietário

## Arquétipos canônicos

### `AI / Chat`
Uso:
- `Jarvis`

Base:
- conversa principal
- histórico lateral
- prompts iniciais
- composer fixo

Status:
- `in_progress`

### `AI / Image`
Uso:
- `Studio imagem`
- geradores visuais e iterações de prompt

Status:
- `planned`

### `Blog / Posts`
Uso:
- `Clipping`
- `Social Listening`

Base:
- feed central
- cards editoriais legíveis
- filtros no topo
- detalhe separado

Status:
- `in_progress`

### `Blog / Detail`
Uso:
- `Clipping detail`
- `detalhe de menção/post`

Status:
- `ready`

### `Blog / Manage`
Uso:
- `Fontes`
- `Ingestão`
- `Keywords`
- `gestão editorial do radar`

Status:
- `in_progress`

### `Contacts / Users`
Uso:
- `Pessoas`
- `Users`
- `Equipe`
- `Contatos`

Base:
- diretório
- cards de pessoa
- filtros
- rail ou detalhe
- ações de merge/edição

Status:
- `planned`

### `Users / Profile`
Uso:
- `Identidade do cliente`
- `Minha área`

Base:
- header forte
- subworkspaces
- perfil/dna/editorial/ativos

Status:
- `in_progress`

### `Integration`
Uso:
- `Admin > Integrações`
- `Cliente > Conectores`

Base:
- catálogo de providers
- status conectado/desconectado
- saúde
- CTA de conectar/testar/remover

Status:
- `in_progress`

### `Role Base Access`
Uso:
- `Cliente > Permissões`
- qualquer página de acesso por papel

Status:
- `in_progress`

### `Invoice`
Uso:
- `Financeiro`
- `Pagamentos`
- visões econômicas e faturamento

Status:
- `planned`

### `Calendar`
Uso:
- `Reuniões`
- `Calendário`
- partes de `Semana`

Status:
- `planned`

### `Reports`
Uso:
- `Relatórios`
- `Qualidade`
- dashboards analíticos

Status:
- `planned`

### `Form Wizard`
Uso:
- `Novo cliente`
- onboardings
- fluxos multi-etapa

Status:
- `planned`

### `Kanban`
Uso:
- `/board`
- `Fila > Quadro`

Regra:
- `Kanban` é visão secundária de fluxo
- não é o modelo-base da `Central de Operações`

Status:
- `planned`

## O que continua custom

### `Central de Operações`
Motivo:
- é cockpit proprietário da agência

Regra:
- custom por produto
- herda gramática do Modernize para grid, cards, spacing, filtros e rails

### `Studio`
Motivo:
- ferramenta proprietária

### `Radar Mercado / Dark Funnel / Inteligência`
Motivo:
- leitura específica da Edro

## Mapa por família

### IA
- `apps/web/app/jarvis` -> `AI / Chat`
- `apps/web/app/studio/editor` -> `AI / Image`

### Conteúdo e escuta
- `apps/web/app/clipping` -> `Blog / Posts`
- `apps/web/app/clipping/[id]` -> `Blog / Detail`
- `apps/web/app/social-listening` -> `Blog / Posts + Reports`
- `apps/web/app/clients/[id]/radar` -> container próprio, com `Clipping` e `Social` obedecendo o arquétipo `Blog`

### Pessoas
- `apps/web/app/admin/pessoas` -> `Contacts / Users`
- `apps/web/app/admin/users` -> `Contacts / Users`
- `apps/web/app/admin/equipe` -> `Contacts / Users`
- `apps/web/app/contatos` -> `Contacts`

### Cliente
- `apps/web/app/clients/[id]/identidade` -> `Users / Profile`
- `apps/web/app/clients/[id]/connectors` -> `Integration`
- `apps/web/app/clients/[id]/permissions` -> `Role Base Access`
- `apps/web/app/clients/[id]/library` -> `Files / Library-style workspace`

### Backoffice
- `apps/web/app/admin/integrations` -> `Integration`
- `apps/web/app/admin/financeiro` -> `Invoice`
- `apps/web/app/admin/pagamentos` -> `Invoice`
- `apps/web/app/admin/reunioes` -> `Calendar`
- `apps/web/app/calendar` -> `Calendar`
- `apps/web/app/admin/relatorios` -> `Reports`

### Operação
- `apps/web/app/admin/operacoes` -> `custom cockpit`
- `apps/web/app/admin/operacoes/jobs` -> `Lista` principal + `Kanban` secundário
- `apps/web/app/admin/operacoes/semana` -> `Calendar` adaptado
- `apps/web/app/admin/operacoes/qualidade` -> `Reports`

## Ordem de execução
1. `Integrações + Conectores + Permissões`
2. `Clipping + Social Listening`
3. `Jarvis + Studio Image`
4. `Pessoas / Users / Equipe / Contatos`
5. `Identidade do cliente`
6. `Financeiro + Relatórios + Reuniões`
7. `Operação` com acabamento final de gramática e modos

## O que já entrou
- `Identidade > Configurações` com `Conectores + Permissões`
- `Admin > Integrações` com catálogo principal
- `Clipping` dividido entre `Feed` e `Fontes`
- `Social Listening` dividido entre `Feed`, `Insights` e `Monitoramento`
- `Jarvis` full page alinhado ao workspace de `AI / Chat`

## Critério de aceite
Uma refatoração só está concluída quando:
- a rota passa a obedecer um arquétipo claro
- o centro da tela responde ao propósito certo
- gestão/configuração sai do meio do fluxo principal
- a navegação fica previsível
- a linguagem visual conversa com o restante do sistema
