# ==============================================================================
# VRSS Frontend PWA Dockerfile - MVP Development
# Single-stage build optimized for fast local development with Bun + Vite
# ==============================================================================

FROM oven/bun:1.1-alpine

# Install minimal runtime dependencies
RUN apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb* ./
COPY packages ./packages/
COPY apps/web ./apps/web/

# Create dummy e2e workspace
RUN mkdir -p e2e && echo '{"name":"e2e","private":true}' > e2e/package.json

# Install dependencies (skip native builds we don't need)
RUN bun install --ignore-scripts && \
    cd packages/api-contracts && bun run build

WORKDIR /app/apps/web

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD curl -f http://localhost:5050 || exit 1

EXPOSE 5050

# Run Vite dev server with HMR
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]
