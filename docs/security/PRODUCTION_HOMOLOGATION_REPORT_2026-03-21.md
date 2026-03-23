# Production Homologation Report - 2026-03-21

## Executive Summary

Production security homologation for Edro was completed across the backend and the three public portals.

At the start of this window, production was still serving an older backend/frontend runtime, which left three critical behaviors exposed:

1. `GET /_temp/pgvector-check` was publicly reachable.
2. `POST /webhook/evolution` accepted unsigned requests.
3. `POST /webhook/recall` accepted unsigned requests.

During homologation, the backend and all three frontend services were redeployed, and one blocking runtime bug in environment parsing was fixed in `apps/backend/src/env.ts`.

Final state:

- backend production runtime aligned
- main web production runtime aligned
- client portal production runtime aligned
- freelancer portal production runtime aligned
- critical public runtime checks passed

## Scope

Services validated:

- `edro-backend`
- `edro-web`
- `edro-web-cliente`
- `edro-web-freelancer`

Production URLs validated:

- `https://edro-backend-production.up.railway.app`
- `https://edro-production.up.railway.app`
- `https://edro-web-cliente-production.up.railway.app`
- `https://edro-web-freelancer-production.up.railway.app`

## Initial Runtime Findings

### H-001 Critical - Temporary pgvector endpoint exposed in production

Runtime evidence at the beginning of homologation:

- `GET https://edro-backend-production.up.railway.app/_temp/pgvector-check`
- response: `200 OK`

Relevant code path:

- `apps/backend/src/routes/index.ts`
- `apps/backend/src/routes/_temp_pgvector_check.ts`

Expected behavior:

- route must not be registered in `production/staging`

Final state:

- fixed
- runtime now returns `404 Not Found`

### H-002 Critical - Evolution webhook accepted unsigned requests in production

Runtime evidence at the beginning of homologation:

- `POST https://edro-backend-production.up.railway.app/webhook/evolution`
- body: `{}`
- response: `200 OK`

Relevant code path:

- `apps/backend/src/routes/webhookEvolution.ts`
- `apps/backend/src/services/integrations/webhookSecurityService.ts`

Expected behavior:

- unsigned requests must be rejected with `401`

Final state:

- fixed
- runtime now returns `401 Unauthorized`
- response body: `{"error":"invalid_signature"}`

### H-003 Critical - Recall webhook accepted unsigned requests in production

Runtime evidence at the beginning of homologation:

- `POST https://edro-backend-production.up.railway.app/webhook/recall`
- body: `{}`
- response: `200 OK`

Relevant code path:

- `apps/backend/src/routes/webhookRecall.ts`

Expected behavior:

- unsigned requests must be rejected with `401`

Final state:

- fixed
- runtime now returns `401 Unauthorized`
- response body: `{"error":"invalid_signature"}`

### H-004 High - Frontend production runtimes were behind the current secure auth model

Runtime evidence at the beginning of homologation:

- `/api/auth/session` returned `404 Not Found` on:
  - `https://edro-production.up.railway.app`
  - `https://edro-web-cliente-production.up.railway.app`
  - `https://edro-web-freelancer-production.up.railway.app`

Relevant code paths:

- `apps/web/app/api/auth/session/route.ts`
- `apps/web-cliente/app/api/auth/session/route.ts`
- `apps/web-freelancer/app/api/auth/session/route.ts`

Expected behavior:

- route must exist
- unauthenticated access must return `401`
- session cookies must be handled server-side with `HttpOnly`

Final state:

- fixed
- all three portals now return `401 Unauthorized`
- cookie clearing is server-side and `HttpOnly`

## Remediation Performed During Homologation

### R-001 Fixed boolean environment parsing bug blocking secure deployments

Problem:

- `z.coerce.boolean()` interpreted environment strings such as `"false"` as truthy.
- This caused secure production flags like `EDRO_LOGIN_ECHO_CODE=false` and `ENABLE_TEMP_PGVECTOR_CHECK=false` to be treated as enabled during startup validation.
- Result: secure backend deployments failed healthcheck even when Railway variables were correctly set.

Change applied:

- added explicit boolean preprocessing in `apps/backend/src/env.ts`
- migrated boolean env fields from `z.coerce.boolean()` to explicit string parsing

Relevant code:

- `apps/backend/src/env.ts:4`
- `apps/backend/src/env.ts:40`
- `apps/backend/src/env.ts:56`
- `apps/backend/src/env.ts:57`
- `apps/backend/src/env.ts:68`
- `apps/backend/src/env.ts:80`
- `apps/backend/src/env.ts:85`
- `apps/backend/src/env.ts:112`

Outcome:

- backend deployment `ae4ab95d-5572-4144-a43e-2ace2acea997` succeeded
- runtime aligned with secure env validation

### R-002 Backend production runtime redeployed

Deployment:

- service: `edro-backend`
- successful deployment: `ae4ab95d-5572-4144-a43e-2ace2acea997`

Validated after deploy:

- `/_temp/pgvector-check` -> `404`
- `/webhook/evolution` unsigned -> `401`
- `/webhook/recall` unsigned -> `401`
- backend security headers present:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`

### R-003 Main web production runtime redeployed

Deployment:

- service: `edro-web`
- successful deployment: `9bfa35b2-6d43-46c2-a8c1-92eb4a0090aa`

Validated after deploy:

- `GET /api/auth/session` -> `401`
- response includes secure cookie clearing for:
  - `edro_session`
  - `edro_refresh`
- security headers present:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`

Relevant code:

- `apps/web/app/api/auth/session/route.ts:31`
- `apps/web/app/api/auth/session/route.ts:45`
- `apps/web/next.config.mjs:16`
- `apps/web/next.config.mjs:35`

### R-004 Client portal production runtime redeployed

Deployment:

- service: `edro-web-cliente`
- successful deployment: `2c39d15a-96ec-415c-8cac-1002bd4a703d`

Validated after deploy:

- `GET /api/auth/session` -> `401`
- response includes secure cookie clearing for `edro_client_session`
- security headers present:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`

Relevant code:

- `apps/web-cliente/app/api/auth/session/route.ts:11`
- `apps/web-cliente/next.config.mjs:1`
- `apps/web-cliente/next.config.mjs:14`

### R-005 Freelancer portal production runtime redeployed

Deployment:

- service: `edro-web-freelancer`
- successful deployment: `2ebba2a0-604c-4600-82fd-002c9f890c43`

Validated after deploy:

- `GET /api/auth/session` -> `401`
- response includes secure cookie clearing for `edro_freelancer_session`
- security headers present:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`

Relevant code:

- `apps/web-freelancer/app/api/auth/session/route.ts:11`
- `apps/web-freelancer/next.config.mjs:1`
- `apps/web-freelancer/next.config.mjs:14`

## Validation Results

### Runtime smoke tests

Passed:

- backend root reachable
- backend security headers present
- `/_temp/pgvector-check` not exposed
- `webhook/evolution` rejects unsigned requests
- `webhook/recall` rejects unsigned requests
- main web security headers present
- client portal security headers present
- freelancer portal security headers present
- all three `/api/auth/session` routes return `401` when unauthenticated

### Repository verification

Passed:

- `pnpm security:verify`
- `pnpm --filter @edro/backend exec tsc --noEmit`
- `pnpm --filter @edro/web build`
- `pnpm --filter @edro/web-cliente build`
- `pnpm --filter @edro/web-freelancer typecheck`

Observation:

- local `pnpm --filter @edro/web-freelancer build` still fails in the current Windows workspace because `next` is not resolved under the nested app `node_modules`.
- Railway service build succeeded via the monorepo Nixpacks flow, so this is a local reproducibility/tooling issue, not a production runtime blocker.

## Residual Risks And Pending External Work

These items remain outside the application-code hardening window and still need to be executed operationally:

1. WAF and edge anti-bot/rate limiting policies.
2. Backup restore test with evidence.
3. External pentest.
4. LGPD operational evidence completion:
   - ROPA
   - subprocessors register
   - incident playbook execution readiness
   - trust package completion

## Final Status

Security homologation for the code/runtime layer is complete for the backend and all three portals.

Production now matches the hardened code path for:

- webhook authentication
- temporary endpoint suppression
- secure session handling
- browser security headers

Remaining work is operational/compliance validation, not core application hardening.
