# Edro Digital — Instruções para Claude

## Norte estratégico (ler antes de qualquer trabalho)

Este projeto está sendo construído como uma **máquina de mudança de comportamento** — não uma ferramenta de geração de conteúdo genérica.

Toda feature, endpoint, tela e agente de IA deve servir a um dos quatro andares:
- **Negócio**: vender programas de comportamento, não posts e views
- **Estratégia**: Motor transforma input mínimo em plano comportamental completo
- **Criação**: time faz curadoria e craft em cima do que o Motor propõe
- **Performance**: medir microcomportamentos reais + dark funnel + aprender em loop

**Documento de visão completo:** `docs/NORTE_AGENCIA_COMPORTAMENTAL.md`

A próxima grande mudança arquitetural é a entidade **Campaign** — que conecta todos os andares.

Antes de construir qualquer feature nova, perguntar:
1. Em qual andar vive?
2. Serve ao Campaign como entidade central?
3. Alimenta o loop de aprendizado?
4. Pode ser medido em microcomportamentos reais?

---

## CLAUDE DEPLOY SYNC NOTE (Edro.Digital)

Fluxo padrao de producao:
- push/merge em `main`
- checks obrigatorios verdes (`Security Gates`, `Secret Scan`, `CodeQL`)
- workflow GitHub `Deploy Production`
- deploy automatico dos servicos Railway

Segredo obrigatorio no GitHub:
- `RAILWAY_TOKEN` como repo secret ou environment secret `production`
  - preferencialmente um Project Token da Railway apontado para `production`
  - precisa conseguir deploy/logs dos servicos `edro-backend`, `edro-web`, `edro-web-cliente` e `edro-web-freelancer`

Regras de seguranca do auto-deploy:
1. Se o merge alterar `apps/backend/src/db/migrations/**`, o workflow bloqueia o auto-deploy.
2. Nesses casos, rodar a migration manualmente e depois disparar `Deploy Production` por `workflow_dispatch` com `skip_migration_guard=true`.
3. O lock de deploy passa a ser emitido como artifact/summary do workflow. O arquivo `.railway-version-lock.json` do repo fica como referencia para operacao manual/emergencial.

Deploy manual local via Railway CLI:
- usar apenas como fallback/emergencia
- antes de sobrescrever producao, rodar:
  - `powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode check`
- se houver sobrescrita manual autorizada, atualizar o lock local:
  - `powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode set`
