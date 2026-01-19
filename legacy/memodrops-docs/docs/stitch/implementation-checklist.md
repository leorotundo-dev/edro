MEMODROPS - Stitch Implementation Checklist (By Screen)

Legend
- [x] done
- [ ] pending
- [~] partial

Note
This list tracks Stitch UI adoption + data wiring + states for each route.
Auto scan: statuses for "Stitch UI applied" are auto-marked by token heuristic (text-text-main, bg-surface-light, shadow-soft, font-title, etc.).

---

Landing / Auth / Onboarding

/ (landing)
- [x] Stitch UI applied (palette updated)
- [ ] States: loading/error (if any dynamic data)

/login
- [x] UI updated (new inputs)
- [x] Data: POST /api/auth/login
- [ ] States: error/empty/disabled

/register
- [x] UI updated (new inputs)
- [x] Data: POST /api/auth/register
- [ ] States: error/empty/disabled

/onboarding
- [x] Stitch UI applied (onboarding_welcome_1/2)
- [ ] Data: optional tracking events
- [ ] States

/onboarding/objetivos
- [x] Stitch UI applied
- [ ] Data: tracking events
- [ ] States

/onboarding/tempo
- [x] UI updated (inputs)
- [ ] Data: tracking events
- [ ] States

/onboarding/perfil
- [x] UI updated (inputs)
- [x] Data: PATCH /api/auth/me (if save)
- [ ] States

/onboarding/diagnostico
- [x] Stitch UI applied
- [ ] Data: GET /api/recco/diagnosis or tracking
- [ ] States

/onboarding/confirmacao
- [x] Stitch UI applied
- [ ] Data: editais/plano summary
- [ ] States

---

Core Study Flow

/dashboard
- [x] Stitch UI applied (today_dashboard variants)
- [~] Data: plan + progress summary
- [ ] States

/novo-estudo
- [x] Stitch UI applied (create_new_study)
- [x] Data: POST /api/sources, /api/sources/presign, /api/sources/complete, POST /api/study-requests
- [x] Data: GET /api/jobs/:id
- [ ] States

/estudar
- [x] Stitch UI applied (daily_study_sequence)
- [x] Data: GET /api/plan/today, POST /api/plan/item/start
- [x] States: loading/error/job progress

/estudo/[id]
- [x] Stitch UI applied (study_content_detail)
- [~] Data: GET /api/drops/:id, GET /api/drops/:id/aids
- [~] Data: GET /api/mnemonics/recommend/:topic, POST /api/learn/log, POST /api/srs/enroll
- [ ] States

/questoes
- [x] Stitch UI applied (practice_question)
- [~] Data: GET /api/questions (filters)
- [~] Data: POST /api/plan/item/complete (answer)
- [ ] States

/revisao
- [x] Stitch UI applied (pending_reviews_list)
- [x] Data: GET /api/srs/today, POST /api/srs/review
- [ ] States

/plano-diario
- [x] Stitch UI applied (plan_daily)
- [~] Data: GET /api/plan/today
- [ ] States

---

Editais / Plano Macro / Materias

/editais
- [x] Stitch UI applied (exam_board_list)
- [x] Data: GET /api/editais, GET /api/editais/interesses
- [x] Data: POST/PATCH/DELETE /api/editais/:id/interesse
- [~] Data: GET /api/editais/:id/auto-formacoes
- [ ] States

/plano-macro
- [x] Stitch UI applied (macro_study_calendar variants)
- [x] Data: GET /api/editais/:id/plano-macro
- [~] Data: POST /api/plan/adjust (if used)
- [ ] States

/materias
- [x] Stitch UI applied (subject_map_overview)
- [x] Data: GET /api/editais/:id/materias/progresso
- [ ] Data: peso por banca (needs source)
- [ ] States

---

Historico / Progresso

/historico
- [x] Stitch UI applied (study_history_timeline)
- [~] Data: GET /api/progress/history
- [ ] States

/historico/erros
- [x] Stitch UI applied (detailed_error_review)
- [x] Data: GET /api/mastery/weak
- [x] States: loading/error/empty

/historico/revisoes
- [x] Stitch UI applied
- [x] Data: GET /api/srs/reviews
- [ ] States

/historico/simulados
- [x] Stitch UI applied
- [~] Data: GET /api/users/:id/simulados/results
- [ ] States

/progresso
- [x] Stitch UI applied (progress_statistics variants)
- [x] Data: GET /api/progress/summary
- [ ] States

---

Biblioteca

/biblioteca
- [x] Stitch UI applied (library_hub)
- [ ] Data: links only

/biblioteca/drops
- [x] Stitch UI applied (subject_library variants)
- [x] Data: GET /api/drops (user)
- [ ] States

/biblioteca/questoes
- [x] Stitch UI applied
- [x] Data: GET /api/questions (user)
- [ ] States

/biblioteca/colecoes
- [x] Stitch UI applied
- [ ] Data: collections endpoints (GAP)

---

Gamificacao

/gamificacao
- [x] Stitch UI applied (gamification_hub)
- [x] Data: GET /api/gamification/profile
- [ ] States

/gamificacao/missoes
- [x] Stitch UI applied
- [x] Data: GET /api/gamification/missions
- [ ] States

/gamificacao/rankings
- [x] Stitch UI applied
- [x] Data: GET /api/gamification/leaderboard
- [ ] States

/gamificacao/clans
- [x] Stitch UI applied
- [x] Data: GET /api/gamification/clans
- [ ] States

/gamificacao/eventos
- [x] Stitch UI applied
- [x] Data: GET /api/gamification/events
- [ ] States

---

Mnemonicos / Tutor / Notificacoes

/mnemonicos
- [x] Stitch UI applied (mnemonic_collection variants)
- [~] Data: GET /api/mnemonics (user), /recommend/:topic
- [ ] States

/tutor
- [x] Stitch UI applied
- [x] Data: POST /api/tutor/to-drop
- [ ] States

/notificacoes
- [x] Stitch UI applied
- [ ] Data: user feed endpoint (GAP)

---

Perfil / Configuracoes / Suporte / Acessibilidade

/perfil
- [x] Stitch UI applied (full_user_profile variants)
- [x] Data: GET/PATCH /api/auth/me
- [ ] States

/configuracoes
- [x] Stitch UI applied
- [ ] Data: links only

/configuracoes/conta
- [x] Stitch UI applied
- [x] Data: GET/PATCH /api/auth/me
- [ ] States

/configuracoes/seguranca
- [x] Stitch UI applied
- [ ] Data: security endpoints (needs wiring)

/configuracoes/planos
- [x] Stitch UI applied
- [x] Data: GET /api/billing/packages, GET /api/usage
- [ ] States

/configuracoes/assinatura
- [x] Stitch UI applied
- [ ] Data: billing subscription endpoint (GAP)

/configuracoes/metodo-pagamento
- [x] Stitch UI applied
- [ ] Data: payment methods endpoint (GAP)

/configuracoes/faturamento
- [x] Stitch UI applied
- [ ] Data: billing history endpoint (GAP)

/configuracoes/notificacoes
- [x] Stitch UI applied
- [ ] Data: notification preferences endpoint (GAP)

/suporte
- [x] Stitch UI applied
- [ ] Data: links only

/suporte/faq
- [x] Stitch UI applied
- [ ] Data: static

/suporte/tickets
- [x] Stitch UI applied
- [ ] Data: tickets endpoint (GAP)

/acessibilidade
- [x] Stitch UI applied
- [x] Data: GET/POST /api/accessibility/settings, GET /api/accessibility/modes
- [ ] States

---

Admin (memodrops-web)

Admin Dashboard
- [x] Stitch UI applied
- [x] Data: GET /api/admin/dashboard/summary, /admin/metrics/overview

Admin Editais
- [ ] UI applied
- [~] Data: /api/editais + /api/admin/editais/:id/questoes/completar

Admin Drops
- [ ] UI applied
- [x] Data: GET /api/admin/drops, PATCH /api/admin/drops/:id/status

Admin Questoes
- [ ] UI applied
- [x] Data: GET /api/admin/questions/stats

Admin Gamificacao
- [ ] UI applied
- [x] Data: /api/admin/gamification/*

Admin Notificacoes
- [ ] UI applied
- [x] Data: /api/admin/notifications/logs

Admin Jobs/Queues
- [ ] UI applied
- [x] Data: /api/admin/jobs, /api/admin/queues/*

Admin Observabilidade
- [ ] UI applied
- [x] Data: /api/admin/apm/dashboard, /api/admin/performance/metrics

Admin Billing/Costs
- [ ] UI applied
- [x] Data: /api/admin/costs/real/overview, /api/admin/payments/overview
