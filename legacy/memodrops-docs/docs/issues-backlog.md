# Issues backlog (roadmap 7 fases)

Formato
- ID | Fase | Prioridade | Titulo
- Descricao
- Escopo
- Criterios de aceite
- Referencias
- Dependencias (se houver)

## P0

### MD-001 | Fase 1 | P0 | RBAC granular por modulo
Descricao: definir papeis e permissoes e aplicar guardas por rota.
Escopo:
- matriz de permissoes (admin, ops, suporte)
- middleware de autorizacao por rota
- auditoria de acesso por usuario/rota
Criterios de aceite:
- rotas admin bloqueadas para nao-admin
- auditoria registra user_id, rota, status
- testes simples de autorizacao (manual ou script)
Referencias:
- apps/backend/src/middleware/adminGuard.ts
- apps/backend/src/routes/security.ts

### MD-002 | Fase 1 | P0 | Criptografia de campos sensiveis
Descricao: aplicar criptografia real para dados sensiveis em repouso.
Escopo:
- definir campos sensiveis (tokens, dados pessoais)
- migracoes para armazenar criptografado
- key management via env/secret manager
Criterios de aceite:
- novos registros sao persistidos criptografados
- leitura retorna dados descriptografados
- rotacao de chaves documentada
Referencias:
- apps/backend/src/services/securityService.ts

### MD-003 | Fase 1 | P0 | Alertas externos e thresholds
Descricao: enviar alertas para canal externo com thresholds configuraveis.
Escopo:
- integrar Slack/PagerDuty/email
- thresholds por fila, erro 5xx, latencia
- painel basico de status
Criterios de aceite:
- alerta disparado em threshold definido
- configuracao via env
- registro de alertas no backend
Referencias:
- apps/backend/src/middleware/monitoring.ts
- apps/backend/src/routes/monitoring.ts

### MD-004 | Fase 1 | P0 | Resiliencia de workers
Descricao: garantir health/readiness real e restart de workers.
Escopo:
- health check de filas e workers
- politicas de retry e backoff
- restart automatico em falha
Criterios de aceite:
- health indica degraded/unhealthy corretamente
- worker reinicia apos falha simulada
- backlog nao cresce indefinidamente em erro
Referencias:
- apps/backend/src/services/queueService.ts
- apps/backend/src/routes/queues.ts

### MD-005 | Fase 5 | P0 | Scrapers 40 bancas + validacao
Descricao: ampliar fontes e garantir pipeline estavel de editais.
Escopo:
- subir para ~40 bancas/presets
- testes por banca (smoke)
- validar OCR/PDF e reprocessamento
Criterios de aceite:
- catalogo com ~40 fontes ativas
- taxa de sucesso >= 80% em smoke
- reprocessamento funcional via API
Referencias:
- apps/backend/src/services/harvestService.ts
- apps/scrapers

### MD-006 | Fase 7 | P0 | Inventario de telas e UI kit
Descricao: mapear telas existentes e consolidar componentes UI.
Escopo:
- lista unica de telas (admin + aluno)
- mapear componentes em packages/ui
- gaps para 80+ telas
Criterios de aceite:
- inventario com status por tela
- lista de componentes base e uso
- plano de fechamento de gaps
Referencias:
- apps/web/app
- apps/web-aluno/app
- packages/ui

## P1

### MD-007 | Fase 2 | P1 | Integracao SRS com erros
Descricao: usar erros de questoes/simulados para alimentar SRS e trilha.
Escopo:
- sinalizar erros e criar revisoes SRS
- atualizar backlog e prioridades
- registrar impacto em metricas
Criterios de aceite:
- erro em simulado cria item SRS
- trilha do dia incorpora temas fracos
- metricas refletem ajuste
Referencias:
- apps/backend/src/routes/simulados.ts
- apps/backend/src/routes/srs.ts
- apps/backend/src/services/reccoEngine/reinforcementEngine.ts

### MD-008 | Fase 3 | P1 | Similaridade de questoes
Descricao: recomendar questoes semelhantes via embedding/pgvector.
Escopo:
- gerar embeddings de questoes
- busca por similaridade
- endpoint de recomendacao
Criterios de aceite:
- retorno de top N questoes similares
- performance aceitavel em 1k+ questoes
- fallback simples se embeddings indisponiveis
Referencias:
- apps/backend/src/repositories/questionRepository.ts
- apps/backend/src/services/ai/fallbackStrategies.ts

### MD-009 | Fase 4 | P1 | Tutor -> Drop
Descricao: converter respostas do tutor em drop com aprovacao admin.
Escopo:
- endpoint para gerar drop a partir do tutor
- flag de revisao/aprovacao
- log de origem e metadados
Criterios de aceite:
- drop criado com status "draft"
- admin aprova e publica
- auditoria indica origem "tutor"
Referencias:
- apps/backend/src/routes/tutor.ts
- apps/backend/src/routes/drops.ts

### MD-010 | Fase 5 | P1 | Auto-formacoes dinamicas
Descricao: gerar modulos/trilhas/drops N1-N5 a partir do edital.
Escopo:
- pipeline de extracao -> blueprint -> drops
- reprocessamento quando edital muda
- versoes iterativas
Criterios de aceite:
- auto-formacao gerada para edital novo
- reprocessamento atualiza trilha
- historico de versoes salvo
Referencias:
- apps/backend/src/scheduler/jobScheduler.ts
- apps/backend/src/services/harvestService.ts

### MD-011 | Fase 6 | P1 | Gamificacao expandida
Descricao: missoes, clans e ranking.
Escopo:
- missoes diarias/semanais
- clans e ranking basico
- streak recuperavel
Criterios de aceite:
- missoes com progresso por usuario
- ranking visivel por periodo
- streak recuperado com regra clara
Referencias:
- apps/backend/src/routes/gamification.ts

### MD-012 | Fase 6 | P1 | Notificacoes inteligentes
Descricao: regras por comportamento e limites anti-spam.
Escopo:
- regras por abandono, SRS, prova, billing
- rate limit por usuario
- push + in-app
Criterios de aceite:
- notificacoes respeitam limites
- regras configuraveis por env
- logs de envio salvos
Referencias:
- apps/backend/src/routes/notifications.ts

### MD-013 | Fase 7 | P1 | Acessibilidade aplicada nas telas
Descricao: aplicar preferencias de acessibilidade nas telas-chave.
Escopo:
- fonte, contraste, motion
- TTS/STT em estudo e revisao
- persistencia de preferencias
Criterios de aceite:
- toggles alteram UI real
- TTS/STT funcional em fluxo de estudo
- preferencias persistem por usuario
Referencias:
- apps/backend/src/routes/accessibility.ts
- apps/web-aluno/app/(aluno)/acessibilidade/page.tsx

### MD-017 | Fase 7 | P1 | Mobile MVP (beta)
Descricao: app mobile minimo para beta (onboarding, login, dashboard).
Escopo:
- inicializar Expo em apps/mobile
- onboarding simples
- login com API
- dashboard basico com resumo
Criterios de aceite:
- build local do app
- login funcional com API do backend
- dashboard renderiza dados basicos
Referencias:
- apps/mobile/README.md

## P2

### MD-014 | Fase 1 | P2 | Custos por plano e budget
Descricao: custos detalhados por plano com alertas.
Escopo:
- custo por plano e por usuario
- budget mensal e alertas
Criterios de aceite:
- relatorio por plano disponivel
- alerta disparado ao ultrapassar budget
Referencias:
- apps/backend/src/routes/admin-costs-real.ts
- apps/backend/src/routes/admin-payments.ts

### MD-015 | Fase 3 | P2 | Polimento das analises de simulados
Descricao: calibrar score, mapas e explicacoes.
Escopo:
- revisar calculo de score/grade
- melhorar mapas por banca/dificuldade/tempo
Criterios de aceite:
- score consistente com acertos
- mapas exibem dados coerentes
Referencias:
- apps/backend/src/services/simulados/analysisEngine.ts

### MD-016 | Fase 7 | P2 | Polimento geral de UX
Descricao: estados vazios, erros e loading consistentes.
Escopo:
- padronizar empty/error/loading
- microcopy consistente
Criterios de aceite:
- telas principais com estados padrao
- nenhuma tela sem fallback visual
Referencias:
- apps/web/app
- apps/web-aluno/app
