# Plano Mobile MemoDrops (Diretriz)

Este documento consolida o plano acordado para o app mobile, com foco em praticidade,
conteudo pronto e entrega automatica.

## Objetivo
- App mobile ultra pratico: o aluno diz o que quer estudar (voz ou texto).
- O sistema prepara tudo em background com fontes reais da web.
- Conteudo de leitura primeiro; questoes so depois (opcional).
- Atende desde ensino basico ate certificacoes profissionais.

## Principios
- Uma acao principal por tela.
- Leitura primeiro, questoes opcionais.
- Voz on-device (STT) e TTS on-device.
- Perguntas do app so quando necessario (max 1-3).
- Conteudo baseado em fontes reais e rastreaveis.

## Fluxo Mobile (resumo)
1) Home: "O que voce quer estudar hoje?"
2) Confirmacao da transcricao (se voz)
3) Preparando estudo (background)
4) Leitura pronta (drop inicial)
5) CTA leve: "Quer testar com questoes?"
6) Questao a questao (opcional)

## Plano de Execucao

### Fase 0 - Decisoes essenciais
- Stack mobile (RN + Expo recomendado).
- Motor de busca real (Bing/SerpAPI/Google CSE).
- Politica de midia (imagens e videos com fonte/licenca).
- Regra fixa: leitura primeiro, questoes opcionais.

### Fase 1 - Core Mobile + Voz
- Tela unica de entrada (texto + microfone).
- STT/TTS on-device.
- Endpoint: POST /study-requests.
- Job: build_study_pack (background).
- "Edital custom" automatico para tema livre.

DoD:
- Tema livre gera leitura automaticamente.
- Questao so aparece se o usuario quiser.

### Fase 2 - Conteudo real (web + IA)
- ChatGPT interpreta tema e gera queries.
- Harvest busca fontes reais e extrai texto.
- IA gera drops apenas com base nas fontes coletadas.
- Salvar fontes por drop.

DoD:
- Cada drop mostra origem/fonte.
- Falta de fontes gera aviso (sem inventar).

### Fase 3 - Multimidia (texto, imagem, video)
- Drops em blocos: text | image | video | callout.
- Imagens: fontes educacionais/CC.
- Videos: YouTube/Vimeo (lazy load).
- Modo economia de dados (opcional).

DoD:
- Drop suporta texto + imagem + video.

### Fase 4 - Concurso/Certificacao
- Detectar concurso e buscar edital oficial.
- Extrair disciplinas/pesos.
- Gerar trilha automatica por edital.
- Perguntas do app somente se faltarem dados criticos.

DoD:
- Leitura pronta sem friccao.
- Questao alinhada ao edital.

### Fase 5 - Produto rentavel
- Free: 1 tema/edital + limites basicos.
- Pro: multiplos temas, voz, multimidia, historico.
- Premium: pacotes por concurso/certificacao.
- Paywall contextual e suave.

DoD:
- Conversao sem quebrar experiencia.

### Fase 6 - Qualidade e escala
- Logs de custo IA por usuario.
- Metricas de geracao/consumo.
- Cache de conteudo para reduzir custo.
- Observabilidade e alertas.

DoD:
- Sistema estavel, custos controlados.

## Reuso do que ja existe
- Harvest + auto-formacoes.
- Geracao de drops e questoes.
- Jobs/queues.
- UI de questoes no app do aluno.

## Regra final
- O app entrega leitura pronta primeiro.
- Questao aparece apenas se o aluno quiser.

