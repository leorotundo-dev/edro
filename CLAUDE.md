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

Versao de producao lockada em:
- web: c6a3dd30-ea85-4f44-b27c-f5ba01e0b1de
- backend: b606c16d-0ffc-494a-a977-a792b9bf67d2

Antes de novo deploy, sempre rodar:
1) powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode check
2) So seguir deploy se o lock estiver preservado ou se houver autorizacao explicita para sobrescrever.

Se sobrescrever, atualizar lock:
- powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode set
