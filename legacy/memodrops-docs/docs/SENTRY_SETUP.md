# Sentry Setup for MemoDrops

Ensuring the `@edro/web` and `@edro/web-aluno` builds can upload source maps to Sentry requires an auth token and the DSN values for the `memodrops-prod` project. Follow these steps once, then configure your deployment environment (Railway, local `.env`, CI, etc.).

## 1. Generate an auth token in Sentry

1. Log in to https://sentry.io, open your organization (`memodrops`) and go to **Settings → Developer Settings → Auth Tokens**.
1. Create a new token with at least:
   * `project:write` (so `sentry-cli` can register releases and upload source maps for `memodrops-prod`)
   * `org:read` (needed to list projects)
1. Copy the token; it is **the only time you will see the full value**.

## 2. Set the token in your environment

| Environment | Where to set |
| --- | --- |
| Local development | `.env.local` with `SENTRY_AUTH_TOKEN=sntryu_…` |
| Railway / CI | Add `SENTRY_AUTH_TOKEN` as an environment variable in the project UI |
| Docker builds | pass `--build-arg SENTRY_AUTH_TOKEN=` or set it in the Dockerfile’s `ENV` |

Next.js/`@sentry/nextjs` automatically picks up that token during `pnpm run build` thanks to the `SENTRY_AUTH_TOKEN` check in the root `Dockerfile` and the `withSentryConfig()` wrappers under `apps/web` and `apps/web-aluno`.

## 3. Provide the DSN(s)

Both frontends expect:

```env
SENTRY_DSN=https://<public_key>@oXXX.ingest.sentry.io/YYY
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

Replace `https://...` with the DSN for the `memodrops-prod` project (found on the Sentry project settings page). Storing it under `NEXT_PUBLIC_SENTRY_DSN` ensures runtime code can report errors; some builds fallback to `process.env.SENTRY_DSN`.

## 4. Optional extras

- `SENTRY_RELEASE` (set via `package.json` version or CI)
- `SENTRY_LOG_LEVEL=info` or `debug` when diagnosing upload issues
- `SENTRY_ENVIRONMENT=production` (if you want the release tagged)

## 5. Verify

Run the build locally once the environment variables are set:

```bash
cd apps/web-aluno
pnpm run build
```

You should no longer see the warning `No Sentry auth token configured`, and the previous `gateway timeout (504)` should disappear once `sentry-cli` can reach the upload endpoint with valid credentials.

If you still hit timeouts, retry with `SENTRY_LOG_LEVEL=debug` to inspect the HTTP request details.
