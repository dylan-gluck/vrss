# ==============================================================================
# VRSS Frontend PWA Dockerfile (Vite + React)
# Multi-stage build for development, production, and testing
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base - Security updates and non-root user
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install security updates and required system packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN adduser -S -D -H -u 1001 nodeuser && \
    mkdir -p /app && \
    chown -R nodeuser:nobody /app

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies - Install and cache dependencies
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copy package files
COPY --chown=nodeuser:nobody package.json package-lock.json* ./

# Install dependencies (use install if no lockfile exists)
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# ------------------------------------------------------------------------------
# Stage 3: Development - Hot module replacement (HMR)
# ------------------------------------------------------------------------------
FROM dependencies AS development

USER nodeuser

# Copy source code (will be overridden by volume mount in development)
COPY --chown=nodeuser:nobody src ./src
COPY --chown=nodeuser:nobody public* ./public/
COPY --chown=nodeuser:nobody index.html ./
COPY --chown=nodeuser:nobody vite.config.ts ./
COPY --chown=nodeuser:nobody tsconfig.json ./
COPY --chown=nodeuser:nobody tsconfig.node.json* ./

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:5173 || exit 1

# Run Vite dev server with HMR (host 0.0.0.0 to accept external connections)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ------------------------------------------------------------------------------
# Stage 4: Build - Compile and bundle for production
# ------------------------------------------------------------------------------
FROM dependencies AS builder

USER nodeuser

# Copy source code
COPY --chown=nodeuser:nobody src ./src
COPY --chown=nodeuser:nobody public* ./public/
COPY --chown=nodeuser:nobody index.html ./
COPY --chown=nodeuser:nobody vite.config.ts ./
COPY --chown=nodeuser:nobody tsconfig.json ./
COPY --chown=nodeuser:nobody tsconfig.node.json* ./
COPY --chown=nodeuser:nobody tailwind.config.js* ./
COPY --chown=nodeuser:nobody postcss.config.js* ./

# Build production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 5: Production - Serve with nginx
# ------------------------------------------------------------------------------
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY --from=builder /app/dist /usr/share/nginx/html

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

USER nodeuser

# Copy source code and test files
COPY --chown=nodeuser:nobody src ./src
COPY --chown=nodeuser:nobody tsconfig.json ./
COPY --chown=nodeuser:nobody vite.config.ts ./
COPY --chown=nodeuser:nobody tsconfig.node.json* ./

# Run tests
CMD ["npm", "test"]
