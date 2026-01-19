# Checklist de validacao end-to-end

Esta lista valida o fluxo principal do produto usando a API e as duas UIs.
Use ambiente local primeiro e repita em staging/prod.

## 0. Pre-requisitos
- Docker + Docker Compose
- Node + pnpm
- .env com OPENAI_API_KEY, DATABASE_URL, REDIS_URL, JWT_SECRET
- Start local:
  - PowerShell: `.\scripts\start-local.ps1`

## 1. Health e infra
- GET `http://localhost:3333/health` -> `{ status: "ok" }`
- GET `http://localhost:3000` -> web admin abre
- GET `http://localhost:3001` -> web aluno abre (Docker)

## 2. Auth basico
- POST `http://localhost:3333/auth/register`
  - body: `{ "name": "Test", "email": "test@local", "password": "123456" }`
- POST `http://localhost:3333/auth/login`
  - usar token retornado para o restante
- GET `http://localhost:3333/api/auth/me` com `Authorization: Bearer <token>`

## 3. Plano diario e Recco
- POST `http://localhost:3333/api/plan/generate`
  - header: `Authorization: Bearer <token>`
  - body: `{ "tempoDisponivel": 60 }`
- GET `http://localhost:3333/api/plan/today` com token
- POST `http://localhost:3333/api/recco/trail/generate`
  - body: `{ "user_id": "<userId>" }`

## 4. SRS
- POST `http://localhost:3333/api/srs/enroll` com token
  - body: `{ "drop_id": "<uuid>" }`
- GET `http://localhost:3333/api/srs/today` com token
- POST `http://localhost:3333/api/srs/review` com token
  - body: `{ "card_id": "<uuid>", "grade": 4 }`

## 5. Questoes e simulados
- POST `http://localhost:3333/api/ai/questions/generate` com token
  - body: `{ "topic": "Direito Constitucional", "discipline": "Constitucional", "examBoard": "FGV", "difficulty": 3 }`
- POST `http://localhost:3333/api/simulados` (criar simulado)
  - body: `{ "name": "Simulado 1", "discipline": "Constitucional", "examBoard": "FGV", "totalQuestions": 10, "tipo": "adaptativo" }`
- POST `http://localhost:3333/api/simulados/:id/start`
  - body: `{ "userId": "<userId>", "mode": "padrao" }`
- GET `http://localhost:3333/api/simulados/reports/heatmap`

## 6. Tutor, mnemonicos e simplificacao
- POST `http://localhost:3333/api/tutor/session` com token
  - body: `{ "message": "Explique principio da legalidade", "user_id": "<userId>" }`
- POST `http://localhost:3333/api/mnemonics/generate` com token
  - body: `{ "subtopico": "Poderes", "conteudo": "Executivo/Legislativo/Judiciario" }`
- POST `http://localhost:3333/api/simplify` com token
  - body: `{ "texto": "texto longo aqui...", "metodo": "analogia" }`

## 7. Editais e harvest
- GET `http://localhost:3333/api/editais`
- POST `http://localhost:3333/api/harvest/run-all` com token
- GET `http://localhost:3333/api/editais/reports/heatmap`
- GET `http://localhost:3333/api/editais/reports/previsao-provas`

## 7b. Scrapers (beta)
- Start scrapers service (exemplo): `PORT=3334 node apps/scrapers/src/index.js`
- GET `http://localhost:3334/health`
- POST `http://localhost:3334/run`
- Opcional: `SCRAPER_ONLY=ibade,quadrix,institutomais,cesgranrio,selecon SCRAPER_LIMIT=3`

## 8. Gamificacao e notificacoes
- GET `http://localhost:3333/api/gamification/profile` com token
- POST `http://localhost:3333/api/gamification/xp` com token
  - body: `{ "amount": 50, "reason": "checklist" }`
- POST `http://localhost:3333/api/notifications/send` com token
  - body: `{ "userId": "<userId>", "type": "push", "title": "Teste", "body": "Hello", "delayMs": 0 }`

## 9. Acessibilidade
- GET `http://localhost:3333/api/accessibility/modes`
- GET `http://localhost:3333/api/accessibility/settings` com token
- POST `http://localhost:3333/api/accessibility/tts` com token
  - body: `{ "texto": "Teste de voz" }`

## 10. Admin (se houver usuario admin)
- Definir `ADMIN_EMAILS` com o email do usuario
- GET `http://localhost:3333/api/admin/metrics/overview`
- GET `http://localhost:3333/api/admin/costs/real/overview`
- GET `http://localhost:3333/api/circuit-breakers`
- GET `http://localhost:3333/api/monitoring/health`

## 11. UI smoke
- Web admin: navegar dashboards, editais, questoes, simulados
- Web aluno: navegar dashboard, plano diario, revisao, simulados, acessibilidade

## 12. Mobile smoke (beta)
- App inicia e carrega onboarding
- Login com API do backend
- Dashboard mostra resumo basico
