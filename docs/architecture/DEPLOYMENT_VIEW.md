# VRSS Deployment View

**Document Version**: 1.0
**Date**: 2025-10-16
**Status**: Design Specification

## Table of Contents

1. [Overview](#overview)
2. [Container Architecture](#container-architecture)
3. [Environment Configuration](#environment-configuration)
4. [Service Dependencies](#service-dependencies)
5. [Performance Configuration](#performance-configuration)
6. [Health Checks and Readiness](#health-checks-and-readiness)
7. [Deployment Orchestration](#deployment-orchestration)

---

## Overview

### Purpose

This document defines the **Deployment View** for the VRSS social platform MVP, specifying:

- Multi-container architecture with Docker Compose
- Required environment variables per service
- Service startup order and dependencies
- Performance configurations (connection pools, caching, resource limits)
- Health check and readiness probe specifications

### Deployment Strategy

**Development**: Docker Compose with hot-reload volumes
**Production**: Containerized deployment (Docker Compose on VPS or cloud platforms)

### Architecture Pattern

**Monolith with multi-container deployment**:
- Separation of concerns via containers
- Independent scaling paths
- Shared network for inter-service communication
- Volume persistence for data storage

---

## Container Architecture

### Service Overview

```yaml
services:
  nginx:
    description: Reverse proxy and load balancer
    ports:
      - "8080:80" (development)
      - "80:80, 443:443" (production)
    dependencies: [api, web]

  api:
    description: Backend RPC API (Bun + Hono)
    ports:
      - "3000:3000"
    dependencies: [postgres, minio]
    scaling: horizontal (multiple instances)

  web:
    description: Frontend PWA (React + Vite)
    ports:
      - "5173:5173" (development)
      - served via nginx (production)
    dependencies: [api]

  postgres:
    description: Primary database
    ports:
      - "5432:5432"
    dependencies: []

  minio:
    description: S3-compatible storage (development only)
    ports:
      - "9000:9000" (API)
      - "9001:9001" (Console)
    dependencies: []
```

### Container Network Topology

```
┌─────────────────────────────────────────────────────────┐
│                    vrss-network (bridge)                 │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │  nginx   │───▶│   api    │───▶│ postgres │         │
│  │  :8080   │    │  :3000   │    │  :5432   │         │
│  └────┬─────┘    └────┬─────┘    └──────────┘         │
│       │               │                                 │
│       ▼               ▼                                 │
│  ┌──────────┐    ┌──────────┐                          │
│  │   web    │    │  minio   │                          │
│  │  :5173   │    │ :9000/01 │                          │
│  └──────────┘    └──────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Volume Mounts

#### Development Environment

```yaml
volumes:
  # Source code hot-reload
  - ./apps/api/src:/app/apps/api/src:delegated
  - ./apps/web/src:/app/apps/web/src:delegated
  - ./packages:/app/packages:delegated

  # Persistent data
  - postgres_data:/var/lib/postgresql/data
  - minio_data:/data

  # Configuration
  - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

#### Production Environment

```yaml
volumes:
  # No source code mounts (immutable containers)

  # Persistent data
  - postgres_data:/var/lib/postgresql/data

  # Static assets (built frontend)
  - web_static:/usr/share/nginx/html

  # Configuration
  - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
  - ./certs:/etc/nginx/certs:ro
```

---

## Environment Configuration

### 1. NGINX Service

#### Development

```yaml
environment:
  # No environment variables needed for development
  # Configuration via mounted nginx.conf
```

#### Production

```yaml
environment:
  # SSL/TLS Configuration
  - SSL_CERTIFICATE_PATH=/etc/nginx/certs/fullchain.pem
  - SSL_CERTIFICATE_KEY_PATH=/etc/nginx/certs/privkey.pem

  # Optional: Rate limiting
  - RATE_LIMIT_ZONE=10m
  - RATE_LIMIT_REQUESTS=100r/m
```

---

### 2. API Service

#### Required Variables

```yaml
environment:
  # Runtime
  - NODE_ENV=development|production|test
  - PORT=3000

  # Database Connection
  - DATABASE_URL=postgresql://user:password@host:port/database
  - DATABASE_POOL_MIN=2
  - DATABASE_POOL_MAX=10
  - DATABASE_IDLE_TIMEOUT=20000
  - DATABASE_CONNECT_TIMEOUT=10000

  # S3 Storage
  - S3_ENDPOINT=http://minio:9000|https://s3.amazonaws.com
  - S3_ACCESS_KEY=minioadmin|<aws-access-key>
  - S3_SECRET_KEY=minioadmin|<aws-secret-key>
  - S3_BUCKET=vrss-media
  - S3_REGION=us-east-1
  - S3_PUBLIC_URL=http://localhost:9000|https://cdn.vrss.app

  # Authentication (Better-auth)
  - BETTER_AUTH_SECRET=<random-secret-min-32-chars>
  - BETTER_AUTH_URL=http://localhost:3000|https://api.vrss.app
  - BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8080,http://localhost:5173

  # Session Management
  - SESSION_SECRET=<random-secret-min-32-chars>
  - SESSION_MAX_AGE=2592000000  # 30 days in milliseconds
  - SESSION_SECURE=false|true    # true in production

  # CORS Configuration
  - CORS_ORIGIN=http://localhost:8080,http://localhost:5173|https://vrss.app
  - CORS_CREDENTIALS=true

  # Rate Limiting
  - RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
  - RATE_LIMIT_MAX_REQUESTS=100

  # File Upload
  - MAX_FILE_SIZE=52428800        # 50MB in bytes
  - ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,video/mp4,audio/mpeg

  # Storage Quotas
  - FREE_STORAGE_LIMIT=52428800   # 50MB
  - PAID_STORAGE_LIMIT=1073741824 # 1GB

  # Logging
  - LOG_LEVEL=debug|info|warn|error
  - LOG_FORMAT=json|pretty
```

#### Development Example

```bash
# .env.development
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://vrss:vrss_dev_password@postgres:5432/vrss_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=vrss-media
S3_REGION=us-east-1

BETTER_AUTH_SECRET=dev-secret-change-in-production-min-32-chars-long
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8080,http://localhost:5173

SESSION_SECRET=dev-session-secret-change-in-production
SESSION_MAX_AGE=2592000000
SESSION_SECURE=false

CORS_ORIGIN=http://localhost:8080,http://localhost:5173
CORS_CREDENTIALS=true

LOG_LEVEL=debug
LOG_FORMAT=pretty
```

#### Production Example

```bash
# .env.production (use secrets management)
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://vrss_prod:${DB_PASSWORD}@postgres:5432/vrss_prod
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=20000
DATABASE_CONNECT_TIMEOUT=10000

S3_ENDPOINT=https://s3.us-west-2.amazonaws.com
S3_ACCESS_KEY=${AWS_ACCESS_KEY_ID}
S3_SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=vrss-production-media
S3_REGION=us-west-2
S3_PUBLIC_URL=https://cdn.vrss.app

BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
BETTER_AUTH_URL=https://api.vrss.app
BETTER_AUTH_TRUSTED_ORIGINS=https://vrss.app,https://www.vrss.app

SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=2592000000
SESSION_SECURE=true

CORS_ORIGIN=https://vrss.app,https://www.vrss.app
CORS_CREDENTIALS=true

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
LOG_FORMAT=json
```

---

### 3. Web Service

#### Required Variables

```yaml
environment:
  # Build-time (for Vite)
  - VITE_API_URL=http://localhost:8080/api|https://api.vrss.app
  - VITE_APP_NAME=Vrss
  - VITE_APP_DOMAIN=vrss.app

  # PWA Configuration
  - VITE_PWA_ENABLED=true
  - VITE_PWA_NAME=Vrss Social
  - VITE_PWA_SHORT_NAME=Vrss
  - VITE_PWA_THEME_COLOR=#ffffff

  # Feature Flags (optional)
  - VITE_ENABLE_ANALYTICS=false|true
  - VITE_ENABLE_DEBUG=false|true
```

#### Development Example

```bash
# .env.development
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=Vrss
VITE_PWA_ENABLED=true
VITE_ENABLE_DEBUG=true
```

#### Production Example

```bash
# .env.production
VITE_API_URL=https://api.vrss.app
VITE_APP_NAME=Vrss
VITE_APP_DOMAIN=vrss.app
VITE_PWA_ENABLED=true
VITE_PWA_NAME=Vrss Social
VITE_PWA_SHORT_NAME=Vrss
VITE_PWA_THEME_COLOR=#ffffff
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

---

### 4. PostgreSQL Service

#### Required Variables

```yaml
environment:
  # Database Configuration
  - POSTGRES_USER=vrss
  - POSTGRES_PASSWORD=<secure-password>
  - POSTGRES_DB=vrss_dev|vrss_prod

  # Performance Tuning
  - POSTGRES_MAX_CONNECTIONS=100
  - POSTGRES_SHARED_BUFFERS=256MB
  - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
  - POSTGRES_WORK_MEM=16MB
  - POSTGRES_MAINTENANCE_WORK_MEM=64MB

  # Logging
  - POSTGRES_LOG_STATEMENT=none|ddl|mod|all
  - POSTGRES_LOG_MIN_DURATION_STATEMENT=1000  # Log queries > 1s
```

#### Development Example

```bash
POSTGRES_USER=vrss
POSTGRES_PASSWORD=vrss_dev_password
POSTGRES_DB=vrss_dev
POSTGRES_MAX_CONNECTIONS=50
```

#### Production Example

```bash
POSTGRES_USER=vrss
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=vrss_prod
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=512MB
POSTGRES_EFFECTIVE_CACHE_SIZE=2GB
POSTGRES_LOG_MIN_DURATION_STATEMENT=1000
```

---

### 5. MinIO Service (Development Only)

#### Required Variables

```yaml
environment:
  - MINIO_ROOT_USER=minioadmin
  - MINIO_ROOT_PASSWORD=minioadmin
  - MINIO_DOMAIN=localhost
  - MINIO_SERVER_URL=http://localhost:9000
  - MINIO_BROWSER_REDIRECT_URL=http://localhost:9001
```

**Production**: Use AWS S3 or S3-compatible service instead of MinIO.

---

## Service Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                 Startup Order                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. postgres     (no dependencies)                   │
│  2. minio        (no dependencies)                   │
│                                                      │
│  3. api          (depends on: postgres, minio)       │
│                                                      │
│  4. web          (depends on: api - implicit)        │
│                                                      │
│  5. nginx        (depends on: api, web)              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Dependency Configuration

#### Docker Compose Development

```yaml
services:
  postgres:
    # No dependencies
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vrss"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  minio:
    # No dependencies
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 30s

  api:
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  web:
    depends_on:
      - api
    # No explicit health check in development (Vite dev server)

  nginx:
    depends_on:
      - api
      - web
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

#### Docker Compose Production

```yaml
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  api:
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    deploy:
      replicas: 2  # Multiple instances for load balancing
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  nginx:
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

### Startup Sequence

**Phase 1: Data Layer (parallel)**
```bash
# Start database and storage simultaneously
docker-compose up -d postgres minio

# Wait for health checks
docker-compose ps
```

**Phase 2: Application Layer**
```bash
# Start API (waits for postgres health check)
docker-compose up -d api

# Wait for API health check
curl http://localhost:3000/health
```

**Phase 3: Frontend Layer (development)**
```bash
# Start web dev server
docker-compose up -d web
```

**Phase 4: Proxy Layer**
```bash
# Start reverse proxy
docker-compose up -d nginx

# Verify all services
curl http://localhost:8080/health
```

**Automated Startup** (recommended):
```bash
# Single command with dependency orchestration
docker-compose up -d

# Docker Compose handles dependency order automatically
```

---

## Performance Configuration

### 1. Database Connection Pooling

#### API Service Configuration

```typescript
// apps/api/src/lib/db.ts
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

const poolConfig = {
  // Connection pool size
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),

  // Timeouts
  idle_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '20'), // seconds
  connect_timeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10'), // seconds

  // Connection lifecycle
  max_lifetime: 3600, // 1 hour

  // Performance
  prepare: true, // Use prepared statements
  fetch_array_size: 100,
};

export const client = postgres(connectionString, poolConfig);
```

#### Recommended Pool Sizes

| Environment | Min | Max | Rationale |
|-------------|-----|-----|-----------|
| **Development** | 2 | 10 | Low concurrent users |
| **Production (single instance)** | 5 | 20 | Balanced for typical load |
| **Production (2+ instances)** | 3 | 15 | Lower per-instance, higher aggregate |

**Formula**: `Total Connections < PostgreSQL max_connections`

Example:
- PostgreSQL `max_connections=100`
- 3 API instances × 15 max connections = 45 total
- Leaves 55 connections for other services/maintenance

---

### 2. Caching Strategy

#### API Response Caching (Hono)

```typescript
// apps/api/src/middleware/cache.middleware.ts
import { cache } from 'hono/cache';

export const cacheConfig = {
  // Static resources
  static: cache({
    cacheName: 'static-assets',
    cacheControl: 'public, max-age=31536000, immutable',
  }),

  // API responses
  shortLived: cache({
    cacheName: 'api-short',
    cacheControl: 'public, max-age=60', // 1 minute
  }),

  mediumLived: cache({
    cacheName: 'api-medium',
    cacheControl: 'public, max-age=300', // 5 minutes
  }),

  longLived: cache({
    cacheName: 'api-long',
    cacheControl: 'public, max-age=3600', // 1 hour
  }),
};
```

#### Caching Strategy by Endpoint Type

| Endpoint Type | Cache Duration | Strategy |
|---------------|----------------|----------|
| User profile (public) | 5 minutes | Medium-lived cache |
| Post feed | 1 minute | Short-lived cache |
| Discovery algorithm | 5 minutes | Medium-lived cache |
| Static assets | 1 year | Immutable cache |
| Authentication | No cache | Always fresh |
| User-specific data | No cache | Private data |

#### Redis Integration (Phase 2 - Optional)

```yaml
# docker-compose.yml (when scaling)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### 3. Resource Limits

#### Development Environment

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  minio:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M
```

#### Production Environment

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  postgres:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

---

### 4. Performance Targets

#### MVP Phase (0-10K users)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time (p95)** | < 200ms | Health check endpoint |
| **API Response Time (p99)** | < 500ms | Database queries |
| **Database Query Time (p95)** | < 100ms | PostgreSQL slow query log |
| **Page Load Time (p95)** | < 2s | Lighthouse metrics |
| **Time to Interactive (TTI)** | < 3s | Lighthouse metrics |
| **Largest Contentful Paint** | < 2.5s | Core Web Vitals |
| **Cumulative Layout Shift** | < 0.1 | Core Web Vitals |
| **First Input Delay** | < 100ms | Core Web Vitals |

#### Database Performance Targets

```yaml
# PostgreSQL configuration targets
shared_buffers: 512MB        # 25% of RAM (2GB server)
effective_cache_size: 1.5GB  # 75% of RAM
work_mem: 16MB               # Per-operation memory
maintenance_work_mem: 128MB  # Maintenance operations
max_connections: 100         # Concurrent connections
checkpoint_completion_target: 0.9
wal_buffers: 16MB
random_page_cost: 1.1        # SSD optimization
```

#### API Performance Targets

```yaml
# Target concurrent requests
concurrent_users: 100        # Development
concurrent_users: 1000       # Production (initial)

# Request throughput
requests_per_second: 50      # Development
requests_per_second: 500     # Production (initial)

# Error rate
error_rate: < 0.1%           # 99.9% success rate
```

---

## Health Checks and Readiness

### 1. API Health Endpoint

#### Implementation

```typescript
// apps/api/src/modules/health/health.routes.ts
import { Hono } from 'hono';
import { db } from '@/lib/db';
import { s3Client } from '@/lib/s3';

const healthRoutes = new Hono();

// Liveness probe - is the service running?
healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe - is the service ready to accept traffic?
healthRoutes.get('/health/ready', async (c) => {
  const checks = {
    database: false,
    storage: false,
  };

  try {
    // Check database connection
    await db.execute('SELECT 1');
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Check S3 connection
    await s3Client.listBuckets();
    checks.storage = true;
  } catch (error) {
    console.error('Storage health check failed:', error);
  }

  const isReady = checks.database && checks.storage;
  const status = isReady ? 200 : 503;

  return c.json({
    status: isReady ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  }, status);
});

// Detailed status (internal use)
healthRoutes.get('/health/status', async (c) => {
  const dbPool = await db.execute('SHOW max_connections');
  const dbConnections = await db.execute('SELECT count(*) FROM pg_stat_activity');

  return c.json({
    service: 'vrss-api',
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      maxConnections: dbPool[0]?.max_connections,
      activeConnections: dbConnections[0]?.count,
    },
    timestamp: new Date().toISOString(),
  });
});

export default healthRoutes;
```

#### Health Check Configuration

```yaml
# docker-compose.yml
services:
  api:
    healthcheck:
      # Readiness check
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 30s        # Check every 30 seconds
      timeout: 10s         # Fail if no response in 10s
      retries: 3           # Mark unhealthy after 3 failures
      start_period: 40s    # Allow 40s for startup
```

---

### 2. PostgreSQL Health Check

```yaml
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

**Manual verification**:
```bash
# Check if PostgreSQL is accepting connections
docker-compose exec postgres pg_isready -U vrss

# Check database size
docker-compose exec postgres psql -U vrss -d vrss_dev -c "SELECT pg_size_pretty(pg_database_size('vrss_dev'));"

# Check active connections
docker-compose exec postgres psql -U vrss -d vrss_dev -c "SELECT count(*) FROM pg_stat_activity;"
```

---

### 3. NGINX Health Check

#### Configuration

```nginx
# docker/nginx/nginx.conf
server {
    listen 80;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Proxy to API
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        proxy_pass http://web:5173/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```yaml
# docker-compose.yml
services:
  nginx:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

---

### 4. MinIO Health Check (Development)

```yaml
services:
  minio:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 30s
```

**Manual verification**:
```bash
# Check MinIO is responding
curl http://localhost:9000/minio/health/live

# Access MinIO console
open http://localhost:9001
```

---

### 5. Monitoring and Alerting

#### Prometheus Metrics (Future Enhancement)

```typescript
// apps/api/src/lib/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
  }),

  httpRequestTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  databaseConnections: new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
  }),

  storageQuotaUsed: new Gauge({
    name: 'storage_quota_used_bytes',
    help: 'Storage quota used per user',
    labelNames: ['user_id'],
  }),
};
```

---

## Deployment Orchestration

### Development Deployment

#### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/vrss.git
cd vrss

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies
bun install

# 4. Start all services
docker-compose up -d

# 5. Wait for health checks
docker-compose ps

# 6. Run database migrations
bun run db:migrate

# 7. (Optional) Seed database
bun run db:seed

# 8. Verify deployment
curl http://localhost:8080/health
curl http://localhost:8080/api/health/ready
```

#### Daily Development

```bash
# Start services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api

# Restart service after changes
docker-compose restart api

# Stop all services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v
```

---

### Production Deployment

#### Pre-Deployment Checklist

- [ ] Environment variables configured in secrets manager
- [ ] SSL certificates obtained and configured
- [ ] Database backups enabled
- [ ] S3 bucket created with CORS policy
- [ ] Domain DNS configured
- [ ] Monitoring/alerting configured
- [ ] Rate limiting configured
- [ ] Security headers enabled

#### Deployment Process

```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Run database migrations (before deployment)
docker-compose -f docker-compose.prod.yml run --rm api bun run db:migrate

# 3. Deploy services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health checks
docker-compose -f docker-compose.prod.yml ps
curl https://api.vrss.app/health/ready

# 5. Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Zero-Downtime Deployment

```bash
# Scale up new instances
docker-compose -f docker-compose.prod.yml up -d --scale api=4 --no-recreate

# Wait for health checks
sleep 30

# Scale down old instances
docker-compose -f docker-compose.prod.yml up -d --scale api=2 --no-recreate

# Monitor error rates
# If issues detected, rollback by scaling down new instances
```

#### Rollback Procedure

```bash
# 1. Identify previous image version
docker images vrss-api

# 2. Tag previous version as latest
docker tag vrss-api:previous vrss-api:latest

# 3. Restart services with previous version
docker-compose -f docker-compose.prod.yml up -d --force-recreate api

# 4. Verify health
curl https://api.vrss.app/health/ready
```

---

### Scaling Guidelines

#### Horizontal Scaling (API Service)

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 2  # Start with 2 instances
```

**Scaling triggers**:
- CPU usage > 70% sustained
- Memory usage > 80%
- Response time p95 > 500ms
- Concurrent requests > 80% capacity

**Scale up**:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=4
```

**Scale down**:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=2
```

#### Vertical Scaling (Database)

**When to scale**:
- Connection pool exhaustion
- Query performance degradation
- Disk I/O saturation

**Process**:
1. Schedule maintenance window
2. Create database backup
3. Resize VM/container
4. Update PostgreSQL configuration
5. Restart database
6. Verify performance

---

## Summary

### Key Deployment Specifications

| Aspect | Development | Production |
|--------|-------------|------------|
| **Containers** | 5 (nginx, api, web, postgres, minio) | 3-4 (nginx, api×N, postgres) |
| **API Instances** | 1 | 2+ (load balanced) |
| **Database Pool** | 2-10 connections | 5-20 per instance |
| **Storage** | MinIO (local) | AWS S3 |
| **SSL/TLS** | No | Yes (Let's Encrypt) |
| **Health Checks** | Basic | Comprehensive |
| **Resource Limits** | Minimal | Enforced |
| **Restart Policy** | No | unless-stopped |

### Service Startup Order

1. **Data Layer**: `postgres`, `minio` (parallel)
2. **Application Layer**: `api` (waits for database health)
3. **Frontend Layer**: `web` (development only)
4. **Proxy Layer**: `nginx` (waits for api and web)

### Critical Environment Variables

**API Service**:
- `DATABASE_URL` - PostgreSQL connection
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` - Storage
- `BETTER_AUTH_SECRET` - Authentication
- `SESSION_SECRET` - Session management

**Web Service**:
- `VITE_API_URL` - Backend endpoint

**PostgreSQL**:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

### Health Check Endpoints

- **API**: `GET /health/ready` → Database + Storage connectivity
- **NGINX**: `GET /health` → Basic liveness
- **PostgreSQL**: `pg_isready` command

### Performance Targets (MVP)

- API response time (p95): < 200ms
- Page load time: < 2s
- Error rate: < 0.1%
- Database connections: < 100 total

---

**Next Steps**:
1. Review environment variable requirements
2. Configure secrets management for production
3. Set up health monitoring
4. Test deployment process in staging environment
5. Configure CI/CD pipeline for automated deployment

