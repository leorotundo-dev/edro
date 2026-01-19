FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy AI package.json
COPY apps/ai/package.json ./apps/ai/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter "@edro/ai"

# Copy AI source
COPY apps/ai ./apps/ai

# Build (if needed)
WORKDIR /app/apps/ai
RUN pnpm run build || echo "No build script"

# Expose port
EXPOSE 3334
ENV PORT=3334
ENV NODE_ENV=production

# Start
CMD ["pnpm", "start"]
