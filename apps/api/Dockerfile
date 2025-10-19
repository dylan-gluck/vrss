# ==============================================================================
# VRSS Backend API Dockerfile (Bun + Hono)
# Multi-stage build for development, production, and testing
# Optimized with Turbo prune for minimal build context
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base - Security updates and non-root user
# ------------------------------------------------------------------------------
FROM oven/bun:1.1-alpine AS base

# Install security updates and required system packages
# Include build tools for native modules (bcrypt, etc.)
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates \
        python3 \
        make \
        g++ \
        git && \
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

WORKDIR /app

# Copy workspace structure for dependency resolution
COPY --chown=bunuser:nobody ./package.json ./bun.lockb* ./
COPY --chown=bunuser:nobody ./packages ./packages/
COPY --chown=bunuser:nobody ./apps/api/package.json ./apps/api/
COPY --chown=bunuser:nobody ./apps/api/prisma ./apps/api/prisma

# Create empty e2e package.json to satisfy workspace structure
RUN mkdir -p ./e2e && echo '{"name":"e2e","private":true}' > ./e2e/package.json

# Install all workspace dependencies (Bun handles workspace: protocol)
RUN bun install

# Set working directory to backend app
WORKDIR /app/apps/api

# Generate Prisma client
RUN bunx prisma generate

# ------------------------------------------------------------------------------
# Stage 3: Source - Copy application source code
# ------------------------------------------------------------------------------
FROM dependencies AS source

WORKDIR /app/apps/api

# Copy application source code
COPY --chown=bunuser:nobody ./apps/api/src ./src
COPY --chown=bunuser:nobody ./apps/api/tsconfig.json ./
COPY --chown=bunuser:nobody ./apps/api/biome.json* ./
COPY --chown=bunuser:nobody ./apps/api/scripts ./scripts

# Ensure Prisma client is generated
RUN bunx prisma generate || true

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# ------------------------------------------------------------------------------
# Stage 5: Development - Hot reload with all dev tools
# ------------------------------------------------------------------------------
FROM source AS development

USER bunuser

# Expose backend port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD sh -c 'curl -f http://localhost:${BACKEND_PORT:-3030}/health || exit 1'

# Run startup script with dev command
ENTRYPOINT ["./scripts/start.sh"]
CMD ["bun", "run", "dev"]

# ------------------------------------------------------------------------------
# Stage 6: Build - Compile TypeScript for production
# ------------------------------------------------------------------------------
FROM source AS builder

USER bunuser

# Build application
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 7: Production - Minimal image with only runtime dependencies
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

# Copy scripts
COPY --from=source --chown=bunuser:nobody /app/apps/api/scripts ./scripts

# Copy Prisma schema for migrations
COPY --from=dependencies --chown=bunuser:nobody /app/apps/api/prisma ./prisma

# Expose backend port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD sh -c 'curl -f http://localhost:${BACKEND_PORT:-3030}/health || exit 1'

# Run startup script with production command
ENTRYPOINT ["./scripts/start.sh"]
CMD ["bun", "run", "start"]

# ------------------------------------------------------------------------------
# Stage 8: Test - Isolated environment for running tests
# ------------------------------------------------------------------------------
FROM source AS test

USER bunuser

# Run tests
CMD ["bun", "test"]
