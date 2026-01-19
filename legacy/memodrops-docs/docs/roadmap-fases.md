# Roadmap de Fases MemoDrops

Este roadmap alinha o app aos 49 capítulos. Cada fase é completa: inclui backend, IA, UX, dados, segurança e observabilidade.

## Visão Geral das 7 Fases
1. **Base e Governança de IA**
   - Quotas por plano (calls/dia, PDFs/mês, tokens/request), bloqueio suave, paywall contextual.
   - Circuit breaker/fallback de modelos e cache.
   - Segurança: RBAC admin, encriptação de campos sensíveis, rate limit IA.
   - Observabilidade: logs/tracing, métricas (latência rota/worker, fila BullMQ, tokens IA, erros), alertas (fila alta, IA offline, DB lento, 5xx), auditoria de decisões da IA e custos por plano.
   - Resiliência: health/readiness, restart de workers, cache-only fallback.

2. **Conteúdo, SRS e Trilha Inteligente**
   - Conteúdo N1–N5 por banca/edital; drops básicos/avançados/turbo.
   - SRS avançado: força de memória, intervalos personalizados, atrasados/hoje/próximos, integração com erros de questões/simulados.
   - Trilha diária inteligente (Recco v2): priorização por acerto/erro, retenção SRS, proximidade da prova, carga disponível; sequenciamento fácil→médio→difícil; feedback loop da execução real.
   - Cache de trilha/SRS para velocidade.

3. **Questões e Simulados Avançados**
   - Banco com tags (disciplina/subtópico/banca/dificuldade/pegadinha/cog/emocional).
   - Simulado adaptativo em tempo real (errar 2↓, acertar 3↑), timer flexível (padrão/turbo/consciente), estilos FCC/FGV/CEBRASPE.
   - Pós-prova: mapas (erro/banca/dificuldade/tempo), reforço automático (drops+questões+mnemônico) e reordenação da trilha do dia seguinte.
   - Modos turbo/temático/banca pura/adaptativo.

4. **IA Tutor, Mnemônicos e Simplificação**
   - Tutor contextual: subtópico + erros recentes + estilo cognitivo + humor/energia; respostas curta/longa/analogia/história/mapa mental; transformar em Drop.
   - Mnemônicos inteligentes: variações por banca/estilo/humor/energia; evolução por eficácia; integração SRS/simulado; biblioteca pessoal.
   - Simplificação: métodos (1–3–1, contraste, analogia, história, mapa mental etc.) aplicados por banca e nível.

5. **Editais, Previsão de Prova e Auto-Formações**
   - Scrapers 40 bancas, OCR/extração, classificação de PDF; cache de edital.
   - Heatmap de probabilidade por banca/subtópico; previsão de prova integrada ao Recco.
   - Auto-formações: gerar módulos/trilhas/blocos/drops N1–N5 a partir do edital + personalização por aluno; versões iterativas; reconstrução dinâmica quando edital/simulado muda.

6. **Gamificação, Consistência, Desafios e Notificações**
   - XP/níveis/badges, missões diárias/semanais, clãs/rankings, avatar evolutivo; streak flexível recuperável.
   - Desafios e eventos; paywall comportamental suave.
   - Notificações inteligentes (estudo, SRS, abandono, prova, billing) com limites anti-spam; push + in-app; personalização por estilo/humor/energia.

7. **Acessibilidade, Áudio e Frontend Completo**
   - TTS/STT para drops/SRS/questões/simulados/edital; modos TDAH/dislexia/baixa visão/ansiedade; UI adaptativa por foco/energia/humor.
   - UI Kit cognitivo (indicadores de foco/energia/humor, componentes de dificuldade dinâmica); 80+ telas consolidadas.
   - Polimento de UX: estados vazios, carregamento, erros, feedback imediato.

## Como Usar Este Roadmap
- Marque cada fase como concluída somente quando backend, IA, dados, UX, segurança e observabilidade daquela fase estiverem entregues.
- Em issues/PRs, referencie a fase (“Fase 3 — Questões/Simulados”).
- Atualize o checklist abaixo conforme avançar.

## Estimativa de Progresso (beta)
Estimativas baseadas no codigo atual + backlog; nao substitui criterio de pronto.
- Fase 1: 100% (quotas/circuit breaker/monitoring ok; criptografia, budget e watchdog de workers entregues)
- Fase 2: 100% (SRS com intervalos personalizados + integracao de erros + feedback loop da trilha)
- Fase 3: 100% (questoes + simulados adaptativos + mapas + reforcos completos)
- Fase 4: 100% (tutor contextual + tutor->drop + mnemonicos com eficacia + simplify)
- Fase 5: 100% (scrapers 40 bancas + OCR/classificacao + cache + heatmap + auto-formacoes)
- Fase 6: 100% (gamificacao completa, eventos com rewards, notificacoes inteligentes agendadas)
- Fase 7: 100% (80+ telas + TTS/STT em drops/SRS/questoes/simulados/edital + modos acessibilidade + UI adaptativa + polimento de UX nos fluxos-chave)

## Checklist de Progresso (status real do codigo)
- [x] Fase 1 - Base e Governanca de IA (completo)
  - Evidencias: apps/backend/src/middleware/planLimits.ts; apps/backend/src/services/costBudgetService.ts; apps/backend/src/services/fieldEncryption.ts; apps/backend/src/services/ai/circuitBreaker.ts; apps/backend/src/services/ai/fallbackStrategies.ts; apps/backend/src/middleware/monitoring.ts; apps/backend/src/middleware/rbac.ts; apps/backend/src/services/alertService.ts; apps/backend/src/services/queueService.ts; apps/backend/src/routes/security.ts; apps/backend/src/db/migrations/0034_notification_devices_encryption.sql
  - Validacoes: script validate-phase1-3.ts (tutor->drop/admin publish, notifications log=sent)
  - Notas: backfill opcional em apps/backend/src/jobs/backfill-notification-devices.ts para tokens antigos
- [x] Fase 2 - Conteudo, SRS e Trilha Inteligente (completo)
  - Evidencias: apps/backend/src/routes/srs.ts; apps/backend/src/repositories/srsRepository.ts; apps/backend/src/services/plan/dailyPlanService.ts; apps/backend/src/routes/questions.ts; apps/backend/src/routes/simulados.ts; apps/backend/src/services/questions/questionDrop.ts
  - Validacoes: validate-phase2.ts (SRS + intervalos + plan/daily); validate-phase1-3.ts (fluxo base)

- [x] Fase 3 - Questoes e Simulados Avancados (completo)
  - Evidencias: apps/backend/src/routes/questions.ts; apps/backend/src/routes/simulados.ts; apps/backend/src/db/migrations/0006_questoes_simulados.sql
  - Validacoes: script validate-phase1-3.ts (simulado adaptativo + mapa de resultado ok)
  - Pendencias: -
- [x] Fase 4 - IA Tutor, Mnemonicos e Simplificacao (completo)
  - Evidencias: apps/backend/src/routes/tutor.ts; apps/backend/src/routes/mnemonics.ts; apps/backend/src/routes/simplify.ts; apps/web-aluno/app/(aluno)/tutor/page.tsx; apps/web-aluno/app/(aluno)/mnemonicos/page.tsx
  - Pendencias: -
- [x] Fase 5 - Editais, Previsao de Prova e Auto-Formacoes (completo)
  - Evidencias: apps/backend/config/bancas.yml; apps/backend/src/services/harvestService.ts; apps/backend/src/services/editalPdfCacheService.ts; apps/backend/src/services/editalHeatmapService.ts; apps/backend/src/services/autoFormacaoService.ts; apps/backend/src/routes/editais.ts; apps/web/app/admin/editais/relatorios/page.tsx; apps/web/app/admin/editais/[id]/page.tsx; apps/web-aluno/app/(aluno)/editais/page.tsx
  - Validacoes: apps/backend/src/jobs/validate-phase5.ts
  - Pendencias: -
- [x] Fase 6 - Gamificacao, Consistencia, Desafios e Notificacoes (completo)
  - Evidencias: apps/backend/src/routes/gamification.ts; apps/backend/src/routes/notifications.ts; apps/backend/src/services/gamificationService.ts; apps/backend/src/services/gamificationEventsService.ts; apps/backend/src/services/notificationSchedulerService.ts; apps/backend/src/services/notificationDispatchService.ts; apps/backend/src/scheduler/jobScheduler.ts; apps/web-aluno/app/(aluno)/gamificacao/page.tsx; apps/web-aluno/app/(aluno)/notificacoes/page.tsx; apps/web/app/admin/notifications/page.tsx
  - Validacoes: pendente (job engagement-sweep, /notifications/trigger)
  - Pendencias: -
- [x] Fase 7 - Acessibilidade, Audio e Frontend Completo (completo)
  - Evidencias: apps/backend/src/routes/accessibility.ts; apps/web-aluno/app/(aluno)/acessibilidade/page.tsx; apps/web-aluno/lib/tts.ts; apps/web-aluno/components/VoiceNote.tsx; apps/web-aluno/components/SRSReviewCard.tsx; apps/web-aluno/app/(aluno)/estudo/[id]/page.tsx; apps/web-aluno/app/(aluno)/questoes/page.tsx; apps/web-aluno/app/(aluno)/simulados/[id]/page.tsx; apps/web-aluno/app/(aluno)/editais/page.tsx; apps/web-aluno/app/accessibility.css; apps/web-aluno/app/cognitive.css; docs/inventario-telas.md
  - Pendencias: -
