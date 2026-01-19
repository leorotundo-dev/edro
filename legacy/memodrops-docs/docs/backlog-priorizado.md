# Backlog priorizado (roadmap 7 fases)

Legenda
- P0: bloqueia producao ou cumprimento minimo da fase
- P1: importante para MVP beta
- P2: qualidade e polimento

## P0
- F1 - RBAC granular e permissoes por modulo
  - refs: apps/backend/src/middleware/adminGuard.ts; apps/backend/src/routes/security.ts
  - entrega: matriz de permissoes (admin, ops, suporte); guard por rota; auditoria de acesso
- F1 - Criptografia real de campos sensiveis
  - refs: apps/backend/src/services/securityService.ts
  - entrega: definir campos sensiveis (ex.: tokens, dados pessoais), migracoes e key management
- F1 - Observabilidade com alertas externos
  - refs: apps/backend/src/middleware/monitoring.ts; apps/backend/src/routes/monitoring.ts
  - entrega: envio de alertas (Slack/PagerDuty/email), thresholds configuraveis, dashboards basicos
- F1 - Resiliencia de workers
  - refs: apps/backend/src/services/queueService.ts; apps/backend/src/routes/queues.ts
  - entrega: restart automatico, health/readiness real, politicas de retry
- F5 - Scrapers 40 bancas + pipeline
  - refs: apps/backend/src/services/harvestService.ts (BANCA_PRESETS); apps/scrapers
  - entrega: ampliar fontes (hoje ~13 presets), validar OCR/PDF, rotas de reprocessamento estaveis
- F7 - Inventario de telas e UI kit consolidado
  - refs: apps/web/app; apps/web-aluno/app; packages/ui
  - entrega: lista unica de telas (target 80+), mapeamento de componentes, gap analysis

## P1
- F2 - Integracao SRS + erros de questoes/simulados
  - refs: apps/backend/src/routes/srs.ts; apps/backend/src/routes/simulados.ts; apps/backend/src/services/reccoEngine/reinforcementEngine.ts
  - entrega: sinais de erro alimentando backlog SRS e ajustes de trilha
- F3 - Similaridade de questoes
  - refs: apps/backend/src/repositories/questionRepository.ts; apps/backend/src/services/ai/fallbackStrategies.ts
  - entrega: busca por questoes similares via embedding/pgvector
- F4 - Fluxo "transformar em Drop" no tutor
  - refs: apps/backend/src/routes/tutor.ts; apps/backend/src/routes/drops.ts
  - entrega: endpoint para converter resposta do tutor em drop + aprovacao admin
- F5 - Auto-formacoes dinamicas
  - refs: apps/backend/src/scheduler/jobScheduler.ts; apps/backend/src/services/harvestService.ts
  - entrega: gerar modulos/trilhas/drops N1-N5 a partir de edital, com reprocessamento automatico
- F6 - Gamificacao completa
  - refs: apps/backend/src/routes/gamification.ts
  - entrega: missoes semanais, desafios/eventos, clans/ranking, streak recuperavel
- F6 - Notificacoes inteligentes
  - refs: apps/backend/src/routes/notifications.ts
  - entrega: regras por comportamento, limites anti-spam, push + in-app
- F7 - Acessibilidade aplicada nas telas
  - refs: apps/backend/src/routes/accessibility.ts; apps/web-aluno/app/(aluno)/acessibilidade/page.tsx
  - entrega: toggles reais de fonte/contraste/motion; TTS/STT integrado em estudo/revisao
- F7 - Mobile MVP (beta)
  - refs: apps/mobile/README.md
  - entrega: onboarding, login, dashboard basico

## P2
- F1 - Auditoria de custos por plano integrada ao billing
  - refs: apps/backend/src/routes/admin-costs-real.ts; apps/backend/src/routes/admin-payments.ts
  - entrega: custos por plano e alertas por budget
- F3 - Polimento de analises e mapas de simulados
  - refs: apps/backend/src/services/simulados/analysisEngine.ts
  - entrega: calibracao de score, explicacoes e comparativos
- F7 - Polimento de UX (estados vazios, erros, loading)
  - refs: apps/web/app; apps/web-aluno/app
  - entrega: padrao visual e microcopy consistente
