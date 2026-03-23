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
