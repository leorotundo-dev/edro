#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:?service is required}"
PROJECT_ID="${2:?project id is required}"
ENVIRONMENT="${3:?environment is required}"

ATTEMPTS="${RAILWAY_DEPLOY_ATTEMPTS:-4}"
BACKOFF_SECONDS="${RAILWAY_DEPLOY_BACKOFF_SECONDS:-20}"

is_transient_error() {
  local output="$1"
  grep -Eiq \
    'Failed to create code snapshot|Failed to upload code|502 Bad Gateway|500 Internal Server Error|operation timed out|Failed to fetch|error decoding response body|backboard\.railway\.com/graphql/v2|reqwest error' \
    <<<"$output"
}

for (( attempt=1; attempt<=ATTEMPTS; attempt++ )); do
  echo "[retry-railway-up] service=${SERVICE} attempt=${attempt}/${ATTEMPTS}"

  set +e
  OUTPUT="$(railway up --service "${SERVICE}" --project "${PROJECT_ID}" --environment "${ENVIRONMENT}" --ci 2>&1)"
  STATUS=$?
  set -e

  printf '%s\n' "$OUTPUT"

  if [[ $STATUS -eq 0 ]]; then
    exit 0
  fi

  if [[ $attempt -ge $ATTEMPTS ]]; then
    echo "[retry-railway-up] giving up on ${SERVICE} after ${ATTEMPTS} attempt(s)." >&2
    exit $STATUS
  fi

  if ! is_transient_error "$OUTPUT"; then
    echo "[retry-railway-up] non-transient failure for ${SERVICE}; aborting without retry." >&2
    exit $STATUS
  fi

  SLEEP_FOR=$(( BACKOFF_SECONDS * attempt ))
  echo "[retry-railway-up] transient Railway failure for ${SERVICE}; retrying in ${SLEEP_FOR}s." >&2
  sleep "$SLEEP_FOR"
done
