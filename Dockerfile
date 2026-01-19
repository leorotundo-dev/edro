# ===================================
# Multi-stage Dockerfile for Admin Web (apps/web)
# Builds Next.js with pnpm workspaces and uploads Sentry sourcemaps
# ===================================

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY apps/scrapers/package.json ./apps/scrapers/

# Install dependencies for admin web + backend (and shared libs)
RUN pnpm install \
    --filter "@edro/web..." \
    --filter "@edro/backend..." \
    --filter "scrapers..." \
    --filter "@edro/shared..." \
    --filter "@edro/ui..." \
    --filter "@edro/theme..." \
    --frozen-lockfile \
  || pnpm install \
    --filter "@edro/web..." \
    --filter "@edro/backend..." \
    --filter "scrapers..." \
    --filter "@edro/shared..." \
    --filter "@edro/ui..." \
    --filter "@edro/theme..." \
    --no-frozen-lockfile

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9 @sentry/cli

# Sentry variables available during build (for @sentry/nextjs upload)
ARG SENTRY_RELEASE
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG=edro
ARG SENTRY_PROJECT=edro-prod
ARG SENTRY_UPLOAD_SOURCEMAPS=false
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV SENTRY_UPLOAD_SOURCEMAPS=${SENTRY_UPLOAD_SOURCEMAPS}

# Bring installed deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/theme/node_modules ./packages/theme/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy manifests and source
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/theme ./packages/theme
COPY apps/web ./apps/web
COPY apps/backend ./apps/backend
COPY apps/scrapers ./apps/scrapers
# Bring the rest of the workspace (guards against missing paths)
COPY . .

# Build shared libraries
WORKDIR /app/packages/shared
RUN pnpm run build 2>/dev/null || echo "Shared package has no build step"

WORKDIR /app/packages/ui
RUN pnpm run build

# Theme only ships assets (no build)

# Build the Next.js admin
WORKDIR /app/apps/web
RUN pnpm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@9 ts-node && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# workspace manifests
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/
COPY apps/web/package.json ./apps/web/
COPY apps/scrapers/package.json ./apps/scrapers/

# prod dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/packages/theme/node_modules ./packages/theme/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/apps/scrapers/node_modules ./apps/scrapers/node_modules

# built artifacts
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/ui/dist ./packages/ui/dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/theme ./packages/theme
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY apps/web/public ./apps/web/public
COPY apps/backend ./apps/backend
COPY apps/scrapers ./apps/scrapers

ENV NODE_ENV=production
ENV PORT=3333
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3333
USER nextjs
WORKDIR /app/apps/web

CMD ["sh", "-c", "if [ \"$SERVICE_ROLE\" = \"scrapers\" ]; then node /app/apps/scrapers/src/index.js; elif [ \"$SERVICE_ROLE\" = \"backend\" ]; then node -e \"require('ts-node/register/transpile-only'); require('/app/apps/backend/src/index.ts')\"; else pnpm run start; fi"]
