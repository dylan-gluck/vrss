# ==============================================================================
# VRSS Backend API Dockerfile - MVP Development
# Single-stage build optimized for fast local development with Bun
# ==============================================================================

FROM oven/bun:1.1-alpine

# Install minimal runtime dependencies
RUN apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb* ./
COPY packages ./packages/
COPY apps/api ./apps/api/

# Create dummy e2e workspace
RUN mkdir -p e2e && echo '{"name":"e2e","private":true}' > e2e/package.json

# Install dependencies (skip native builds we don't need)
RUN bun install --ignore-scripts && \
    cd packages/api-contracts && bun run build

# Generate Prisma client
WORKDIR /app/apps/api
RUN bunx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD curl -f http://localhost:3030/health || exit 1

EXPOSE 3030

# Run with watch mode for hot reload
CMD ["bun", "run", "dev"]
