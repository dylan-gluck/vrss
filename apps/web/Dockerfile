# ==============================================================================
# VRSS Frontend PWA Dockerfile (Vite + React)
# Multi-stage build for development, production, and testing
# Uses Bun for workspace dependency support
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base - Security updates, Bun installation, and non-root user
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install security updates, required system packages, bash for Bun installer, and Bun
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl ca-certificates unzip bash && \
    rm -rf /var/cache/apk/*

# Create non-root user for security first
RUN adduser -S -D -H -u 1001 nodeuser && \
    mkdir -p /app && \
    chown -R nodeuser:nobody /app

# Install Bun globally so all users can access it
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun && \
    bun --version

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies - Install and cache dependencies with Bun
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copy root package.json for workspace configuration
COPY --chown=nodeuser:nobody ./package.json ./bun.lockb* ./

# Copy workspace packages
COPY --chown=nodeuser:nobody ./packages ./packages/

# Copy frontend app package.json (Bun needs this to install the workspace)
COPY --chown=nodeuser:nobody ./apps/web/package.json ./apps/web/

# Create minimal e2e directory to satisfy workspace config
RUN mkdir -p ./e2e && echo '{"name":"e2e","private":true}' > ./e2e/package.json

# Install all workspace dependencies from root (Bun understands workspace:*)
RUN bun install

# Change ownership of node_modules to nodeuser for Vite temp file writes
RUN chown -R nodeuser:nobody /app/node_modules /app/apps/web/node_modules 2>/dev/null || true

# Set working directory to frontend app
WORKDIR /app/apps/web

# ------------------------------------------------------------------------------
# Stage 3: Development - Hot module replacement (HMR)
# ------------------------------------------------------------------------------
FROM dependencies AS development

# Copy source code from apps/web (will be overridden by volume mount in development)
COPY --chown=nodeuser:nobody ./apps/web/src ./src
COPY --chown=nodeuser:nobody ./apps/web/test ./test
COPY --chown=nodeuser:nobody ./apps/web/public ./public/
COPY --chown=nodeuser:nobody ./apps/web/index.html ./
COPY --chown=nodeuser:nobody ./apps/web/vite.config.ts ./
COPY --chown=nodeuser:nobody ./apps/web/vitest.config.ts ./
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.json ./
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.node.json* ./

# Reinstall to fix any broken symlinks after copying files (as root for permissions)
RUN bun install && chown -R nodeuser:nobody /app/node_modules /app/apps/web/node_modules 2>/dev/null || true

# Switch to non-root user
USER nodeuser

# Expose Vite dev server port (dynamic from env)
EXPOSE 5050

# Health check (port will be from environment, defaulting to 5050)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD sh -c 'curl -f http://localhost:${FRONTEND_PORT:-5050} || exit 1'

# Run Vite dev server with HMR using Bun (host 0.0.0.0 to accept external connections)
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]

# ------------------------------------------------------------------------------
# Stage 4: Build - Compile and bundle for production
# ------------------------------------------------------------------------------
FROM dependencies AS builder

USER nodeuser

# Copy source code from apps/web
COPY --chown=nodeuser:nobody ./apps/web/src ./src
COPY --chown=nodeuser:nobody ./apps/web/public ./public/
COPY --chown=nodeuser:nobody ./apps/web/index.html ./
COPY --chown=nodeuser:nobody ./apps/web/vite.config.ts ./
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.json ./
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.node.json* ./
COPY --chown=nodeuser:nobody ./apps/web/tailwind.config.js* ./
COPY --chown=nodeuser:nobody ./apps/web/postcss.config.js* ./

# Build production bundle using Bun
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 5: Production - Serve with nginx
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
# Stage 6: Test - Run tests
# ------------------------------------------------------------------------------
FROM dependencies AS test

# Copy source code and test files from apps/web
COPY --chown=nodeuser:nobody ./apps/web/src ./src
COPY --chown=nodeuser:nobody ./apps/web/test ./test
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.json ./
COPY --chown=nodeuser:nobody ./apps/web/vite.config.ts ./
COPY --chown=nodeuser:nobody ./apps/web/vitest.config.ts ./
COPY --chown=nodeuser:nobody ./apps/web/tsconfig.node.json* ./

# Reinstall to fix any broken symlinks after copying files (as root for permissions)
RUN bun install && chown -R nodeuser:nobody /app/node_modules /app/apps/web/node_modules 2>/dev/null || true

# Switch to non-root user
USER nodeuser

# Run tests using Bun
CMD ["bun", "test"]
