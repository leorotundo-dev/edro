MEMODROPS - Stitch Flow + Backend Map

Goal
Map the Stitch UI pages to a single user journey and show where data comes from in the current backend.

---

Flow (Mermaid)

```mermaid
flowchart TD
  A[Landing /] --> B[Auth: /login or /register]
  A --> Z[Admin Web (memodrops-web)]
  B --> C[Onboarding: /onboarding]
  C --> C1[/onboarding/objetivos]
  C1 --> C2[/onboarding/tempo]
  C2 --> C3[/onboarding/perfil]
  C3 --> C4[/onboarding/diagnostico]
  C4 --> C5[/onboarding/confirmacao]
  C5 --> D[Dashboard: /dashboard]
  D --> E[New Study: /novo-estudo]
  D --> F[Editais: /editais]
  F --> F1[Auto Formacao + Jobs]
  F1 --> G[Plano Macro: /plano-macro]
  F1 --> H[Materias: /materias]
  D --> I[Estudar: /estudar]
  I --> J[Conteudo: /estudo/[id]]
  J --> K[Questoes: /questoes]
  K --> L[Resumo do dia / Progresso]
  L --> I
  D --> M[Revisao: /revisao]
  D --> N[Historico: /historico]
  N --> N1[/historico/erros]
  N --> N2[/historico/revisoes]
  N --> N3[/historico/simulados]
  D --> O[Progresso: /progresso]
  D --> P[Gamificacao: /gamificacao]
  P --> P1[/gamificacao/missoes]
  P --> P2[/gamificacao/rankings]
  P --> P3[/gamificacao/clans]
  P --> P4[/gamificacao/eventos]
  D --> Q[Biblioteca: /biblioteca]
  Q --> Q1[/biblioteca/drops]
  Q --> Q2[/biblioteca/questoes]
  Q --> Q3[/biblioteca/colecoes]
  D --> R[Mnemonicos: /mnemonicos]
  D --> S[Tutor: /tutor]
  D --> T[Notificacoes: /notificacoes]
  D --> U[Perfil: /perfil]
  U --> V[Configuracoes: /configuracoes]
  V --> V1[/configuracoes/conta]
  V --> V2[/configuracoes/seguranca]
  V --> V3[/configuracoes/planos]
  V --> V4[/configuracoes/assinatura]
  V --> V5[/configuracoes/metodo-pagamento]
  V --> V6[/configuracoes/faturamento]
  V --> V7[/configuracoes/notificacoes]
  D --> W[Suporte: /suporte]
  W --> W1[/suporte/faq]
  W --> W2[/suporte/tickets]
  D --> X[Acessibilidade: /acessibilidade]
  Z --> Z1[Admin Dashboard]
  Z1 --> Z2[Admin Editais]
  Z1 --> Z3[Admin Drops]
  Z1 --> Z4[Admin Questoes]
  Z1 --> Z5[Admin Gamificacao]
  Z1 --> Z6[Admin Notificacoes]
  Z1 --> Z7[Admin Jobs/Queues]
  Z1 --> Z8[Admin Observabilidade]
  Z1 --> Z9[Admin Billing/Costs]
```

---

Backend Map (current)

Legend:
- OK = endpoint exists today
- GAP = backend not available or not wired
- PARTIAL = exists but needs extra data or link

Core journey
- Auth
  - /login, /register
  - OK: POST /api/auth/login, /api/auth/register, GET/PATCH /api/auth/me
- Onboarding (profile + time + goals)
  - PARTIAL: mostly client state. Can log with /api/tracking/event.
- New Study (input text, link, file, voice)
  - OK: POST /api/sources (text/link/youtube)
  - OK: POST /api/sources/presign + POST /api/sources/complete (upload)
  - OK: POST /api/study-requests (topic)
  - OK: GET /api/jobs/:id (progress)
- Editais + Auto Formacao
  - OK: GET /api/editais
  - OK: GET/POST/PATCH /api/editais/:id/interesse
  - OK: GET /api/editais/:id/auto-formacoes
  - OK: POST /api/editais/:id/drops/gerar
  - OK: POST /api/editais/:id/questoes/gerar
  - OK: GET /api/editais/:id/jobs/latest
- Plano Macro
  - OK: GET /api/editais/:id/plano-macro
  - PARTIAL: POST /api/plan/adjust (depends on UI wiring)
- Materias (mapa + progresso por topico)
  - OK: GET /api/editais/:id/materias/progresso
  - PARTIAL: peso por banca (needs data source per edital)
- Estudar (plano diario)
  - OK: GET /api/plan/today
  - OK: POST /api/plan/generate
  - OK: POST /api/plan/item/start
  - OK: POST /api/plan/item/complete
  - OK: POST /api/tracking/session/start + /end
- Conteudo (estudo)
  - OK: GET /api/drops/:id
  - OK: GET /api/drops/:id/aids
  - OK: GET /api/mnemonics/recommend/:topic
  - OK: POST /api/learn/log
  - OK: POST /api/srs/enroll
- Questoes
  - OK: GET /api/questions (filters)
  - PARTIAL: question session/flow per trilha (use plan item + question list)
  - OK: POST /api/plan/item/complete (mark result)
- Revisao (SRS)
  - OK: GET /api/srs/today
  - OK: POST /api/srs/review
  - OK: GET /api/srs/queue
- Progresso / Historico
  - OK: GET /api/progress/summary
  - OK: GET /api/progress/daily | weekly | monthly | history
  - OK: GET /api/mastery/weak (erros)
  - OK: GET /api/srs/reviews (historico revisoes)
  - OK: GET /api/users/:id/simulados/results

Gamificacao
- OK: GET /api/gamification/profile
- OK: GET /api/gamification/missions
- OK: GET /api/gamification/events + join
- OK: GET /api/gamification/clans + join/leave
- OK: GET /api/gamification/leaderboard + clans/leaderboard

Biblioteca
- OK: GET /api/drops (user drops)
- OK: GET /api/questions (user questions)
- GAP: colecoes (no /collections route today)

Mnemonicos
- OK: GET /api/mnemonics
- OK: GET /api/mnemonics/recommend/:topic
- OK: POST /api/mnemonics/generate

Tutor
- OK: POST /api/tutor/to-drop
- PARTIAL: chat history (needs endpoints if persistent)

Notificacoes
- GAP: user feed endpoint (only /api/notifications/preview + /send exist)

Acessibilidade
- OK: GET/POST /api/accessibility/settings
- OK: GET /api/accessibility/modes
- OK: POST /api/accessibility/tts | /stt

Billing / Planos
- OK: GET /api/billing/packages
- OK: POST /api/billing/checkout + verify
- OK: GET /api/usage

Admin / Backoffice (memodrops-web)
- Admin Dashboard
  - OK: GET /api/admin/dashboard/summary
  - OK: GET /api/admin/metrics/overview
  - OK: GET /api/admin/metrics/daily
- Admin Editais (moderacao)
  - PARTIAL: POST /api/admin/editais/:id/questoes/completar
  - OK: GET /api/admin/debug/blueprints
- Admin Drops
  - OK: GET /api/admin/drops
  - OK: GET /api/admin/drops/:id
  - OK: PATCH /api/admin/drops/:id/status
- Admin Questoes
  - OK: GET /api/admin/questions/stats
- Admin Gamificacao
  - OK: GET /api/admin/gamification/overview
  - OK: GET/POST/PATCH /api/admin/gamification/missions
  - OK: GET/POST/PATCH /api/admin/gamification/events
  - OK: GET/POST/PATCH /api/admin/gamification/badges
  - OK: GET /api/admin/gamification/clans
  - OK: GET /api/admin/gamification/xp-events
- Admin Notificacoes
  - OK: GET /api/admin/notifications/logs
  - OK: GET /api/admin/notifications/preferences
  - OK: GET /api/admin/notifications/devices
- Admin Jobs/Queues
  - OK: GET /api/admin/jobs
  - OK: GET /api/admin/jobs/:id
  - OK: GET /api/admin/jobs/stats
  - OK: GET /api/admin/schedules
  - OK: POST /api/admin/queues/restart
  - OK: GET /api/admin/queues/health
- Admin Observabilidade
  - OK: GET /api/admin/apm/dashboard
  - OK: GET /api/admin/performance/metrics
  - OK: GET /api/admin/alerts
  - OK: GET /api/admin/database/health
- Admin Billing/Costs
  - OK: GET /api/admin/costs/real/overview
  - OK: GET /api/admin/costs/real/openai
  - OK: GET /api/admin/costs/budgets
  - OK: PUT /api/admin/costs/budgets
  - OK: GET /api/admin/payments/overview

---

Gaps to close (from Stitch screens)
- Collections library: add /api/collections (list/create/update) or hide until ready.
- Notifications feed: create /api/notifications/feed (user scoped).
- Plan weights by banca: need source for "peso" (either edital metadata or question stats).
- Simulados detail routes: /api/simulados/... exists in backend but not wired in web client.

Next action (if you approve)
1) Map each Stitch page to backend data in the UI (by order in stitch-route-map.csv).
2) Implement missing endpoints or hide features with clear empty state.
3) Final QA: confirm every screen has a real data source or a "no data yet" state.
