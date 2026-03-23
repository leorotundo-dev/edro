# Backup Restore Drill - 2026-03-21

## Objetivo

Validar a cadeia tecnica de `dump -> restore -> verificacao` sem movimentar dados de clientes para fora de um ambiente controlado.

Este drill foi executado em modo `schema-only` por motivo de minimizacao de dados e LGPD. Nenhum dado de producao foi exportado para a workstation.

## Escopo

- origem: banco de producao da Edro acessado a partir do runtime do `edro-backend` no Railway
- artefato gerado: dump logico `schema-only`
- destino: banco efemero local em container `pgvector/pgvector:pg17`

## Metodo

1. Conexao ao runtime do `edro-backend` via `railway ssh`.
2. Instalacao do cliente PostgreSQL no runtime para executar `pg_dump`.
3. Extracao de schema-only com:
   - `pg_dump --schema-only --no-owner --no-privileges`
4. Restore do dump em container local efemero com suporte a `pgvector`.
5. Validacao do restore com consulta de objetos restaurados.

## Evidencias geradas

Arquivos locais do drill:

- `tmp/restore-drill/edro_schema_2026-03-21.sql`
- `tmp/restore-drill/restore_output.txt`

Container efemero utilizado:

- nome: `edro-restore-drill`
- imagem: `pgvector/pgvector:pg17`
- porta local: `55433`

## Resultado

Resultado do restore:

- `RESTORE_OK`

Objetos validados no banco restaurado:

- tabelas publicas: `218`
- extensoes instaladas: `4`
- funcoes publicas: `183`

Extensoes confirmadas no banco restaurado:

- `pgcrypto`
- `plpgsql`
- `uuid-ossp`
- `vector`

## Conclusao

O restore tecnico de schema foi bem-sucedido.

Isso prova:

- o runtime de producao consegue acessar o banco e executar dump logico
- o schema atual restaura sem erro em ambiente limpo com suporte a `pgvector`
- as extensoes criticas do schema estao restauraveis

## Limites deste drill

Este drill `nao` substitui um exercicio completo de recuperacao de desastre.

Pendencias ainda necessarias:

1. restore completo com dados em ambiente isolado controlado pela operacao
2. medicao formal de `RTO`
3. medicao formal de `RPO`
4. evidencias de validacao funcional pos-restore

## Recomendacao operacional

Executar em seguida um `restore full` em ambiente temporario segregado, com:

- aprovacao operacional
- mascaramento ou controle estrito de acesso
- checklist funcional minimo
- registro de tempo total do processo

## Procedimento para o drill completo de RTO/RPO

### Objetivo do drill completo

Medir o tempo real de recuperacao em condicao de desastre simulado, gerar evidencia formal e definir targets operacionais de `RTO` e `RPO` para a Edro.

### Targets propostos (a ratificar apos o drill)

| Metrica | Target proposto | Justificativa |
| --- | --- | --- |
| RTO (Recovery Time Objective) | 4 horas | Operacao pode tolerar indisponibilidade em horario comercial por ate meio periodo |
| RPO (Recovery Point Objective) | 24 horas | Backups diarios; perda de dados de um dia e aceitavel operacionalmente |

Estes targets devem ser ratificados pela lideranca e revisados apos o primeiro drill completo.

### Pre-requisitos para executar o drill completo

1. janela de manutencao confirmada (fora de horario critico)
2. owner tecnico disponivel do inicio ao fim
3. banco temporario Railway ou instancia Postgres isolada disponivel (nao usar a de producao)
4. `DATABASE_URL` de producao acessivel a partir do ambiente de execucao (via Railway shell ou variavel temporaria)
5. dump completo (`--data` ou sem `--schema-only`) com volume estimado verificado

### Passos do drill completo

```
T=0  Registrar hora de inicio (T0)
T+?  railway run pg_dump --format=custom --no-owner --no-privileges > edro_full_YYYY-MM-DD.dump
T+?  Confirmar tamanho do dump e integridade (pg_restore --list)
T+?  Provisionar banco temporario isolado (Railway ou Docker com pgvector)
T+?  pg_restore --clean --no-owner --no-privileges -d DATABASE_URL_TEMP edro_full_YYYY-MM-DD.dump
T+?  Validar contagem de tabelas, funcoes e extensoes
T+?  Executar checklist funcional minimo (ver abaixo)
T+?  Registrar hora de ambiente funcional (T_RTO)
T+?  Registrar timestamp do ultimo registro no dump (T_RPO_baseline)
T+?  Destruir banco temporario e dump apos validacao
```

**RTO medido** = T_RTO - T0
**RPO medido** = tempo entre T_RPO_baseline e T0

### Checklist funcional minimo pos-restore

- [ ] tabelas publicas restauradas: contagem maior que 200
- [ ] extensoes: pgcrypto, plpgsql, uuid-ossp, vector
- [ ] funcoes publicas: contagem maior que 150
- [ ] consulta de usuario admin: retorna pelo menos 1 linha em `edro_users`
- [ ] consulta de tenant: retorna pelo menos 1 linha em `tenants`
- [ ] indices de tenant_id presentes nas tabelas principais

### Evidencias a registrar no relatorio

- data e hora do drill
- owner tecnico e owner de banco presentes
- tamanho do dump
- duracao de cada etapa
- RTO medido vs target
- RPO medido vs target
- resultado do checklist funcional
- anomalias ou gaps identificados
- decisao sobre ajuste de target ou processo

### Template de registro

Arquivo: `docs/security/RESTORE_DRILL_RESULTS_YYYY-MM-DD.md`

Usar `FULL_RESTORE_REPORT_TEMPLATE.md` como base.

### Frequencia recomendada

- drill completo: semestral ou antes de auditoria/pentest
- drill schema-only (como este): trimestral como sanidade tecnica

### Status atual (2026-03-23)

- drill schema-only: `CONCLUIDO` (este documento)
- drill completo com medicao formal de RTO/RPO: `PENDENTE` — aguardando janela aprovada
