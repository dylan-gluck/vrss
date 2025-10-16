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

# Copy package files
COPY --chown=bunuser:nobody package.json ./
COPY --chown=bunuser:nobody bun.lockb* ./

# Install dependencies
RUN bun install

# ------------------------------------------------------------------------------
# Stage 3: Development - Hot reload with all dev tools
# ------------------------------------------------------------------------------
FROM dependencies AS development

USER bunuser

# Copy source code (will be overridden by volume mount in development)
COPY --chown=bunuser:nobody src ./src
COPY --chown=bunuser:nobody tsconfig.json ./

# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:3000/health || exit 1

# Run with --watch for hot reload
CMD ["bun", "run", "dev"]

# ------------------------------------------------------------------------------
# Stage 4: Build - Compile TypeScript for production
# ------------------------------------------------------------------------------
FROM dependencies AS builder

USER bunuser

# Copy source code
COPY --chown=bunuser:nobody src ./src
COPY --chown=bunuser:nobody tsconfig.json ./

# Build application
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 5: Production - Minimal image with only runtime dependencies
# ------------------------------------------------------------------------------
FROM base AS production

USER bunuser

# Copy only production dependencies
COPY --from=dependencies --chown=bunuser:nobody /app/node_modules ./node_modules
COPY --from=dependencies --chown=bunuser:nobody /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=bunuser:nobody /app/dist ./dist

# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD curl -f http://localhost:3000/health || exit 1

# Run production build
CMD ["bun", "run", "start"]

# ------------------------------------------------------------------------------
# Stage 6: Test - Isolated environment for running tests
# ------------------------------------------------------------------------------
FROM dependencies AS test

USER bunuser

# Copy source code and test files
COPY --chown=bunuser:nobody src ./src
COPY --chown=bunuser:nobody tsconfig.json ./

# Run tests
CMD ["bun", "test"]
