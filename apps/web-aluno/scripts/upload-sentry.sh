#!/bin/sh
set -e

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "Skipping Sentry sourcemaps upload (SENTRY_AUTH_TOKEN not set)"
  exit 0
fi

release="${SENTRY_RELEASE:-${RAILWAY_GIT_COMMIT_SHA:-${RAILWAY_DEPLOYMENT_ID:-web-aluno-$(date +%s)}}}"

echo "Using Sentry release: $release"
sentry-cli releases new "$release"
sentry-cli releases files --help >/dev/null 2>&1 \
  && sentry-cli releases files "$release" upload-sourcemaps ./.next --url-prefix "~/_next" --rewrite \
  || sentry-cli sourcemaps upload --release "$release" --url-prefix "~/_next" ./.next
sentry-cli releases finalize "$release"
sentry-cli releases deploys "$release" new -e "${SENTRY_ENVIRONMENT:-production}"
