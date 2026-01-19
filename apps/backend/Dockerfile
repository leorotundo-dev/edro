FROM node:20-alpine

WORKDIR /app

# Install pnpm so we follow the workspace lockfile
RUN corepack enable || npm install -g pnpm@9
# Ensure ts-node is available at runtime even if workspace install misses bin links
RUN npm install -g ts-node

# Ferramentas utilit├írias (curl) para healthchecks
RUN apk add --no-cache curl poppler-utils tesseract-ocr tesseract-ocr-data-por

# Copy workspace manifests first to improve cache usage and let pnpm see all workspaces
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend/package.json apps/backend/pnpm-lock.yaml ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/theme/package.json ./packages/theme/

# Install only the backend (and its deps) for production
# Using --no-frozen-lockfile to avoid build failures when lockfile drifts in CI
RUN pnpm install --filter "@edro/backend..." --prod --no-frozen-lockfile

# Bring the full source after deps are cached
COPY . .

WORKDIR /app/apps/backend

EXPOSE 8080

CMD ["node", "-e", "require('ts-node/register/transpile-only'); require('./src/index.ts')"]
