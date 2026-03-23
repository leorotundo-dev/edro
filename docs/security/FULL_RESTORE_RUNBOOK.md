# Full Restore Runbook

## Objetivo

Executar um restore completo em ambiente isolado, medindo `RTO` e validando o minimo funcional da plataforma sem expor dados desnecessariamente.

## Quando usar

- exercicio formal de continuidade
- validacao periodica de backup
- teste previo para cliente grande ou auditoria
- preparacao para incidente real

## Resultado esperado

- ambiente restaurado com sucesso
- tempo total medido
- evidencias salvas
- checklist funcional concluido
- riscos e gaps registrados

## Definicoes

- `RTO`
  Tempo entre inicio do incidente/exercicio e o ambiente ficar funcionalmente utilizavel.
- `RPO`
  Defasagem maxima aceitavel entre o ultimo dado consistente recuperado e o momento do incidente.

## Regras de execucao

- nunca restaurar sobre producao
- usar ambiente temporario segregado
- limitar acesso ao ambiente restaurado
- registrar horario de cada etapa
- nao compartilhar credenciais em chat ou documento aberto

## Owners minimos

- owner tecnico do restore
- owner de banco
- owner de aplicacao
- owner de seguranca/privacidade
- owner executivo para go/no-go

## Preparacao

### 1. Ambiente alvo

- criar banco temporario segregado
- criar backend temporario apontando para esse banco
- criar frontend temporario apenas se a validacao exigir
- restringir acesso por VPN, IP allowlist ou auth forte

### 2. Segredos

- gerar segredos temporarios exclusivos para o ambiente restaurado
- nunca reutilizar segredos de producao onde nao for necessario
- desabilitar integracoes que possam disparar efeitos reais:
  - email
  - WhatsApp
  - webhooks externos
  - billing

### 3. Artefatos de entrada

- tipo de backup usado
- timestamp do backup
- hash/checksum quando aplicavel
- plano de rollback do ambiente temporario

## Execucao

### Etapa A - Inicio do cronometro

Registrar:

- data
- hora de inicio
- owner responsavel
- objetivo do exercicio

### Etapa B - Restore do banco

- criar banco vazio
- aplicar restore completo
- validar extensoes obrigatorias
- validar schemas, tabelas, indices e funcoes

### Etapa C - Subir aplicacao

- apontar backend para o banco restaurado
- subir aplicacao com segredos temporarios
- desabilitar jobs e integracoes de efeito colateral se necessario

### Etapa D - Validacao tecnica minima

- healthcheck do backend
- login com conta de teste
- leitura de clientes
- leitura de calendario/briefings
- upload/download basico
- webhook negativo invalido

### Etapa E - Encerramento do cronometro

Registrar:

- hora em que o ambiente ficou utilizavel
- `RTO` observado
- diferenca do backup restaurado para o alvo operacional
- `RPO` observado

## Checklist funcional minimo

- [ ] backend responde healthcheck
- [ ] auth principal funciona
- [ ] painel interno carrega
- [ ] portal cliente carrega
- [ ] portal freelancer carrega
- [ ] acesso a dados chave funciona em leitura
- [ ] logs disponiveis
- [ ] integracoes de efeito real confirmadas como desligadas

## Evidencias a salvar

- identificador do backup
- horario de inicio e fim
- comandos/steps executados
- output resumido do restore
- capturas ou logs do healthcheck
- resultado do checklist funcional
- gaps e acoes corretivas

## Criterio de sucesso

- restore concluido sem erro bloqueante
- aplicacao sobe no ambiente restaurado
- checklist funcional minimo passa
- `RTO` e `RPO` ficam registrados

## Pos-execucao

- destruir ambiente temporario
- revogar segredos temporarios
- consolidar relatorio do exercicio
- atualizar `BACKUP_RESTORE_DRILL_2026-03-21.md` ou novo relatorio datado
- abrir acoes corretivas no tracker de seguranca
