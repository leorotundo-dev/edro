# MemoDrops — Camadas Lógicas (Etapa 14)

Esta etapa não adiciona código novo crítico, mas consolida a visão
das camadas principais do sistema MemoDrops, servindo como ponte entre
a modelagem conceitual e as implementações das etapas seguintes.

## Camadas Principais

1. Harvest
   - Coleta de fontes (editais, sites de estudo, PDFs).
   - Uso dos adaptadores de harvest (Etapa 7).
   - Saída principal: itens brutos a serem processados (harvest_items).

2. Extractor (Blueprint)
   - Interpretação dos materiais e geração de uma "árvore" de disciplinas,
     tópicos e sub-tópicos (blueprint).
   - Usa IA para extrair e estruturar o conteúdo.

3. Drop Generator
   - Gera microlições ("drops") a partir de cada tópico da blueprint.
   - Gera diferentes tipos de drops (explicação, questão, flashcard etc.).
   - Usa cache (Etapa 13) para não repetir processamento.

4. RAG (Retrieval-Augmented Generation)
   - Usa `rag_blocks` para trazer contexto externo.
   - Alimentado pelo RAG Feeder (Etapa 20).
   - Integrado futuramente em pipelines de geração/adaptação.

5. QA (Qualidade)
   - Registra revisões humanas ou automáticas sobre drops.
   - Guarda decisões: aprovado, rejeitado, precisa revisão.

6. Personalização
   - Usa `user_stats`, `learn_log`, dificuldades, streak, etc.
   - Gera planos diários personalizados (Etapa 21).
   - Calcula espaçamento de revisão (Etapa 22).

7. UX / Apps
   - Backend HTTP (Fastify).
   - Web app (Next.js) para operadores e alunos.
   - Rotas admin e rotas de consumo da API.

## Objetivo da Etapa 14

- Garantir que backend, IA e banco estejam alinhados com essas camadas.
- Servir de referência para:
  - Onde cada serviço deve ficar.
  - Como novas features devem ser encaixadas.
  - Manter o projeto organizado à medida que cresce.

Na prática, esta etapa se materializa neste documento e em possíveis
ajustes de pastas e nomes de arquivos, mas não introduz novas
dependências obrigatórias.
