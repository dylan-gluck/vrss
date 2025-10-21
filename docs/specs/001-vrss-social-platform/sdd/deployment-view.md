# Deployment View

**Complete Documentation**: @docs/architecture/DEPLOYMENT_VIEW.md

## Container Architecture

**5-Service Docker Compose Setup**:
- **nginx**: Reverse proxy, SSL termination, static file serving, rate limiting (Port: 80/443)
- **api**: Bun + Hono backend with RPC procedures (Port: 3001, replicas: 1-N)
- **web**: React + Vite PWA frontend (Port: 3000, static build in production)
- **postgres**: PostgreSQL 16 database with persistence (Port: 5432)
- **minio**: S3-compatible local development storage (Port: 9000/9001, production uses AWS S3)

**Deployment Environments**:
- **Development**: Full docker-compose stack with hot-reload volumes
- **Production**: nginx + API×N + PostgreSQL + external S3 (no MinIO)

## Environment Configuration

**40+ Critical Environment Variables** by service:
- **API**: `DATABASE_URL`, `S3_*` (access key, secret, bucket, endpoint), `BETTER_AUTH_SECRET`, `SESSION_EXPIRES_IN`, `CORS_ORIGIN`, rate limits, file upload limits
- **Web**: `VITE_API_URL`, `VITE_WS_URL`, feature flags, analytics keys
- **PostgreSQL**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, connection pool settings
- **NGINX**: SSL certificates, rate limiting, proxy timeouts

Complete environment variable specifications with development and production examples in DEPLOYMENT_VIEW.md.

## Service Dependencies and Startup Order

**4-Phase Startup Sequence**:
1. **Data Layer**: PostgreSQL (health: `pg_isready`)
2. **Storage Layer**: MinIO/S3 (health: `/minio/health/live`)
3. **Application Layer**: API (health: `/health/ready`, depends on PostgreSQL + S3)
4. **Frontend Layer**: Web (depends on API)
5. **Proxy Layer**: nginx (depends on API + Web)

Docker Compose `depends_on` with health check conditions ensure correct startup order.

## Performance Configuration

**Database Connection Pooling**:
```
Pool Size = ((Core Count × 2) + Effective Spindle Count)
Development: min=5, max=10
Production: min=10, max=20
```

**Caching Strategy**:
- Browser cache: Static assets (1 year), API responses (varies by endpoint)
- CDN cache: Media files via CloudFront (1 week TTL)
- Redis cache (post-MVP): Hot feed data, session store

**Resource Limits** (per container):
- Development: API (512MB/0.5 CPU), Web (256MB/0.25 CPU), PostgreSQL (1GB/1 CPU)
- Production: API (2GB/2 CPU), PostgreSQL (4GB/4 CPU), scaled horizontally

## Health Checks and Deployment Orchestration

**Health Endpoints**:
- `/health` - Liveness probe (API responding)
- `/health/ready` - Readiness probe (database + S3 connected)
- `/health/status` - Detailed status (database latency, S3 connectivity, version)

**Zero-Downtime Deployment** (Production):
1. Deploy new API container (doesn't receive traffic yet)
2. Health check passes → nginx adds to upstream pool
3. Graceful shutdown of old container (finish in-flight requests)
4. Remove old container from pool

**Rollback Strategy**: Keep previous Docker image, redeploy with `docker-compose up -d --no-deps api`
