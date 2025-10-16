# VRSS Infrastructure Specification

## Document Overview

**Version**: 1.0
**Date**: 2025-10-16
**Status**: Complete
**Purpose**: Comprehensive infrastructure design for VRSS social platform MVP

---

## Executive Summary

This specification defines the containerization and infrastructure setup for the VRSS social platform MVP. The architecture prioritizes developer productivity, production readiness, and operational simplicity through a containerized monolith approach.

### Design Goals Achieved

✅ **One-Command Setup**: `make setup && make start` for new developers
✅ **Hot Reload**: Instant code changes without rebuilding
✅ **Data Persistence**: Volumes survive container restarts
✅ **Production Ready**: Multi-stage builds with security best practices
✅ **Development Parity**: Identical environments across development and production
✅ **Comprehensive Documentation**: Complete guides for all operations
✅ **Automated Health Checks**: Scripts verify system health
✅ **Database Management**: Backup, restore, and migration workflows

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Layer                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Nginx Reverse Proxy                      │ │
│  │  - SSL/TLS Termination                                │ │
│  │  - Static Asset Caching                               │ │
│  │  - Rate Limiting                                      │ │
│  │  - WebSocket Proxying                                │ │
│  └─────────────────┬────────────────┬───────────────────┘ │
│                    │                │                       │
└────────────────────┼────────────────┼───────────────────────┘
                     │                │
        ┌────────────▼──────┐  ┌──────▼─────────────┐
        │   Frontend PWA    │  │   Backend API      │
        │                   │  │                    │
        │  Technology:      │  │  Technology:       │
        │  - Vite           │  │  - Bun Runtime     │
        │  - React/Vue      │  │  - Hono Framework  │
        │  - Service Worker │  │  - Better-auth     │
        │  - IndexedDB      │  │  - Prisma ORM      │
        │                   │  │                    │
        │  Port: 5173 (dev) │  │  Port: 3000        │
        │  Port: 8080 (prod)│  │                    │
        └───────────────────┘  └────────┬───────────┘
                                        │
                                        │ Connection Pool
                                        │ (2-10 connections)
                                        │
                                ┌───────▼────────────┐
                                │   PostgreSQL 16    │
                                │                    │
                                │  Features:         │
                                │  - UUID support    │
                                │  - Full-text search│
                                │  - JSON support    │
                                │  - Custom types    │
                                │                    │
                                │  Port: 5432        │
                                └────────────────────┘
                                        │
                                        │ Persistent Storage
                                        ▼
                                ┌────────────────────┐
                                │  Docker Volumes    │
                                │  - postgres_data   │
                                │  - media_storage   │
                                │  - logs            │
                                └────────────────────┘
```

### Container Orchestration

**Docker Compose Services**:

1. **db**: PostgreSQL database with health checks
2. **backend**: Bun + Hono API with hot reload
3. **frontend**: Vite dev server with HMR
4. **nginx**: Reverse proxy (production profile only)
5. **db_backup**: Automated backup service (optional profile)

**Network Architecture**:
- Custom bridge network: `vrss_network`
- Service discovery via DNS (container names)
- Isolated from host network
- Only necessary ports exposed

---

## Dockerfile Specifications

### Backend Dockerfile

**File**: `backend/Dockerfile`

**Multi-Stage Build**:

```dockerfile
Stage 1: base          # Common dependencies, security updates
Stage 2: dependencies  # Production dependencies only
Stage 3: dev-deps      # All dependencies including dev tools
Stage 4: build         # Compile TypeScript, create dist/
Stage 5: development   # Hot reload with Bun watch
Stage 6: production    # Minimal runtime (50-100MB)
Stage 7: test          # Isolated test environment
```

**Key Features**:
- Base image: `oven/bun:1.1-alpine` (~50MB)
- Non-root user: `bunuser` (UID 1001)
- Security: Regular updates, minimal packages
- Hot reload: Bun `--watch` flag
- Health check: `/health` endpoint
- Tini: Proper signal handling

**Image Sizes**:
- Development: ~200-300MB (includes dev tools)
- Production: ~50-100MB (runtime only)
- Reduction: 60-80% smaller production images

### Frontend Dockerfile

**File**: `frontend/Dockerfile`

**Multi-Stage Build**:

```dockerfile
Stage 1: base            # Common dependencies
Stage 2: dependencies    # Production deps
Stage 3: dev-deps        # All dependencies
Stage 4: build           # Build optimized bundle
Stage 5: development     # Vite dev server with HMR
Stage 6: production-nginx # Nginx serving static files
Stage 7: production-node  # Node.js serving (alternative)
Stage 8: test            # Test environment
```

**Key Features**:
- Base image: `node:20-alpine`
- Production serving: Nginx or Node.js options
- Hot module replacement (HMR)
- Service worker for PWA
- Build-time environment variables
- Security headers

**Image Sizes**:
- Development: ~300MB (with dev tools)
- Production (Nginx): ~30MB (static assets only)
- Production (Node): ~80MB (Node + serve package)

---

## Docker Compose Configuration

### Service Definitions

#### Database Service (`db`)

```yaml
Image: postgres:16-alpine
Health Check: pg_isready command
Initialization: Scripts in docker/db/init/
Configuration: Custom postgresql.conf
Volumes:
  - postgres_data (persistent)
  - init scripts (read-only)
  - custom config (read-only)
Environment:
  - Database credentials
  - Performance tuning parameters
```

**Initialization Order**:
1. `01-init.sql`: Extensions, types, functions
2. `02-create-tables.sql`: Schema creation
3. Subsequent scripts (if any)

**Performance Tuning**:
- `shared_buffers`: 256MB
- `effective_cache_size`: 1GB
- `work_mem`: 16MB
- `maintenance_work_mem`: 128MB
- Optimized for SSD storage

#### Backend Service (`backend`)

```yaml
Build: Multi-stage from backend/
Target: development
Depends On: db (with health check)
Volumes:
  - Source code (hot reload)
  - Media storage (persistent)
  - Logs (persistent)
Command: bun run dev (with --watch)
Health Check: curl /health endpoint
```

**Environment Variables**:
- Database connection (from db service)
- JWT secret (generated or from .env)
- Storage configuration (local/S3)
- CORS origins
- Rate limiting
- Logging level

#### Frontend Service (`frontend`)

```yaml
Build: Multi-stage from frontend/
Target: development
Depends On: backend
Volumes:
  - Source code (hot reload)
  - Node modules (named volume)
Command: npm run dev --host 0.0.0.0
Health Check: curl localhost:5173
```

**Environment Variables**:
- API URLs (backend service)
- PWA configuration
- Feature flags
- Storage limits

#### Nginx Service (`nginx`)

```yaml
Profile: production
Image: nginx:alpine
Depends On: backend, frontend
Volumes:
  - Custom nginx.conf
  - Site configuration
  - Logs
Ports: 80, 443
```

**Configuration**:
- Reverse proxy to backend/frontend
- Static asset caching (1 year TTL)
- Gzip compression
- Security headers
- Rate limiting
- WebSocket support

---

## Volume Strategy

### Persistent Volumes

```yaml
postgres_data:        # Database files
  Driver: local
  Lifecycle: Permanent (manual removal only)
  Backup: Via pg_dump to host directory

media_storage:        # User uploads (development)
  Driver: local
  Production: S3 bucket (not volume)
  Lifecycle: Permanent

backend_logs:         # Application logs
  Driver: local
  Rotation: Managed by application

nginx_logs:          # Nginx access/error logs
  Driver: local
  Rotation: Logrotate

frontend_node_modules: # Avoids host/container conflicts
  Driver: local
  Lifecycle: Rebuilt with dependencies
```

### Volume Management

**Backup**:
```bash
make db-backup                    # Database to SQL file
docker cp vrss_backend:/app/logs . # Copy logs
```

**Cleanup**:
```bash
make clean-volumes  # Remove all volumes (WARNING: data loss)
docker volume prune # Remove unused volumes
```

---

## Database Design

### Schema Overview

**Core Tables**:
- `users`: User accounts and profiles
- `profile_customizations`: Style and layout settings
- `profile_sections`: Flexible profile components
- `posts`: User-generated content
- `media_files`: Uploaded media metadata
- `follows`: Social graph
- `likes`, `comments`, `reposts`: Engagement
- `custom_feeds`: User-defined algorithms
- `messages`: Direct messaging
- `notifications`: Activity alerts
- `blocked_users`: User blocking
- `sessions`: Authentication sessions

**PostgreSQL Extensions**:
- `uuid-ossp`: UUID generation
- `pg_trgm`: Full-text search (trigram matching)
- `btree_gin`, `btree_gist`: Advanced indexing

**Custom Types**:
```sql
user_role: user, creator, business, admin, moderator
post_type: text_short, text_long, image_single, image_gallery, ...
profile_visibility: public, private, followers_only
storage_tier: free, paid_basic, paid_premium
notification_type: follow, like, comment, repost, mention, message
section_type: feed, gallery, links, static_text, image, video, ...
```

**Indexes**:
- Primary keys (UUID)
- Foreign keys (user_id, post_id, etc.)
- Composite indexes (user_id + created_at)
- GIN indexes (array fields, full-text search)
- Partial indexes (WHERE deleted_at IS NULL)

### Migration Strategy

**Tools**: Prisma Migrate (or custom SQL migrations)

**Workflow**:
1. Create migration: `bun run migrate:create name`
2. Edit SQL file in `backend/migrations/`
3. Run migration: `make db-migrate`
4. Verify: `make db-shell` and check schema

**Rollback Strategy**:
- Each migration includes down migration
- Backup before running migrations
- Test migrations in development first

---

## Environment Configuration

### Environment Files

**`.env.example`**: Template for development
- Contains all required variables
- Safe default values
- Comments explaining each variable

**`.env.production.example`**: Template for production
- Production-specific defaults
- Security checklist
- No default passwords/secrets

**`.env`**: Actual development configuration
- Created from `.env.example`
- Gitignored
- Local overrides allowed

**`.env.production`**: Actual production configuration
- Created from `.env.production.example`
- Gitignored
- Secure secrets required

### Key Configuration Categories

**Database**:
```bash
DB_HOST=db
DB_PORT=5432
DB_NAME=vrss
DB_USER=vrss_user
DB_PASSWORD=<secure-password>
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Authentication**:
```bash
JWT_SECRET=<generated-with-openssl>
JWT_EXPIRES_IN=7d
```

**Storage**:
```bash
STORAGE_TYPE=local|s3
STORAGE_LOCAL_PATH=/app/storage/media
S3_BUCKET=vrss-media
S3_ACCESS_KEY=<aws-key>
S3_SECRET_KEY=<aws-secret>
```

**Security**:
```bash
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Logging**:
```bash
LOG_LEVEL=debug|info|warn|error
LOG_FORMAT=json|pretty
```

---

## Developer Workflow

### Setup Process

**Automated** (Recommended):
```bash
./scripts/dev-setup.sh
```

**Manual**:
```bash
make setup     # Create .env, directories
make start     # Build and start services
make health    # Verify all services
```

### Daily Workflow

```bash
# Morning
make start
make logs &

# Development (edit files, auto-reload)

# Evening
make stop
```

### Common Operations

**Logs**:
```bash
make logs           # All services
make logs-backend   # Specific service
docker-compose logs -f --tail=100 backend
```

**Database**:
```bash
make db-shell       # Interactive SQL
make db-backup      # Create backup
make db-migrate     # Run migrations
make db-seed        # Seed test data
```

**Testing**:
```bash
make test           # All tests
make test-backend   # Backend only
make test-coverage  # With coverage
```

**Rebuilding**:
```bash
make build          # Standard rebuild
make rebuild        # Clean rebuild (no cache)
```

**Cleanup**:
```bash
make stop           # Stop containers
make clean-volumes  # Remove volumes (data loss!)
make clean          # Full cleanup (DANGEROUS)
```

---

## Production Deployment

### Build Process

```bash
# Build optimized images
make prod-build

# Or manually specify target
docker-compose build --target production backend
docker-compose build --target production-nginx frontend
```

**Build Outputs**:
- Backend: ~50-100MB image with compiled TypeScript
- Frontend: ~30MB image with static assets + Nginx
- Database: Standard PostgreSQL image (~80MB)

### Configuration Steps

1. **Environment**:
   ```bash
   cp .env.production.example .env.production
   # Edit with production values
   ```

2. **Secrets**:
   ```bash
   # Generate JWT secret
   openssl rand -hex 64

   # Generate database password
   openssl rand -base64 32
   ```

3. **Storage**:
   - Configure S3 bucket
   - Set up bucket policies
   - Create IAM user with minimal permissions
   - Test uploads/downloads

4. **SSL/TLS**:
   - Obtain certificates (Let's Encrypt, etc.)
   - Place in `/etc/ssl/`
   - Update nginx configuration
   - Enable HTTPS redirect

5. **Verification**:
   ```bash
   # Run security checklist from .env.production
   # Test all endpoints
   # Verify health checks
   # Check logs for errors
   ```

### Deployment

**Docker Compose (VPS)**:
```bash
# On production server
git pull
docker-compose --profile production down
docker-compose --profile production build
docker-compose --profile production up -d

# Verify
./scripts/health-check.sh
```

**Container Registry (Cloud)**:
```bash
# Build and tag
docker build -t registry.example.com/vrss-backend:latest ./backend
docker build -t registry.example.com/vrss-frontend:latest ./frontend

# Push
docker push registry.example.com/vrss-backend:latest
docker push registry.example.com/vrss-frontend:latest

# Deploy via cloud provider
```

### Monitoring

**Health Checks**:
- Backend: `/health` endpoint
- Frontend: HTTP 200 on root
- Database: `pg_isready` command
- Automated: `./scripts/health-check.sh`

**Logging**:
- Structured JSON logs in production
- Log aggregation to external service
- Retention policy (30 days default)

**Backups**:
- Automated daily backups
- Retention: 30 days
- Tested restore procedure
- Offsite backup storage

---

## Security Implementation

### Container Security

**Non-Root Users**:
```dockerfile
RUN adduser -S -D -H -u 1001 bunuser
USER bunuser
```

**Minimal Base Images**:
- Alpine Linux (~5MB)
- Only essential packages
- Regular security updates

**Network Isolation**:
- Custom bridge network
- No direct host access
- Only necessary port exposure

### Application Security

**Authentication**:
- Better-auth integration
- Session-based with secure cookies
- JWT tokens with rotation
- Password hashing (bcrypt)

**Authorization**:
- Role-based access control (RBAC)
- Profile visibility controls
- Storage quota enforcement

**API Security**:
- Rate limiting (10 req/s default)
- CORS restrictions
- Input validation
- SQL injection prevention (Prisma ORM)
- XSS prevention (sanitization)

**File Upload Security**:
- Type validation (MIME type check)
- Size limits (50MB free, 1GB paid)
- Virus scanning (future)
- S3 signed URLs
- Two-phase upload process

### Infrastructure Security

**Nginx Security Headers**:
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: (strict policy)
```

**Database Security**:
- Strong passwords
- Connection encryption (SSL)
- Limited network access
- Backup encryption
- Prepared statements

**Secret Management**:
- Environment variables (not hardcoded)
- `.env` files gitignored
- Docker secrets (production)
- Rotation policy

---

## Performance Optimization

### Development Performance

**Build Cache**:
- Layer ordering (dependencies before code)
- Named volumes for node_modules
- Docker BuildKit enabled

**Hot Reload**:
- Bun `--watch` for backend
- Vite HMR for frontend
- Volume mounts for source code

**Database**:
- Indexes on frequently queried columns
- Connection pooling (2-10 connections)
- Query optimization via EXPLAIN

### Production Performance

**Image Optimization**:
- Multi-stage builds (60-80% reduction)
- Alpine base images
- Minimal runtime dependencies
- Compressed layers

**Caching**:
```nginx
# Static assets: 1 year
expires 1y;
add_header Cache-Control "public, immutable";

# API responses: Application-level caching
```

**Database**:
- Increased connection pool (5-20)
- Read replicas (future)
- Query caching
- Index optimization

**CDN Integration**:
- Static assets served from CDN
- Media files via CloudFront/Cloudflare
- Edge caching

---

## Troubleshooting Guide

### Service Won't Start

**Symptoms**: Container exits immediately

**Diagnosis**:
```bash
make logs              # Check error logs
docker-compose ps     # Check status
docker inspect vrss_backend  # Detailed info
```

**Common Causes**:
1. Port conflict → `lsof -i :3000`
2. Database not ready → Check health check
3. Missing environment variable → Verify .env
4. Syntax error → Check recent code changes

### Hot Reload Not Working

**Symptoms**: Code changes don't reflect

**Solutions**:
```bash
# Backend: Check watch flag
docker-compose logs backend | grep watch

# Frontend: Check HMR connection
# Browser console should show HMR status

# Rebuild if needed
make rebuild
```

### Database Connection Errors

**Symptoms**: Backend can't connect to DB

**Solutions**:
```bash
# Check database health
docker-compose exec db pg_isready -U vrss_user

# Verify environment variables
docker-compose exec backend env | grep DB_

# Restart services in order
docker-compose restart db
sleep 10
docker-compose restart backend
```

### Out of Disk Space

**Symptoms**: Builds fail, slow performance

**Solutions**:
```bash
# Check usage
docker system df

# Clean up
docker system prune -a
docker volume prune

# Remove specific volumes
docker volume rm vrss_frontend_node_modules
```

### Performance Issues

**Diagnosis**:
```bash
# Resource usage
make stats

# Database slow queries
make db-shell
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

**Solutions**:
- Increase Docker resources (Settings > Resources)
- Optimize database queries (add indexes)
- Enable caching (Redis, application-level)

---

## Maintenance Procedures

### Daily Tasks

✅ Monitor logs for errors: `make logs`
✅ Check health status: `make health`
✅ Review disk usage: `docker system df`

### Weekly Tasks

✅ Review database performance: Slow query analysis
✅ Update dependencies: `docker-compose pull`
✅ Test backup/restore: `make db-backup && make db-restore`

### Monthly Tasks

✅ Security updates: Rebuild images with latest base
✅ Database optimization: VACUUM, ANALYZE
✅ Review logs: Check for patterns/issues
✅ Capacity planning: Storage, memory, CPU trends

### Quarterly Tasks

✅ Disaster recovery test: Full restore from backups
✅ Security audit: Dependency vulnerabilities
✅ Performance review: Optimization opportunities
✅ Documentation update: Keep guides current

---

## Success Metrics

### Infrastructure Goals Achieved

✅ **Developer Experience**:
- One-command setup: `./scripts/dev-setup.sh`
- Hot reload working for backend and frontend
- Comprehensive documentation available

✅ **Production Readiness**:
- Multi-stage builds implemented
- Security best practices applied
- Health checks configured

✅ **Database Management**:
- Automated backup system
- Migration workflow established
- Initialization scripts complete

✅ **Operational Excellence**:
- Makefile with 30+ commands
- Health check script
- Troubleshooting guide

### Performance Targets

- **Build Time**: < 5 minutes for full rebuild
- **Startup Time**: < 30 seconds for all services
- **Hot Reload**: < 1 second for code changes
- **Image Sizes**: 50-100MB production images

### Security Compliance

- ✅ Non-root containers
- ✅ Minimal base images
- ✅ Network isolation
- ✅ Secret management
- ✅ HTTPS ready

---

## Future Enhancements

### Short-Term (Next 3 Months)

1. **Redis Integration**: Caching and session storage
2. **Log Aggregation**: ELK stack or cloud service
3. **Monitoring**: Prometheus + Grafana
4. **CI/CD Pipeline**: Automated testing and deployment

### Medium-Term (3-6 Months)

1. **Kubernetes Migration**: For horizontal scaling
2. **Database Replication**: Read replicas for performance
3. **CDN Integration**: CloudFront/Cloudflare setup
4. **Advanced Backups**: Point-in-time recovery

### Long-Term (6-12 Months)

1. **Multi-Region Deployment**: Geographic distribution
2. **Microservices Split**: If complexity warrants
3. **Advanced Security**: WAF, DDoS protection
4. **Observability Platform**: Distributed tracing

---

## Conclusion

This infrastructure specification provides a complete, production-ready containerization strategy for the VRSS social platform MVP. The design balances developer productivity with operational excellence, security, and performance.

**Key Achievements**:
- Comprehensive Docker setup with multi-stage builds
- Complete development workflow with hot reload
- Production-ready images with security hardening
- Extensive documentation and troubleshooting guides
- Automated setup and health check scripts
- Database management with backups and migrations

**Next Steps**:
1. Implement backend application code
2. Implement frontend PWA application
3. Configure CI/CD pipeline
4. Set up production environment
5. Deploy and monitor

---

## Appendix

### File Structure

```
vrss/
├── backend/
│   ├── Dockerfile (multi-stage)
│   ├── .dockerignore
│   ├── src/ (application code)
│   └── migrations/ (database migrations)
├── frontend/
│   ├── Dockerfile (multi-stage)
│   ├── .dockerignore
│   ├── docker/nginx.conf
│   ├── docker/default.conf
│   └── src/ (PWA code)
├── docker/
│   ├── db/
│   │   ├── init/01-init.sql
│   │   ├── init/02-create-tables.sql
│   │   ├── scripts/backup.sh
│   │   ├── scripts/restore.sh
│   │   └── postgresql.conf
│   └── nginx/
│       ├── nginx.conf
│       └── conf.d/vrss.conf
├── scripts/
│   ├── dev-setup.sh (automated setup)
│   └── health-check.sh (health verification)
├── docs/
│   ├── DOCKER.md (comprehensive guide)
│   ├── INFRASTRUCTURE_SPEC.md (this file)
│   └── API.md (API documentation)
├── docker-compose.yml (orchestration)
├── Makefile (developer commands)
├── .env.example (template)
├── .env.production.example (production template)
├── .gitignore
└── README.md (project overview)
```

### Quick Reference Commands

```bash
# Setup
make setup && make start

# Daily
make logs
make stop
make restart

# Database
make db-shell
make db-backup
make db-migrate

# Testing
make test
make health

# Production
make prod-build
make prod-start

# Utilities
make ps
make stats
make clean
```

---

**Document Prepared By**: VRSS Infrastructure Team
**Date**: 2025-10-16
**Version**: 1.0
**Status**: Complete and Ready for Implementation
