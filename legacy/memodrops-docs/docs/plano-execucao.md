# Plano de execucao (ordenado) - roadmap 7 fases

Base: docs/issues-backlog.md
Objetivo: ordenar o trabalho por dependencias e risco, com tarefas praticas por issue.
Release alvo: beta

## Escopo beta (assumido)
- Web admin + web aluno
- Mobile MVP (onboarding, login, dashboard basico)
- Core flows funcionando: auth, plano diario, SRS, simulados, tutor, editais basicos
- Observabilidade basica: health, erros 4xx/5xx, filas
- Seguranca minima: auth JWT, guard admin, rate limit IA

## Fora do escopo beta
- 40 bancas completas (beta foca subset estavel)
- 80+ telas completas (beta foca telas chave)
- Gamificacao completa (clans/ranking)
- Auto-formacoes dinamicas completas

## Ordem de execucao (beta)

Wave 0 - Preparacao beta
- Fixar criterios de pronto do beta
- Validar ambiente com docs/checklist-validacao.md
- Listar riscos e gaps abertos

Wave 1 - Fundacao minima (Fase 1)
- MD-001 RBAC granular por modulo (escopo admin)
- MD-003 Alertas externos (escopo basico)
- MD-004 Resiliencia de workers (health + retry)
  - MD-002 criptografia pode ficar para pos-beta se nao bloquear

Wave 2 - Editais e UI base (Fases 5 e 7)
- MD-005 Scrapers (meta beta: 12-15 fontes estaveis)
  - Beta fontes (12): PCI, JC, Gran, CEBRASPE, FCC, FGV, VUNESP, IBADE, Quadrix, Instituto Mais, Cesgranrio, Selecon
- MD-006 Inventario de telas (telas chave)

Wave 3 - Features core (P1)
- MD-007 Integracao SRS com erros
- MD-009 Tutor -> Drop (minimo funcional)
- MD-012 Notificacoes inteligentes (limite + push simples)
- MD-013 Acessibilidade aplicada nas telas (telas chave)
- MD-017 Mobile MVP (onboarding/login/dashboard)
  - MD-008, MD-010, MD-011 podem ficar para pos-beta

Wave 4 - Polimento (P2)
- MD-014 Custos por plano e budget
- MD-015 Polimento das analises de simulados
- MD-016 Polimento geral de UX

## Tarefas detalhadas por issue

### MD-001 RBAC granular por modulo
- Mapear rotas admin x publicas
- Definir permissoes por papel (admin, ops, suporte)
- Implementar middleware e checks por rota
- Registrar auditoria de acesso
- Validar com testes manuais (401/403)

### MD-002 Criptografia de campos sensiveis
- Definir campos e tabelas sensiveis
- Criar migracoes e rotinas de criptografia
- Implementar decrypt na leitura
- Documentar rotacao de chaves

### MD-003 Alertas externos e thresholds
- Definir thresholds (fila, 5xx, latencia)
- Integrar canal externo (Slack/email/PagerDuty)
- Disparar alertas via monitoring
- Registrar evento de alerta no backend
- Beta: canal unico (ex.: Slack) e thresholds basicos

### MD-004 Resiliencia de workers
- Health check real de filas e workers
- Politicas de retry e backoff
- Restart automatico em falhas
- Validar backlog em erro controlado
- Beta: health + retry; restart automatico pode ficar para pos-beta

### MD-005 Scrapers 40 bancas + validacao
- Listar 40 fontes alvo
- Criar/ajustar presets no harvest
- Smoke test por banca
- Validar OCR/PDF e reprocessamento
- Beta: meta de 12-15 fontes estaveis

### MD-006 Inventario de telas e UI kit
- Catalogar telas admin + aluno
- Mapear componentes em packages/ui
- Identificar gaps para 80+ telas
- Gerar lista de priorizacao
- Beta: focar telas chave e gaps criticos

### MD-007 Integracao SRS com erros
- Sinalizar erros de simulados e questoes
- Criar/ajustar backlog SRS
- Recco usa sinais no plano diario
- Medir impacto em metricas

### MD-008 Similaridade de questoes
- Gerar embeddings para questoes
- Criar busca por similaridade
- Endpoint de recomendacao
- Fallback quando embedding falhar

### MD-009 Tutor -> Drop
- Endpoint para converter resposta do tutor
- Criar fluxo de aprovacao admin
- Registrar origem e metadados
- Beta: aprovacao simples no admin

### MD-010 Auto-formacoes dinamicas
- Pipeline edital -> blueprint -> drops
- Reprocessamento quando edital muda
- Versoes iterativas de modulos
- Beta: pode ficar fora se nao bloquear editais

### MD-011 Gamificacao expandida
- Missoes diarias/semanais
- Clans e ranking
- Streak recuperavel
- Beta: fora do escopo

### MD-012 Notificacoes inteligentes
- Regras por comportamento
- Limites anti-spam por usuario
- Push + in-app
- Beta: regras basicas + limite simples

### MD-013 Acessibilidade aplicada nas telas
- Aplicar preferencias em telas-chave
- Integrar TTS/STT em estudo e revisao
- Persistir preferencias por usuario

### MD-017 Mobile MVP
- Inicializar app Expo
- Onboarding + login
- Dashboard basico
- Integracao com API
- Beta: aplicar somente nas telas chave

### MD-014 Custos por plano e budget
- Relatorio por plano/usuario
- Budgets configuraveis
- Alertas por budget

### MD-015 Polimento das analises de simulados
- Revisar calculo de score/grade
- Melhorar mapas por banca/dificuldade/tempo

### MD-016 Polimento geral de UX
- Padrao de estados vazios/erro/loading
- Microcopy consistente nas telas principais
