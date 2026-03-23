# Security Hardening Analysis - Edro Digital

## Executive Summary

The current system can be significantly hardened, but it is not realistic to claim any internet-facing platform can become "completely immune" to attacks. The practical target should be a defense-in-depth architecture that assumes controls will fail independently and limits blast radius when they do.

Across the Edro admin portal, freelancer portal, client portal, and backend APIs, the largest risks today are:

1. Browser-accessible auth tokens and client-side-only portal protection.
2. Inconsistent authorization on backend routes, especially administrative and tenant-wide endpoints.
3. Public webhooks and integration callbacks without strong authenticity verification.
4. Missing platform-level hardening such as CSP, cookie-based sessions, edge protections, and centralized security headers.
5. Weak security operations posture: quality gates, dependency governance, secret hygiene, monitoring, and incident response are not strong enough for a hardened production environment.

The sections below describe what must be implemented to move the system toward an enterprise-grade security posture.

## Critical Findings

### SEC-001 - Browser-stored auth tokens must be replaced with server-managed session cookies

Severity: Critical

Impact: Any XSS in any portal can immediately exfiltrate auth tokens for admin, freelancer, or client accounts.

Evidence:

- `apps/web-cliente/lib/api.ts` stores the client token in localStorage.
- `apps/web-freelancer/lib/api.ts` stores the freelancer token in localStorage.
- `apps/web/components` and frontend API patterns rely on browser-managed bearer tokens for authenticated requests.

What must be done:

1. Replace `localStorage` bearer-token auth with server-set cookies using `HttpOnly`, `Secure` in production, and `SameSite=Lax` or stricter.
2. Move session verification to the server boundary, not just client layout code.
3. Add session rotation on login, privilege change, passwordless verification, and refresh.
4. Store refresh/session state server-side with revocation support and replay detection.
5. Separate session scopes between admin/staff, freelancer, and client portals.

Applies to:

- Edro admin portal
- Freelancer portal
- Client portal

### SEC-002 - All portals need real server-side route protection

Severity: Critical

Impact: Client-only auth checks are not a real security boundary; protected routes and data endpoints remain reachable by direct requests if the backend is not consistently enforcing access.

Evidence:

- `apps/web-cliente/middleware.ts` is effectively disabled.
- `apps/web-freelancer/middleware.ts` is effectively disabled.
- Portal shells currently redirect in the browser after reading localStorage.

What must be done:

1. Implement real middleware/proxy auth for each Next.js frontend where applicable.
2. Enforce session validation on the backend for every protected API route.
3. Enforce resource-level authorization server-side for every client, job, report, connector, calendar, and briefing access.
4. Create explicit access models:
   - Edro portal: role + tenant + client scope
   - Freelancer portal: freelancer identity + allowed jobs + allowed financial records
   - Client portal: client identity + allowed approvals + allowed invoices + allowed reports
5. Add integration tests that assert unauthorized users cannot access every sensitive route.

### SEC-003 - Administrative routes must be restricted by role, tenant, and resource scope

Severity: Critical

Impact: Tenant members with insufficient privilege can currently reach tenant-wide or cross-tenant operational functions.

Evidence:

- Several `/admin/*` routes rely only on `authGuard + tenantGuard`, without strong admin permission enforcement.
- Some triggered jobs operate globally rather than being constrained to the current tenant.

What must be done:

1. Define a single authorization matrix for all route families.
2. Require explicit `admin:*` or equivalent permission for every administrative endpoint.
3. Require `requireClientPerm(...)` or equivalent resource checks for every client-bound route.
4. Audit all background job triggers so a tenant-triggered request cannot process global data.
5. Add negative authorization tests for:
   - viewer accessing manager route
   - manager accessing platform-admin route
   - one client-scoped user reading another client's data
   - one tenant affecting another tenant

### SEC-004 - Public webhook and OAuth callback flows need strong authenticity guarantees

Severity: Critical

Impact: Forged webhook traffic can create false messages, fake briefings, polluted analytics, unauthorized automation, and external account hijacking.

Evidence:

- Evolution, Instagram, and WhatsApp webhook endpoints accept public POST traffic without strong signature verification.
- OAuth state/session handling is partly in memory and exposes sensitive metadata to the browser.

What must be done:

1. Require signature verification for every webhook that supports it.
2. For providers that do not sign events, enforce additional compensating controls:
   - IP allowlists where stable
   - high-entropy shared secret
   - replay window and nonce/idempotency store
   - strict schema validation
3. Never expose third-party access tokens to the browser.
4. Bind OAuth state and completion to the same authenticated tenant/user context.
5. Store OAuth transient state in a secure shared store with TTL, one-time use, and tenant/user binding.
6. Add webhook abuse throttling and dead-letter queues.

## High-Priority Hardening Work

### SEC-005 - Add browser hardening headers and CSP across all portals

Severity: High

Why it matters:

The portals currently rely too heavily on framework defaults. A hardened portal must assume that one rendering bug or unsafe third-party script can become credential theft.

What must be done:

1. Add a production CSP for all three frontends.
2. Add `frame-ancestors 'none'` or allowlist only required origins.
3. Add `X-Content-Type-Options: nosniff`.
4. Add `Referrer-Policy: strict-origin-when-cross-origin` or stricter.
5. Add a constrained `Permissions-Policy`.
6. Remove or justify any need for `unsafe-inline` or `unsafe-eval`.
7. Consider Trusted Types for the admin portal because it is large and handles many data-heavy views.

Portal-specific note:

- The Edro admin portal should have the strictest CSP because compromise there has the largest blast radius.

### SEC-006 - Add CSRF protection wherever cookies are used

Severity: High

Why it matters:

Once auth moves to cookies, every state-changing route must be protected against cross-site request forgery.

What must be done:

1. Adopt anti-CSRF tokens for POST/PUT/PATCH/DELETE.
2. Enforce Origin/Referer validation as defense in depth.
3. Keep session cookies `SameSite=Lax` or stricter unless a specific flow requires `None`.
4. Ensure logout, approval, billing, connector changes, and workflow mutations all require valid anti-CSRF proof.

### SEC-007 - Protect against XSS across rich UI surfaces

Severity: High

Why it matters:

With three portals and a large admin surface, any XSS becomes an account takeover and data exfiltration problem.

What must be done:

1. Inventory all uses of:
   - `dangerouslySetInnerHTML`
   - `innerHTML`
   - raw HTML rendering from APIs/CMS/AI outputs
   - dynamic URL injection into `href`, `src`, or navigation
2. Sanitize any rich HTML with a vetted sanitizer such as DOMPurify.
3. Validate all redirect targets and user-supplied URLs.
4. Ban new unsafe DOM sinks in code review and CI.
5. Add CSP report-only first, then enforce after violations are fixed.

### SEC-008 - Harden passwordless and OTP login flows

Severity: High

Why it matters:

Email OTP and magic-link flows are sensitive because they are remote login surfaces.

What must be done:

1. Do not echo codes outside tightly controlled development environments.
2. Remove any auto-provisioning shortcuts that can escalate privilege or assign admin access.
3. Rate-limit by IP, email, tenant, and device fingerprint where possible.
4. Add brute-force protection and lockout/backoff.
5. Log all auth events with anomaly detection:
   - repeated invalid codes
   - impossible geography
   - rapid multi-account requests
   - unusual portal switching
6. Bind OTPs to context when practical:
   - email
   - role/portal
   - short TTL
   - single use

### SEC-009 - Implement proper tenancy isolation in data, jobs, and storage

Severity: High

Why it matters:

This platform is multi-tenant. A hardened multi-tenant system must assume every missing tenant filter is a possible data breach.

What must be done:

1. Audit every table and route for `tenant_id` enforcement.
2. Ensure no shared configuration table can be modified globally when it should be tenant-scoped.
3. Scope every background job trigger to the current tenant unless the trigger is reserved to platform operators only.
4. Namespace storage paths, queues, cache keys, and search indexes by tenant.
5. Add automated tests for cross-tenant isolation.
6. Add database constraints and policies that reduce the chance of programmer error.

Recommended direction:

- Consider PostgreSQL Row-Level Security for the highest-risk data domains, or at minimum a strict repository/data-access layer that makes tenant filters unavoidable.

## Medium-Priority Platform Controls

### SEC-010 - Add robust edge and infrastructure protection

Severity: Medium

What must be done:

1. Put all public traffic behind a reverse proxy / edge security layer.
2. Add WAF rules for:
   - credential stuffing
   - common injection payloads
   - abusive bots
   - path scanning
   - webhook flooding
3. Add request size limits and header limits.
4. Add IP-based and user-based rate limits:
   - login
   - OTP verify
   - report generation
   - automation triggers
   - file upload
   - webhook intake
5. Separate internal admin-only control endpoints from public API ingress wherever possible.

### SEC-011 - Segregate environments and eliminate production fallbacks in frontend code

Severity: Medium

Why it matters:

Frontend code with production URL fallbacks can accidentally route test or local traffic into production systems.

What must be done:

1. Remove hardcoded production backend fallbacks from browser code.
2. Ensure each environment has explicit frontend-to-backend routing configuration.
3. Forbid local or preview builds from talking to production unless explicitly approved.
4. Add CI checks that block production domains from being hardcoded in app code.

### SEC-012 - Tighten file upload and document handling

Severity: Medium

What must be done:

1. Validate MIME type and content, not just extension.
2. Store files outside any direct static web root.
3. Force download disposition for risky file types.
4. Virus-scan or malware-scan uploads where business-critical.
5. Randomize storage keys and separate metadata from file path.
6. Restrict who can access generated reports, invoices, and media assets.

### SEC-013 - Outbound request hardening and SSRF controls

Severity: Medium

What must be done:

1. Audit all backend `fetch`/HTTP client calls whose destination can be influenced by request data or external payloads.
2. Block access to:
   - localhost
   - RFC1918 private ranges
   - link-local ranges
   - cloud metadata endpoints
3. Use allowlists for integration targets where feasible.
4. Add timeouts, redirect limits, and response size limits.

### SEC-014 - Logging, monitoring, and forensics readiness

Severity: Medium

What must be done:

1. Centralize structured security logging.
2. Never log secrets, auth tokens, or raw sensitive payloads unless redacted.
3. Log and alert on:
   - repeated auth failures
   - permission denials
   - webhook verification failures
   - unusual admin activity
   - mass export/report generation
   - connector changes
   - token/session revocations
4. Correlate logs by request ID, user ID, tenant ID, and IP.
5. Retain audit trails long enough for investigation.

## Security Operations and SDLC Work

### SEC-015 - Security quality gates must become mandatory

Severity: Medium

What must be done:

1. Fix the current lint/test/build situation so security regressions are not silently shipped.
2. Make CI fail on:
   - type errors
   - test failures
   - lint failures
   - dependency vulnerability thresholds
   - secret scanning hits
3. Add SAST and dependency scanning.
4. Add DAST or authenticated smoke-security checks for the portals.
5. Add policy checks for dangerous patterns:
   - localStorage auth token usage
   - missing webhook signature verification
   - missing auth on new route handlers
   - `dangerouslySetInnerHTML`
   - open redirect patterns

### SEC-016 - Secret management and key rotation need to be formalized

Severity: Medium

What must be done:

1. Move secrets to managed secret storage if not already done.
2. Rotate any leaked or browser-exposed tokens immediately.
3. Define rotation cadence for:
   - JWT/session signing keys
   - master encryption keys
   - SMTP/API provider tokens
   - webhook secrets
   - OAuth client secrets
4. Separate secrets by environment and by least privilege.
5. Add secret scanning pre-commit and in CI.

### SEC-017 - Dependency and supply-chain hygiene

Severity: Medium

What must be done:

1. Enforce lockfile-based reproducible installs.
2. Audit Next.js, React, and backend dependency versions against supported and patched releases.
3. Remove unnecessary packages and old build artifacts from the attack surface.
4. Review install scripts and transitive dependencies for high-risk packages.
5. Introduce a monthly dependency review cadence and an emergency patch path for security advisories.

## Portal-Specific Security Requirements

### Edro Admin Portal

This portal needs the highest security level.

Required controls:

1. Strongest session posture with server-managed cookie sessions.
2. MFA or step-up verification for:
   - admin logins
   - connector changes
   - financial actions
   - role changes
   - secret regeneration
3. Tight role-based access control and client scoping.
4. Session anomaly detection and forced re-auth for high-risk actions.
5. CSP and XSS defenses prioritized here first.

### Freelancer Portal

Required controls:

1. Cookie session, not browser token storage.
2. Strict job ownership enforcement.
3. Financial/billing views limited to the freelancer's own records.
4. No ability to infer other freelancers' workload, invoices, or assignments unless explicitly authorized.
5. Anti-automation throttling on onboarding, login, and upload flows.

### Client Portal

Required controls:

1. Cookie session, not browser token storage.
2. Client identity must only access its own jobs, invoices, approvals, and reports.
3. Approval links/tokens must be:
   - short-lived
   - one-time where feasible
   - resource-scoped
   - revocable
4. Report and invoice downloads must require authorization and non-guessable identifiers.
5. Extra care around phishing-resistant login and redirect validation.

## Target State Architecture

To get close to a "fully hardened" posture, the system should converge on this model:

1. Public traffic enters through edge protection and WAF.
2. Next.js frontends use secure server-managed sessions with cookies.
3. Backend Fastify API enforces authn/authz on every protected route.
4. Tenant and resource scoping are mandatory and test-covered.
5. Webhooks are verified, replay-protected, and rate-limited.
6. Sensitive integrations never expose third-party tokens to the browser.
7. Browsers receive strong security headers and CSP.
8. CI blocks insecure patterns from shipping.
9. Monitoring detects abuse quickly and supports incident response.
10. Secrets are rotated and never embedded in frontend bundles.

## Recommended Rollout Order

### Phase 1 - Immediate risk reduction

1. Remove or lock down unsafe public admin/debug endpoints.
2. Lock all admin routes behind explicit admin permissions.
3. Fix webhook authenticity verification.
4. Remove browser token storage from all portals and move to cookie sessions.
5. Remove production hardcoded frontend fallbacks.

### Phase 2 - Core platform hardening

1. Add CSRF protection.
2. Add CSP and baseline security headers.
3. Enforce tenant/resource authorization consistently.
4. Fix cross-tenant/global job trigger behavior.
5. Add rate limits and edge protections.

### Phase 3 - Security maturity

1. Add MFA / step-up auth for admin operations.
2. Add SAST, DAST, dependency scanning, and secret scanning in CI.
3. Add security telemetry and alerting.
4. Add incident response runbooks and key rotation playbooks.
5. Commission an external penetration test after the first two phases land.

## Residual Reality Check

No system is ever "completely blindado" against attacks. The achievable goal is:

- prevent the most common attack classes by default,
- make privilege escalation and tenant breakout difficult,
- make XSS/CSRF/session theft materially harder,
- reduce the impact of a single bug,
- detect abuse quickly,
- recover fast if something slips through.

That is the correct security target for Edro, the freelancer portal, and the client portal.
