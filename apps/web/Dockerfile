# ==============================================================================
# VRSS Frontend PWA Dockerfile (Vite + React)
# Multi-stage build for development, production, and testing
# Uses Bun for workspace dependency support
# Optimized with Turbo prune for minimal build context
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
    mkdir -p /app && \
    chown -R bunuser:nobody /app

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies - Install and cache dependencies with Bun
# ------------------------------------------------------------------------------
FROM base AS dependencies

WORKDIR /app

# Copy workspace structure for dependency resolution
COPY --chown=bunuser:nobody ./package.json ./bun.lockb* ./
COPY --chown=bunuser:nobody ./packages ./packages/
COPY --chown=bunuser:nobody ./apps/web/package.json ./apps/web/

# Create empty e2e package.json to satisfy workspace structure
RUN mkdir -p ./e2e && echo '{"name":"e2e","private":true}' > ./e2e/package.json

# Install all workspace dependencies (Bun handles workspace: protocol)
RUN bun install

# Build api-contracts package
RUN cd /app/packages/api-contracts && bun run build

# Change ownership of node_modules to bunuser for Vite temp file writes
RUN chown -R bunuser:nobody /app/node_modules /app/apps/web/node_modules 2>/dev/null || true

# Set working directory to frontend app
WORKDIR /app/apps/web

# ------------------------------------------------------------------------------
# Stage 3: Source - Copy application source code
# ------------------------------------------------------------------------------
FROM dependencies AS source

WORKDIR /app/apps/web

# Copy application source code and configuration
COPY --chown=bunuser:nobody ./apps/web/src ./src
COPY --chown=bunuser:nobody ./apps/web/test ./test
COPY --chown=bunuser:nobody ./apps/web/public ./public/
COPY --chown=bunuser:nobody ./apps/web/index.html ./
COPY --chown=bunuser:nobody ./apps/web/vite.config.ts ./
COPY --chown=bunuser:nobody ./apps/web/vitest.config.ts ./
COPY --chown=bunuser:nobody ./apps/web/tsconfig.json ./
COPY --chown=bunuser:nobody ./apps/web/tsconfig.node.json* ./
COPY --chown=bunuser:nobody ./apps/web/tailwind.config.js* ./
COPY --chown=bunuser:nobody ./apps/web/postcss.config.js* ./
COPY --chown=bunuser:nobody ./apps/web/components.json* ./

# Create symlink to workspace node_modules for module resolution
WORKDIR /app/apps/web
RUN ln -sf /app/node_modules ./node_modules && chown -R bunuser:nobody /app/node_modules 2>/dev/null || true

# ------------------------------------------------------------------------------
# Stage 5: Development - Hot module replacement (HMR)
# ------------------------------------------------------------------------------
FROM source AS development

# Switch to non-root user
USER bunuser

# Expose Vite dev server port (dynamic from env)
EXPOSE 5050

# Health check (port will be from environment, defaulting to 5050)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD sh -c 'curl -f http://localhost:${FRONTEND_PORT:-5050} || exit 1'

# Run Vite dev server with HMR using Bun (host 0.0.0.0 to accept external connections)
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]

# ------------------------------------------------------------------------------
# Stage 6: Build - Compile and bundle for production
# ------------------------------------------------------------------------------
FROM source AS builder

USER bunuser

# Build production bundle using Bun
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 7: Production - Serve with nginx
# ------------------------------------------------------------------------------
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Create custom nginx config for SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose nginx port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ------------------------------------------------------------------------------
# Stage 8: Test - Run tests
# ------------------------------------------------------------------------------
FROM source AS test

# Switch to non-root user
USER bunuser

# Run tests using Bun
CMD ["bun", "test"]
