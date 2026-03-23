#!/usr/bin/env bash
# =============================================================================
# backup_restore_drill.sh — Drill completo de backup e restore Edro Digital
# =============================================================================
#
# Uso:
#   ./scripts/backup_restore_drill.sh [--schema-only] [--no-cleanup]
#
# Flags:
#   --schema-only   Executa apenas dump de schema (sem dados) — modo rapido/LGPD-safe
#   --no-cleanup    Mantem o container e o dump apos o drill (para inspecao)
#
# Requisitos:
#   - railway CLI instalado e autenticado
#   - docker disponivel localmente
#   - SERVICE_NAME configurado abaixo (ou via env RAILWAY_SERVICE_NAME)
#
# O script:
#   1. Registra T0 (inicio)
#   2. Extrai dump do banco de producao via railway run
#   3. Sobe container Docker efemero com pgvector
#   4. Restaura o dump no container
#   5. Valida objetos restaurados (tabelas, extensoes, funcoes)
#   6. Mede RTO e RPO
#   7. Gera relatorio em docs/security/RESTORE_DRILL_RESULTS_<data>.md
#   8. Limpa container e dump (a menos que --no-cleanup)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------

SERVICE_NAME="${RAILWAY_SERVICE_NAME:-edro-backend}"
CONTAINER_NAME="edro-restore-drill-$$"
LOCAL_PORT="55434"
DB_NAME="edro_drill"
DUMP_DIR="tmp/restore-drill"
DATE=$(date +%Y-%m-%d)
TIME_START=$(date +%s)
TIME_START_HUMAN=$(date '+%Y-%m-%d %H:%M:%S')

SCHEMA_ONLY=false
NO_CLEANUP=false

for arg in "$@"; do
  case $arg in
    --schema-only) SCHEMA_ONLY=true ;;
    --no-cleanup)  NO_CLEANUP=true ;;
  esac
done

DUMP_FILE="$DUMP_DIR/edro_dump_${DATE}.dump"
REPORT_FILE="docs/security/RESTORE_DRILL_RESULTS_${DATE}.md"

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
fail() { echo "[ERRO] $*" >&2; exit 1; }

elapsed() {
  local now
  now=$(date +%s)
  echo $(( now - TIME_START ))
}

# ---------------------------------------------------------------------------
# Pre-verificacoes
# ---------------------------------------------------------------------------

log "=== DRILL DE BACKUP E RESTORE — EDRO DIGITAL ==="
log "Modo: $([ "$SCHEMA_ONLY" = true ] && echo 'schema-only' || echo 'COMPLETO (schema + dados)')"
log "Container: $CONTAINER_NAME  |  Porta local: $LOCAL_PORT"
echo ""

command -v railway >/dev/null 2>&1 || fail "railway CLI nao encontrado. Instale via: npm i -g @railway/cli"
command -v docker  >/dev/null 2>&1 || fail "Docker nao encontrado."
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore nao encontrado. Instale postgresql-client."

mkdir -p "$DUMP_DIR"
mkdir -p "$(dirname "$REPORT_FILE")"

# ---------------------------------------------------------------------------
# Etapa 1 — Dump
# ---------------------------------------------------------------------------

T_DUMP_START=$(date +%s)
log "ETAPA 1 — Extraindo dump do banco de producao via railway run..."

SCHEMA_FLAG=""
[ "$SCHEMA_ONLY" = true ] && SCHEMA_FLAG="--schema-only"

railway run --service "$SERVICE_NAME" \
  bash -c "apt-get install -y -q postgresql-client 2>/dev/null; \
           pg_dump \$DATABASE_URL \
             --format=custom \
             --no-owner \
             --no-privileges \
             $SCHEMA_FLAG \
             > /tmp/edro_dump.dump && \
           cat /tmp/edro_dump.dump" > "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
T_DUMP_END=$(date +%s)
DUMP_DURATION=$(( T_DUMP_END - T_DUMP_START ))

log "Dump concluido em ${DUMP_DURATION}s — tamanho: $DUMP_SIZE"
log "Arquivo: $DUMP_FILE"

# Verificar integridade
log "Verificando integridade do dump..."
pg_restore --list "$DUMP_FILE" > /dev/null || fail "Dump corrompido ou vazio."
DUMP_OBJECT_COUNT=$(pg_restore --list "$DUMP_FILE" | wc -l)
log "Objetos no dump: $DUMP_OBJECT_COUNT"

# ---------------------------------------------------------------------------
# Etapa 2 — Subir container Docker
# ---------------------------------------------------------------------------

T_RESTORE_START=$(date +%s)
log "ETAPA 2 — Subindo container Docker pgvector efemero..."

docker run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=drillpassword \
  -p "${LOCAL_PORT}:5432" \
  pgvector/pgvector:pg17

# Aguardar disponibilidade
log "Aguardando PostgreSQL ficar disponivel..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -q 2>/dev/null; then
    log "PostgreSQL disponivel (${i}s)"
    break
  fi
  sleep 1
  [ $i -eq 30 ] && fail "Timeout esperando PostgreSQL iniciar"
done

DB_URL="postgresql://postgres:drillpassword@localhost:${LOCAL_PORT}/${DB_NAME}"

# ---------------------------------------------------------------------------
# Etapa 3 — Restore
# ---------------------------------------------------------------------------

log "ETAPA 3 — Restaurando dump..."

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "$DB_URL" \
  "$DUMP_FILE" 2>&1 | grep -E "^ERROR|^FATAL" || true

T_RESTORE_END=$(date +%s)
RESTORE_DURATION=$(( T_RESTORE_END - T_RESTORE_START ))
log "Restore concluido em ${RESTORE_DURATION}s"

# ---------------------------------------------------------------------------
# Etapa 4 — Validacao
# ---------------------------------------------------------------------------

log "ETAPA 4 — Validando objetos restaurados..."

TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' \n')
FUNCTION_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';" | tr -d ' \n')
EXT_LIST=$(psql "$DB_URL" -t -c "SELECT string_agg(extname, ', ' ORDER BY extname) FROM pg_extension WHERE extname NOT IN ('plpgsql');" | tr -d ' \n')

log "Tabelas: $TABLE_COUNT"
log "Funcoes: $FUNCTION_COUNT"
log "Extensoes: $EXT_LIST"

# Checks minimos
[ "${TABLE_COUNT:-0}" -ge 50 ] || fail "Numero de tabelas abaixo do esperado: $TABLE_COUNT (esperado >= 50)"
log "CHECK OK — tabelas >= 50"

echo "$EXT_LIST" | grep -q "pgcrypto"   || fail "Extensao pgcrypto nao encontrada"
echo "$EXT_LIST" | grep -q "uuid-ossp"  || fail "Extensao uuid-ossp nao encontrada"
echo "$EXT_LIST" | grep -q "vector"     || fail "Extensao vector nao encontrada"
log "CHECK OK — extensoes criticas presentes"

# RPO — timestamp do ultimo registro no dump (se nao schema-only)
RPO_BASELINE="N/A (schema-only)"
if [ "$SCHEMA_ONLY" = false ]; then
  RPO_BASELINE=$(psql "$DB_URL" -t -c "
    SELECT GREATEST(
      (SELECT max(created_at) FROM audit_log LIMIT 1),
      (SELECT max(updated_at) FROM edro_jobs LIMIT 1)
    );" 2>/dev/null | tr -d ' \n' || echo "N/A")
  log "RPO baseline (ultimo registro): $RPO_BASELINE"
fi

# ---------------------------------------------------------------------------
# Medicao de RTO
# ---------------------------------------------------------------------------

TIME_END=$(date +%s)
RTO_SECONDS=$(( TIME_END - TIME_START ))
RTO_MINUTES=$(echo "scale=1; $RTO_SECONDS / 60" | bc)

log ""
log "=== RESULTADO DO DRILL ==="
log "RTO medido: ${RTO_MINUTES} minutos (${RTO_SECONDS}s)"
log "RPO baseline: $RPO_BASELINE"
log "Status: RESTORE_OK"

# ---------------------------------------------------------------------------
# Etapa 5 — Relatorio
# ---------------------------------------------------------------------------

log "ETAPA 5 — Gerando relatorio..."

cat > "$REPORT_FILE" <<MDEOF
# Restore Drill Results — $DATE

## Identificacao

- Data: $DATE
- Hora de inicio: $TIME_START_HUMAN
- Modo: $([ "$SCHEMA_ONLY" = true ] && echo 'schema-only' || echo 'completo (schema + dados)')
- Owner tecnico: (preencher)
- Owner de banco: (preencher)

## Resultado

- Status: **RESTORE_OK**
- RTO medido: **${RTO_MINUTES} minutos (${RTO_SECONDS}s)**
- RPO baseline: **${RPO_BASELINE}**

## Comparacao com targets

| Metrica | Target | Medido | Status |
| --- | --- | --- | --- |
| RTO | 4 horas (240 min) | ${RTO_MINUTES} min | $([ "$(echo "$RTO_MINUTES < 240" | bc)" = "1" ] && echo "DENTRO DO TARGET" || echo "ACIMA DO TARGET") |
| RPO | 24 horas | (calcular manualmente) | — |

## Artefatos

- Dump: $DUMP_FILE
- Tamanho do dump: $DUMP_SIZE
- Container: $CONTAINER_NAME ($([ "$NO_CLEANUP" = true ] && echo 'mantido' || echo 'removido'))

## Validacao

| Check | Resultado |
| --- | --- |
| Tabelas publicas | $TABLE_COUNT |
| Funcoes publicas | $FUNCTION_COUNT |
| Extensoes | $EXT_LIST |
| Duracao do dump | ${DUMP_DURATION}s |
| Duracao do restore | ${RESTORE_DURATION}s |

## Anomalias e gaps

(preencher manualmente)

## Aprovacao

- Owner tecnico: _______________ Data: ___________
- Owner de banco: _______________ Data: ___________
MDEOF

log "Relatorio gerado: $REPORT_FILE"

# ---------------------------------------------------------------------------
# Limpeza
# ---------------------------------------------------------------------------

if [ "$NO_CLEANUP" = false ]; then
  log "ETAPA 6 — Limpeza..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  rm -f "$DUMP_FILE"
  log "Container e dump removidos."
else
  log "ETAPA 6 — Limpeza ignorada (--no-cleanup)."
  log "Container: $CONTAINER_NAME"
  log "Dump: $DUMP_FILE"
  log "Para remover manualmente: docker rm -f $CONTAINER_NAME && rm -f $DUMP_FILE"
fi

log ""
log "=== DRILL CONCLUIDO ==="
log "RTO: ${RTO_MINUTES} min | Relatorio: $REPORT_FILE"
