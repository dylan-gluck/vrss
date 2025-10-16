# Backend Dockerfile - Bun + Hono API
# Multi-stage build for optimized production images with security best practices

# =============================================================================
# Stage 1: Base - Common dependencies and security setup
# =============================================================================
FROM oven/bun:1.1-alpine AS base

# Install security updates and required tools
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
      curl \
      tini \
      ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bunuser bunuser

# Set working directory
WORKDIR /app

# =============================================================================
# Stage 2: Dependencies - Install and cache dependencies
# =============================================================================
FROM base AS dependencies

# Copy dependency files
COPY --chown=bunuser:bunuser package.json bun.lockb ./

# Install production dependencies
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

# Install all dependencies (including dev) for building
FROM base AS dev-dependencies
COPY --chown=bunuser:bunuser package.json bun.lockb ./
RUN bun install --frozen-lockfile

# =============================================================================
# Stage 3: Build - Compile TypeScript and prepare application
# =============================================================================
FROM dev-dependencies AS build

# Copy source code
COPY --chown=bunuser:bunuser . .

# Build the application (compile TypeScript)
RUN bun run build

# Verify build artifacts exist
RUN test -d dist || (echo "Build failed: dist directory not found" && exit 1)

# =============================================================================
# Stage 4: Development - Hot reload and development tools
# =============================================================================
FROM base AS development

# Copy all dependencies
COPY --from=dev-dependencies --chown=bunuser:bunuser /app/node_modules ./node_modules

# Copy package.json for scripts
COPY --chown=bunuser:bunuser package.json bun.lockb ./

# Create necessary directories
RUN mkdir -p /app/src /app/storage/media /app/logs && \
    chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Development command with hot reload
CMD ["bun", "run", "dev"]

# =============================================================================
# Stage 5: Production - Minimal production image
# =============================================================================
FROM base AS production

# Copy production dependencies only
COPY --from=dependencies --chown=bunuser:bunuser /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=bunuser:bunuser /app/dist ./dist
COPY --from=build --chown=bunuser:bunuser /app/package.json ./

# Copy database migrations (if separate from build)
COPY --chown=bunuser:bunuser migrations ./migrations

# Create necessary directories with proper permissions
RUN mkdir -p /app/storage/media /app/logs && \
    chown -R bunuser:bunuser /app && \
    chmod 750 /app/storage /app/logs

# Switch to non-root user
USER bunuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Production command
CMD ["bun", "run", "start"]

# =============================================================================
# Stage 6: Test - For running tests in CI/CD
# =============================================================================
FROM dev-dependencies AS test

# Copy source code
COPY --chown=bunuser:bunuser . .

# Switch to non-root user
USER bunuser

# Test command
CMD ["bun", "test"]

# =============================================================================
# Metadata
# =============================================================================
LABEL maintainer="VRSS Team"
LABEL description="VRSS Social Platform Backend API"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/vrss/vrss"
