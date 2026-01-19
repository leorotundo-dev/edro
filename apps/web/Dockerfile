FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Instala dependencias com lockfile do monorepo
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Build da aplicacao web (Next.js)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web ./apps/web
# Build apenas do web (e deps do workspace)
RUN pnpm run build:web

# Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
# Copia build e deps necessarios
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
ENV PATH="/app/node_modules/.bin:/app/apps/web/node_modules/.bin:${PATH}"

EXPOSE 3333
CMD ["pnpm", "--dir", "apps/web", "start"]
