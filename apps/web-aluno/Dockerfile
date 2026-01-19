# ===================================
# Multi-stage Dockerfile for Next.js (web-aluno)
# Optimized for production deployment with Sentry sourcemaps
# ===================================

# =========
# Stage 1: Dependencies
# =========
FROM node:18-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace and package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/
COPY apps/web-aluno/package.json ./apps/web-aluno/

# Install dependencies for the app and its internal packages
RUN pnpm install --filter "@edro/web-aluno..." --frozen-lockfile || pnpm install --filter "@edro/web-aluno..." --no-frozen-lockfile
RUN pnpm install --filter "@edro/ui..." --frozen-lockfile || pnpm install --filter "@edro/ui..." --no-frozen-lockfile
RUN pnpm install --filter "@edro/shared..." --frozen-lockfile || pnpm install --filter "@edro/shared..." --no-frozen-lockfile

# =========
# Stage 2: Builder
# =========
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm and sentry-cli (for releases/sourcemaps)
RUN npm install -g pnpm@9 @sentry/cli

# Sentry build-time configuration (passed as build args by Railway)
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web-aluno/node_modules ./apps/web-aluno/node_modules

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/
COPY apps/web-aluno/package.json ./apps/web-aluno/

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/theme ./packages/theme
COPY apps/web-aluno ./apps/web-aluno

# Install all deps (includes dev deps/binaries like tailwindcss)
WORKDIR /app
RUN pnpm install --prod=false --no-frozen-lockfile

# Build shared package (if any)
WORKDIR /app/packages/shared
RUN pnpm run build 2>/dev/null || echo "Shared package has no build step"

# Build UI package
WORKDIR /app/packages/ui
RUN pnpm run build

# Build Next.js app
WORKDIR /app/apps/web-aluno
RUN pnpm run build

# Upload sourcemaps to Sentry (optional, requires SENTRY_AUTH_TOKEN)
RUN chmod +x ./scripts/upload-sentry.sh && ./scripts/upload-sentry.sh

# =========
# Stage 3: Production Runtime
# =========
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/
COPY apps/web-aluno/package.json ./apps/web-aluno/

# Copy dependencies from deps stage (production only)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/apps/web-aluno/node_modules ./apps/web-aluno/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-aluno/.next ./apps/web-aluno/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-aluno/public ./apps/web-aluno/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/ui/dist ./packages/ui/dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/theme ./packages/theme

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 8080

# Switch to non-root user
USER nextjs

# Set working directory to web app
WORKDIR /app/apps/web-aluno

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8080; require('http').get('http://localhost:' + port, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js
CMD ["pnpm", "run", "start"]
