FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget
RUN corepack enable || npm install -g pnpm@9
RUN npm install -g ts-node

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --filter "@edro/backend..." --prod --no-frozen-lockfile

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3333

CMD ["node", "-e", "require('ts-node/register/transpile-only'); require('./src/index.ts')"]
