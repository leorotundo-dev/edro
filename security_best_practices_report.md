# Security Best Practices Report

Scope: `EdroDigital` backend and web app

Date: 2026-04-01

## Summary

The repository does **not** currently appear to expose live secrets in source control, and the web app has some solid baseline controls already in place:

- session tokens are stored in `HttpOnly` cookies with `SameSite=Lax`
- auth proxy writes enforce same-origin checks
- backend has global rate limiting, CORS allowlisting, and default security headers
- frontend HTML rendering points escape `<`, `>`, and `&` before markdown-style formatting

The highest-risk issues are concentrated in **public webhook endpoints that currently trust inbound requests without authenticating the sender**.

## Findings

### 1. High — Gmail webhook accepts unauthenticated inbound events

File:
- `apps/backend/src/routes/webhookGmail.ts`

Evidence:
- `POST /webhook/gmail` immediately acknowledges the request
- it decodes the body as Pub/Sub payload
- it looks up `gmail_connections` by `emailAddress`
- it triggers `processGmailHistory(...)`
- there is **no** verification of Google Pub/Sub authenticity, no bearer secret, and no signed channel token

Impact:
- any party that can hit this endpoint can forge Pub/Sub-style payloads
- this can trigger tenant-specific inbox sync work
- it increases risk of event spoofing, noisy processing, and targeted abuse against known connected inboxes

Recommended fix:
- require authenticated Pub/Sub delivery, preferably via a verified push identity or signed JWT assertion from Google
- reject requests that do not prove origin
- log and rate-limit failures separately

### 2. High — Google Calendar webhook trusts channel headers without verification

File:
- `apps/backend/src/routes/webhookGoogleCalendar.ts`

Evidence:
- `POST /webhook/google-calendar` accepts `x-goog-channel-id`
- it treats `exists` / `not_exists` as valid change notifications
- it directly calls `processCalendarNotification(channelId, resourceState)`
- there is **no** verification of `X-Goog-Channel-Token`, HMAC, shared secret, or request authenticity

Impact:
- an attacker who learns or guesses a valid channel id can trigger synthetic calendar sync processing
- this can create noisy sync storms and trust false external events

Recommended fix:
- issue a per-watch secret and verify `X-Goog-Channel-Token`
- bind that token to the stored watch record
- reject any notification missing both a valid channel id and the expected channel token

### 3. Medium — `/metrics` is publicly readable when enabled

File:
- `apps/backend/src/server.ts`

Evidence:
- when `ENABLE_METRICS` is true, the server registers `GET /metrics`
- the route has no auth guard, IP allowlist, or shared secret

Impact:
- anyone who can reach the service can scrape Prometheus metrics
- this can reveal route names, traffic shape, error rates, and operational characteristics useful to attackers

Recommended fix:
- restrict `/metrics` to a private network, allowlisted IPs, or an authenticated scrape path
- if public reachability is unavoidable, put it behind a reverse proxy allowlist

### 4. Medium — Universal inbound webhook uses URL path token as the full auth model

File:
- `apps/backend/src/routes/webhookUniversal.ts`

Evidence:
- public endpoint is `POST /webhook/inbound/:clientToken`
- the code comments state: “No auth required — the token IS the auth.”
- the request is authorized solely by matching `clients.webhook_secret`

Impact:
- path secrets leak more easily than header secrets through logs, dashboards, screenshots, browser history, and third-party tooling
- once leaked, an attacker can submit arbitrary payloads that create `webhook_events` and may trigger Jarvis briefing generation

Recommended fix:
- move auth to a header-based HMAC or signed secret
- keep rotation support
- consider preserving the path only as a routing key, not as the sole credential

## Confirmed Non-Findings / Mitigations

### No obvious live secrets found in source control

I did not find committed live API keys, private keys, JWT secrets, or database credentials in the repository root or application code during the scan performed.

### Frontend HTML rendering does not currently look like active XSS

Files reviewed:
- `apps/web/app/clients/[id]/reports/page.tsx`
- `apps/web/app/clients/[id]/ClientLayoutClient.tsx`
- `apps/web/app/clients/[id]/analytics/ClientAnalyticsCore.tsx`

The current helpers escape HTML before applying limited markdown-like formatting. That reduces the immediate risk of script injection in these paths.

### Session handling is materially safer than storing tokens in localStorage

Files reviewed:
- `apps/web/app/api/auth/verify/route.ts`
- `apps/web/lib/serverAuth.ts`

The app stores access/refresh tokens in `HttpOnly` cookies, uses `SameSite=Lax`, and checks same-origin on auth writes. That is a good baseline.

## Recommended Remediation Order

1. Authenticate Gmail webhook requests
2. Authenticate Google Calendar webhook requests
3. Lock down `/metrics`
4. Replace path-token-only auth for the universal inbound webhook

## Notes

This report focuses on the risks most relevant to the concern “is my system dangerous to have on GitHub?” The biggest GitHub-specific danger is still:

- committing secrets
- exposing business-sensitive internals in a public repo
- or shipping code that assumes obscurity instead of real verification

In this codebase, the clearest actionable risks are currently the two unauthenticated webhook receivers and the public metrics endpoint.

## Artifact / Production Exposure Addendum

This second pass focused on the Anthropic-style failure mode: accidentally exposing proprietary internals through build artifacts, public static files, or overly permissive file-serving routes.

### 5. Medium — Internal UX prototypes are deployed as public static files

Files:
- `apps/web/public/ux/**`

Evidence:
- the production web image copies the entire `apps/web/public` folder
- the repo contains many internal prototype files under `apps/web/public/ux/`, including:
  - `ux/edro_command_center_home_*/code.html`
  - `ux/edro_creative_studio_step*/code.html`
  - `ux/edro_social_listening/code.html`
  - `ux/edro-links.js`

Impact:
- these files are publicly reachable by default in a Next.js app
- they expose internal flows, naming, design explorations, and implementation intent
- this is not the same as leaking source code, but it does publish internal product artifacts that likely should not be public

Recommended fix:
- remove internal UX prototype files from `public/`
- move them to a private docs/design location, or gate them behind auth if they must stay online

### 6. Medium — Brand asset file route is intentionally public and cacheable

File:
- `apps/backend/src/routes/clients.ts`

Evidence:
- `GET /clients/brand-assets/file/:key` explicitly serves files with no auth
- the code comments say this is unauthenticated because “keys are opaque”
- files are served with `Cache-Control: public, max-age=31536000`

Impact:
- if a brand asset URL leaks through logs, screenshots, copied links, emails, browser history, or third-party tools, the file remains publicly retrievable
- long cache lifetime makes accidental exposure harder to retract
- this may expose client logos, guidelines PDFs, and reference assets outside the intended audience

Recommended fix:
- prefer signed short-lived URLs or authenticated download endpoints
- if public delivery is required, separate “safe-to-publish” assets from sensitive brand files

### 7. Medium — Backend runtime image contains the full application source tree

File:
- `apps/backend/Dockerfile`

Evidence:
- the runtime image copies `apps/backend` and `packages/shared`
- startup uses `ts-node/register/transpile-only` to run `./src/index.ts`

Impact:
- the production container contains readable source code, not just compiled artifacts
- this does not make the code public by itself
- but it increases the impact of any container breakout, file-serving bug, debug shell exposure, or accidental artifact publication

Recommended fix:
- build the backend to compiled output and ship only runtime artifacts
- avoid shipping the full source tree when it is not operationally necessary

### 8. Confirmed Non-Finding — No obvious production source maps are enabled

Files reviewed:
- `apps/web/next.config.mjs`
- `apps/web-cliente/next.config.mjs`
- `apps/web-freelancer/next.config.mjs`

Evidence:
- no `productionBrowserSourceMaps`
- no explicit source map upload configuration
- no custom `devtool` enabling production source maps

Interpretation:
- based on the current app configs, I do not see an obvious “frontend source leaked via source maps” path
- this is good news relative to the Anthropic-style scenario

### 9. Confirmed Non-Finding — Main web runtime image ships build output, not app source

File:
- `apps/web/Dockerfile`

Evidence:
- the final web image copies:
  - `.next`
  - `public`
  - `package.json`
  - `node_modules`
- it does not copy the app source tree into the final runtime layer

Interpretation:
- the main Next.js web app is not obviously publishing its source through the container image layout itself
- the bigger risk on the web side is the contents of `public/`, not the build artifact format

## Updated Remediation Order

1. Authenticate Gmail webhook requests
2. Authenticate Google Calendar webhook requests
3. Lock down `/metrics`
4. Remove or privatize `apps/web/public/ux/**`
5. Replace public brand-asset URLs with signed or authenticated delivery
6. Ship compiled backend runtime artifacts instead of the full source tree
7. Replace path-token-only auth for the universal inbound webhook
