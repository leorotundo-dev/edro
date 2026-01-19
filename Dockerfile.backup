# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install dependencies
RUN npm install

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Expose port
EXPOSE 3333

# Set working directory to backend
WORKDIR /app/apps/backend

# Start the application
CMD ["node", "dist/index.js"]
