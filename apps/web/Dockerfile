FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --filter "@edro/web..." --frozen-lockfile || pnpm install --filter "@edro/web..." --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
WORKDIR /app/apps/web
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
ENV PATH="/app/node_modules/.bin:/app/apps/web/node_modules/.bin:${PATH}"

EXPOSE 3333
CMD ["pnpm", "--dir", "apps/web", "start"]
