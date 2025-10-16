# Frontend Dockerfile - PWA (Vite + React/Vue/Svelte)
# Multi-stage build for optimized production images with security best practices

# =============================================================================
# Stage 1: Base - Common dependencies and security setup
# =============================================================================
FROM node:20-alpine AS base

# Install security updates and required tools
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
      curl \
      tini \
      ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nodeuser nodeuser

# Set working directory
WORKDIR /app

# =============================================================================
# Stage 2: Dependencies - Install and cache dependencies
# =============================================================================
FROM base AS dependencies

# Copy dependency files
COPY --chown=nodeuser:nodeuser package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Install all dependencies (including dev) for building
FROM base AS dev-dependencies
COPY --chown=nodeuser:nodeuser package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 3: Build - Build optimized production bundle
# =============================================================================
FROM dev-dependencies AS build

# Copy source code
COPY --chown=nodeuser:nodeuser . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000
ARG VITE_APP_NAME=VRSS
ARG VITE_APP_SHORT_NAME=VRSS
ARG VITE_APP_DESCRIPTION="A customizable social media platform"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SHORT_NAME=$VITE_APP_SHORT_NAME
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION

# Build the application
RUN npm run build

# Verify build artifacts exist
RUN test -d dist || (echo "Build failed: dist directory not found" && exit 1)

# =============================================================================
# Stage 4: Development - Hot reload and development tools
# =============================================================================
FROM base AS development

# Copy all dependencies
COPY --from=dev-dependencies --chown=nodeuser:nodeuser /app/node_modules ./node_modules

# Copy package files
COPY --chown=nodeuser:nodeuser package.json package-lock.json* ./

# Create necessary directories
RUN mkdir -p /app/src /app/public && \
    chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Development command with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# =============================================================================
# Stage 5: Production (Nginx) - Serve static files with Nginx
# =============================================================================
FROM nginx:alpine AS production-nginx

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root nginx user
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# Stage 6: Production (Node) - Serve with Node.js (alternative to Nginx)
# =============================================================================
FROM base AS production-node

# Install serve package for static file serving
RUN npm install -g serve@14

# Copy built application from build stage
COPY --from=build --chown=nodeuser:nodeuser /app/dist ./dist

# Switch to non-root user
USER nodeuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]

# =============================================================================
# Stage 7: Test - For running tests in CI/CD
# =============================================================================
FROM dev-dependencies AS test

# Copy source code
COPY --chown=nodeuser:nodeuser . .

# Switch to non-root user
USER nodeuser

# Test command
CMD ["npm", "test"]

# =============================================================================
# Default target
# =============================================================================
# Default to development stage for docker-compose
FROM development AS default

# =============================================================================
# Metadata
# =============================================================================
LABEL maintainer="VRSS Team"
LABEL description="VRSS Social Platform Frontend PWA"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/vrss/vrss"
