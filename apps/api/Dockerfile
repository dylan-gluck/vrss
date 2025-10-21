# ==============================================================================
# VRSS Backend API Dockerfile - Optimized Development
# Build-time: Minimal setup only
# Runtime: Dependencies installed via volumes
# ==============================================================================

FROM oven/bun:1.1-alpine

# Install minimal runtime dependencies
RUN apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD curl -f http://localhost:3030/health || exit 1

EXPOSE 3030

# Simple entrypoint: ensure Prisma is generated on startup
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "dev"]
