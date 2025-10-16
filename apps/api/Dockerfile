# ==============================================================================
# VRSS Backend API Dockerfile (Bun + Hono)
# Multi-stage build for development, production, and testing
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base - Security updates and non-root user
# ------------------------------------------------------------------------------
FROM oven/bun:1.1-alpine AS base

# Install security updates and required system packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN adduser -S -D -H -u 1001 bunuser && \
    mkdir -p /app /app/storage/media /app/logs && \
    chown -R bunuser:nobody /app

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies - Install and cache dependencies
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copy root package.json for workspace configuration
COPY --chown=bunuser:nobody ./package.json ./bun.lockb* ./

# Copy workspace packages
COPY --chown=bunuser:nobody ./packages ./packages/

# Copy backend app package.json
COPY --chown=bunuser:nobody ./apps/api/package.json ./apps/api/

# Copy Prisma schema (needed for prisma generate)
COPY --chown=bunuser:nobody ./apps/api/prisma ./apps/api/prisma

# Create minimal e2e directory to satisfy workspace config
RUN mkdir -p ./e2e && echo '{"name":"e2e","private":true}' > ./e2e/package.json

# Install all workspace dependencies
RUN bun install

# Set working directory to backend app
WORKDIR /app/apps/api

# Generate Prisma client
RUN bunx prisma generate

# ------------------------------------------------------------------------------
# Stage 3: Development - Hot reload with all dev tools
# ------------------------------------------------------------------------------
FROM dependencies AS development

USER bunuser

# Copy source code from apps/api (will be overridden by volume mount in development)
COPY --chown=bunuser:nobody ./apps/api/src ./src
COPY --chown=bunuser:nobody ./apps/api/tsconfig.json ./
COPY --chown=bunuser:nobody ./apps/api/prisma ./prisma

# Expose backend port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD sh -c 'curl -f http://localhost:${BACKEND_PORT:-3030}/health || exit 1'

# Run with --watch for hot reload
CMD ["bun", "run", "dev"]

# ------------------------------------------------------------------------------
# Stage 4: Build - Compile TypeScript for production
# ------------------------------------------------------------------------------
FROM dependencies AS builder

USER bunuser

# Copy source code from apps/api
COPY --chown=bunuser:nobody ./apps/api/src ./src
COPY --chown=bunuser:nobody ./apps/api/tsconfig.json ./
COPY --chown=bunuser:nobody ./apps/api/prisma ./prisma

# Build application
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 5: Production - Minimal image with only runtime dependencies
# ------------------------------------------------------------------------------
FROM base AS production

USER bunuser

# Set working directory
WORKDIR /app/apps/api

# Copy only production dependencies
COPY --from=dependencies --chown=bunuser:nobody /app/node_modules ./node_modules
COPY --from=dependencies --chown=bunuser:nobody /app/apps/api/package.json ./package.json

# Copy built application
COPY --from=builder --chown=bunuser:nobody /app/apps/api/dist ./dist

# Expose backend port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD sh -c 'curl -f http://localhost:${BACKEND_PORT:-3030}/health || exit 1'

# Run production build
CMD ["bun", "run", "start"]

# ------------------------------------------------------------------------------
# Stage 6: Test - Isolated environment for running tests
# ------------------------------------------------------------------------------
FROM dependencies AS test

USER bunuser

# Copy source code and test files from apps/api
COPY --chown=bunuser:nobody ./apps/api/src ./src
COPY --chown=bunuser:nobody ./apps/api/test ./test
COPY --chown=bunuser:nobody ./apps/api/tsconfig.json ./
COPY --chown=bunuser:nobody ./apps/api/prisma ./prisma

# Run tests
CMD ["bun", "test"]
