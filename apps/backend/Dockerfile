FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache wget
RUN corepack enable || npm install -g pnpm@9
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --filter "@edro/backend..." --prod --no-frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache wget
RUN corepack enable || npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
WORKDIR /app/apps/backend
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
RUN corepack enable || npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/scripts ./apps/backend/scripts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3333

CMD ["pnpm", "start"]
