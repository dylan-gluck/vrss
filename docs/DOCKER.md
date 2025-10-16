# VRSS Docker Infrastructure Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Container Services](#container-services)
5. [Development Workflow](#development-workflow)
6. [Production Deployment](#production-deployment)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Performance Optimization](#performance-optimization)
10. [Security Considerations](#security-considerations)

---

## Overview

VRSS uses a containerized monolith architecture with Docker and Docker Compose, providing:

- **Consistent Environments**: Identical development, testing, and production environments
- **One-Command Setup**: `make setup && make start` gets you running
- **Hot Reload**: Changes reflect immediately without rebuilding
- **Database Persistence**: Data survives container restarts
- **Production Ready**: Multi-stage builds with security best practices

### Technology Stack

- **Backend**: Bun 1.1 + Hono (TypeScript)
- **Frontend**: Vite + PWA (modern JavaScript framework)
- **Database**: PostgreSQL 16
- **Reverse Proxy**: Nginx (production)
- **Container Orchestration**: Docker Compose

---

## Architecture

### Container Structure

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (Production)               │
│                  Reverse Proxy                      │
│                    Port: 80/443                     │
└────────────────┬────────────────┬───────────────────┘
                 │                │
        ┌────────▼──────┐  ┌──────▼─────────┐
        │   Frontend    │  │    Backend     │
        │   Vite PWA    │  │   Bun + Hono   │
        │   Port: 5173  │  │   Port: 3000   │
        └───────────────┘  └────────┬────────┘
                                    │
                            ┌───────▼────────┐
                            │   PostgreSQL   │
                            │   Database     │
                            │   Port: 5432   │
                            └────────────────┘
```

### Multi-Stage Dockerfile Architecture

Both frontend and backend use optimized multi-stage builds:

1. **Base**: Security updates, non-root user creation
2. **Dependencies**: Install and cache dependencies
3. **Build**: Compile TypeScript/build production assets
4. **Development**: Hot reload with all dev tools
5. **Production**: Minimal image with only runtime dependencies
6. **Test**: Isolated environment for running tests

Benefits:
- Development images: ~200-300MB with hot reload
- Production images: ~50-100MB, security-hardened
- Shared layer caching reduces build times

### Network Architecture

All services communicate over a custom bridge network (`vrss_network`):

- **Service Discovery**: Containers reference each other by service name
- **Isolation**: Internal network isolated from host
- **Port Mapping**: Only necessary ports exposed to host

### Volume Strategy

Persistent data storage:

```yaml
postgres_data:    # Database files (survives container removal)
media_storage:    # User uploads (local development)
backend_logs:     # Application logs
frontend_node_modules: # Prevents host/container conflicts
```

---

## Getting Started

### Prerequisites

- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ (included with Docker Desktop)
- **Make**: Available on macOS/Linux (optional but recommended)
- **Git**: For cloning the repository

### Quick Start (Automated Setup)

```bash
# Clone the repository
git clone <repository-url>
cd vrss

# Run automated setup script
./scripts/dev-setup.sh

# Access your application
open http://localhost:5173
```

The setup script will:
1. Create necessary directories
2. Copy and configure `.env` file
3. Generate secure JWT secrets
4. Build Docker images
5. Start all services
6. Verify health status

### Manual Setup

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Edit .env with your settings (optional for development)
nano .env

# 3. Build and start services
make setup
make start

# 4. Verify services are running
make health
```

### First-Time Access

After setup completes:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

Default credentials (development only):
- Database User: `vrss_user`
- Database Password: `vrss_dev_password`
- Database Name: `vrss`

---

## Container Services

### Backend Service (`backend`)

**Purpose**: API server handling business logic, authentication, and data access

**Technology**: Bun runtime with Hono framework

**Configuration**:
```yaml
Build Context: ./backend
Dockerfile: backend/Dockerfile
Target: development
Port: 3000
```

**Health Check**:
```bash
curl http://localhost:3000/health
```

**Hot Reload**: Enabled via `bun --watch`
- Changes to `src/` directory automatically restart server
- No rebuild required during development

**Key Environment Variables**:
- `NODE_ENV`: development/production
- `DB_HOST`: Database hostname (default: db)
- `JWT_SECRET`: Authentication secret
- `STORAGE_TYPE`: local/s3 for media storage

**Development Commands**:
```bash
# View logs
make logs-backend

# Shell access
make shell-backend

# Run tests
docker-compose exec backend bun test

# Run migrations
docker-compose exec backend bun run migrate
```

### Frontend Service (`frontend`)

**Purpose**: Progressive Web App serving the user interface

**Technology**: Vite build tool with hot module replacement (HMR)

**Configuration**:
```yaml
Build Context: ./frontend
Dockerfile: frontend/Dockerfile
Target: development
Port: 5173
```

**Health Check**:
```bash
curl http://localhost:5173
```

**Hot Reload**: Enabled via Vite dev server
- Changes to `src/` reflect instantly in browser
- No page refresh for most changes (HMR)
- Full page reload for configuration changes

**Key Environment Variables**:
- `VITE_API_URL`: Backend API endpoint
- `VITE_WS_URL`: WebSocket endpoint
- `VITE_APP_NAME`: PWA application name

**Development Commands**:
```bash
# View logs
make logs-frontend

# Shell access
make shell-frontend

# Run tests
docker-compose exec frontend npm test

# Build for production
docker-compose exec frontend npm run build
```

### Database Service (`db`)

**Purpose**: PostgreSQL database for persistent data storage

**Technology**: PostgreSQL 16 Alpine

**Configuration**:
```yaml
Image: postgres:16-alpine
Port: 5432
Volume: vrss_postgres_data
```

**Initialization**:
Database automatically initializes on first start:
1. Runs scripts in `docker/db/init/` (alphabetically)
2. Creates extensions (uuid-ossp, pg_trgm, etc.)
3. Creates custom types and functions
4. Sets up initial schema

**Health Check**:
```bash
docker-compose exec db pg_isready -U vrss_user -d vrss
```

**Custom Configuration**:
`docker/db/postgresql.conf` contains optimized settings:
- Memory allocation tuned for development
- Logging enabled for slow queries (>1s)
- Connection pooling configured

**Development Commands**:
```bash
# Open PostgreSQL shell
make db-shell

# Create backup
make db-backup

# Restore from backup
make db-restore FILE=docker/db/backup/backup.sql

# View database logs
make logs-db

# Reset database (WARNING: deletes all data)
make db-reset
```

### Nginx Service (`nginx`)

**Purpose**: Reverse proxy for production deployment

**Technology**: Nginx Alpine

**Configuration**:
```yaml
Profile: production
Ports: 80, 443
```

**Activation**:
Nginx only runs in production mode:
```bash
make prod-start
```

**Features**:
- SSL/TLS termination
- Static asset caching
- Rate limiting
- API proxy with health checks
- WebSocket support
- Gzip compression

**Configuration Files**:
- `docker/nginx/nginx.conf`: Global nginx configuration
- `docker/nginx/conf.d/vrss.conf`: Site-specific configuration

---

## Development Workflow

### Daily Development

```bash
# Start your day
make start        # Start all services
make logs         # Monitor logs (Ctrl+C to exit)

# During development
# Edit files in backend/src or frontend/src
# Changes automatically reload

# End your day
make stop         # Stop all services (data persists)
```

### Common Tasks

**View Logs**:
```bash
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only
make logs-db          # Database only
```

**Restart Services**:
```bash
make restart           # Restart all services
docker-compose restart backend  # Restart specific service
```

**Database Operations**:
```bash
make db-shell         # Interactive SQL shell
make db-backup        # Create timestamped backup
make db-migrate       # Run migrations
make db-seed          # Seed test data
```

**Testing**:
```bash
make test             # Run all tests
make test-backend     # Backend tests only
make test-frontend    # Frontend tests only
make test-coverage    # Tests with coverage report
```

**Container Management**:
```bash
make ps               # List running containers
make stats            # Resource usage
make shell-backend    # Shell in backend container
make shell-frontend   # Shell in frontend container
make shell-db         # Shell in database container
```

### Rebuilding

When to rebuild:

1. **Dependencies Changed**: New npm/bun packages added
2. **Dockerfile Modified**: Changes to build process
3. **Base Image Updated**: New versions available

```bash
# Standard rebuild (uses cache)
make build

# Full rebuild (no cache, slower but clean)
make rebuild
```

### Cleaning Up

```bash
# Remove containers (keeps data)
make stop

# Remove containers and volumes (DELETES DATA)
make clean-volumes

# Complete cleanup (DELETES EVERYTHING)
make clean
```

---

## Production Deployment

### Production Build

Production builds create optimized, minimal images:

```bash
# Build production images
make prod-build
```

**Optimizations**:
- Multi-stage builds (only runtime dependencies)
- Minified assets
- No development tools
- Security-hardened (non-root user, minimal base image)
- Gzip compression enabled

### Environment Configuration

1. Copy production environment template:
```bash
cp .env.production.example .env.production
```

2. Configure production settings:
```bash
# Update .env.production with:
# - Production database credentials
# - S3 bucket configuration
# - SMTP settings for email
# - Analytics keys
# - Secure JWT secret
# - Domain names
```

3. Review security checklist in `.env.production.example`

### Starting Production Services

```bash
# Start with production profile (includes nginx)
make prod-start

# Access application
open http://localhost
```

### Production Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Source Maps | ✅ Full | ⚠️ Limited |
| Logging | Debug level | Info/Error only |
| Image Size | ~300MB | ~50-100MB |
| Storage | Local files | S3 buckets |
| Reverse Proxy | Optional | Nginx required |
| SSL/TLS | Not configured | Required |

### Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate secure JWT secret (`openssl rand -hex 64`)
- [ ] Configure S3 bucket for media storage
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules (only necessary ports open)
- [ ] Enable database backups
- [ ] Set up monitoring and alerting
- [ ] Configure rate limiting
- [ ] Review CORS origins
- [ ] Enable error tracking (Sentry)
- [ ] Set up log aggregation
- [ ] Configure email service (SendGrid, etc.)
- [ ] Test backup/restore procedures
- [ ] Review environment variables for secrets
- [ ] Enable HTTPS redirect
- [ ] Configure CDN for static assets

### Deployment Strategies

**Option 1: Docker Compose on VPS**
```bash
# On production server
git pull
docker-compose --profile production down
docker-compose --profile production build
docker-compose --profile production up -d
```

**Option 2: Cloud Run / Container Services**
- Build images with production target
- Push to container registry
- Deploy via cloud provider CLI/UI

**Option 3: Kubernetes**
- Convert docker-compose to Kubernetes manifests
- Use kompose or manually create deployments
- Configure ingress, services, persistent volumes

---

## Database Management

### Backup Strategy

**Automated Backups**:
```bash
# Enable backup service
docker-compose --profile backup up -d db_backup

# Backups created daily at 2 AM
# Stored in docker/db/backup/
# Retention: 7 days
```

**Manual Backups**:
```bash
# Create backup
make db-backup

# Backup file created:
# docker/db/backup/vrss_YYYYMMDD_HHMMSS.sql
```

### Restore Procedures

```bash
# List available backups
ls -lh docker/db/backup/

# Restore from specific backup
make db-restore FILE=docker/db/backup/vrss_20250116_020000.sql
```

### Migrations

Migration workflow:

1. **Create Migration**:
```bash
# Create migration file
docker-compose exec backend bun run migrate:create add_feature_table
```

2. **Write Migration**:
Edit generated file in `backend/migrations/`

3. **Run Migration**:
```bash
make db-migrate
```

4. **Verify Migration**:
```bash
make db-shell
\dt  # List tables
\d table_name  # Describe table
```

### Database Monitoring

**Check Storage Usage**:
```bash
# Volume size
docker system df -v | grep postgres_data

# Database size
make db-shell
SELECT pg_database_size('vrss') / 1024 / 1024 AS size_mb;
```

**Analyze Query Performance**:
```bash
make db-shell

# Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

# View slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Troubleshooting

### Service Won't Start

**Symptom**: Container exits immediately

**Diagnosis**:
```bash
# Check container logs
make logs

# Check specific service
docker-compose logs backend

# Check container status
make ps
```

**Common Causes**:
1. **Port Conflict**: Another service using ports 3000/5173/5432
   ```bash
   # Check port usage
   lsof -i :3000
   lsof -i :5173
   lsof -i :5432
   ```

2. **Database Connection Failed**: Database not ready
   ```bash
   # Wait for database health check
   docker-compose up -d db
   sleep 10
   make health
   ```

3. **Environment Variable Missing**: Check `.env` file
   ```bash
   # Verify required variables
   cat .env | grep -E "DB_|JWT_|STORAGE_"
   ```

### Hot Reload Not Working

**Symptom**: Code changes don't reflect

**Solutions**:

1. **Backend**: Check Bun watch is enabled
   ```bash
   docker-compose logs backend | grep watch
   # Should see "--watch" flag in command
   ```

2. **Frontend**: Verify Vite HMR
   ```bash
   docker-compose logs frontend | grep HMR
   # Check browser console for HMR connection
   ```

3. **File Permissions**: macOS/Windows may have sync issues
   ```bash
   # Rebuild with proper permissions
   make rebuild
   ```

### Database Connection Errors

**Symptom**: Backend can't connect to database

**Check Connection**:
```bash
# Test from backend container
docker-compose exec backend sh
nc -zv db 5432

# Test from host
nc -zv localhost 5432
```

**Check Credentials**:
```bash
# Verify environment variables
docker-compose exec backend env | grep DB_
```

**Reset Database Connection**:
```bash
# Restart database
docker-compose restart db

# Wait for health check
sleep 10

# Restart backend
docker-compose restart backend
```

### Out of Disk Space

**Check Usage**:
```bash
# Docker disk usage
docker system df

# Detailed view
docker system df -v
```

**Clean Up**:
```bash
# Remove unused images/containers
docker system prune -a

# Remove unused volumes (WARNING: may delete data)
docker volume prune

# Remove specific volume
docker volume rm vrss_frontend_node_modules
```

### Performance Issues

**Check Resource Usage**:
```bash
# Real-time stats
make stats

# Container resource limits
docker-compose config | grep -A 5 resources
```

**Optimize**:
1. **Increase Docker Resources**: Docker Desktop > Settings > Resources
2. **Adjust Database Config**: Edit `docker/db/postgresql.conf`
3. **Enable Caching**: Uncomment cache config in nginx

### Network Issues

**Check Network**:
```bash
# Verify network exists
docker network inspect vrss_network

# Check connected containers
docker network inspect vrss_network | grep Name
```

**Recreate Network**:
```bash
make stop
docker network rm vrss_network
make start
```

### Health Check Script

Run comprehensive health check:
```bash
./scripts/health-check.sh
```

This checks:
- Container status
- Service health endpoints
- Database connectivity
- Disk usage
- Recent errors in logs
- Network configuration

---

## Performance Optimization

### Development Performance

**Build Cache Optimization**:
```bash
# Order Dockerfile layers from least to most frequently changed
# Dependencies (rarely change) before source code (changes often)
```

**Volume Performance (macOS/Windows)**:
- Use named volumes for node_modules
- Avoid mounting large directories from host
- Consider using Docker Desktop VM improvements

**Database Query Optimization**:
```bash
# Add indexes for frequently queried columns
make db-shell
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
```

### Production Performance

**Nginx Caching**:
```nginx
# Static assets cached for 1 year
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Database Connection Pooling**:
```env
# .env.production
DB_POOL_MIN=5
DB_POOL_MAX=20
```

**Image Optimization**:
- Multi-stage builds reduce image size by 60-80%
- Alpine base images are minimal (~5MB vs 50MB+)
- Only runtime dependencies in production images

**Resource Limits**:
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

## Security Considerations

### Container Security

**Non-Root User**:
All containers run as non-root users for security:
```dockerfile
RUN adduser -S -D -H -u 1001 bunuser
USER bunuser
```

**Minimal Base Images**:
- Alpine Linux base (~5MB)
- Only essential packages installed
- Regular security updates via `apk upgrade`

**Secret Management**:
- Never commit `.env` files
- Use environment variables, not hardcoded secrets
- Rotate JWT secrets regularly
- Use Docker secrets for production (Swarm/Kubernetes)

### Network Security

**Isolated Network**:
```yaml
networks:
  vrss_network:
    driver: bridge
    # Internal network, not accessible from outside
```

**Port Exposure**:
```yaml
# Only expose necessary ports to host
ports:
  - "5173:5173"  # Frontend (dev only)
  - "3000:3000"  # Backend API
  # Database NOT exposed to host in production
```

**Rate Limiting**:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;
```

### Database Security

**Strong Passwords**:
```bash
# Generate secure password
openssl rand -base64 32

# Update .env
DB_PASSWORD=<generated-password>
```

**Connection Encryption**:
```conf
# postgresql.conf (production)
ssl = on
ssl_cert_file = '/path/to/cert.pem'
ssl_key_file = '/path/to/key.pem'
```

**Backup Encryption**:
```bash
# Encrypt backups
gpg --symmetric --cipher-algo AES256 backup.sql
```

### Application Security

**HTTPS Only (Production)**:
```nginx
# Redirect HTTP to HTTPS
return 301 https://$server_name$request_uri;
```

**Security Headers**:
```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000";
```

**CORS Configuration**:
```env
CORS_ORIGINS=https://vrss.app,https://www.vrss.app
# Never use * in production
```

---

## Additional Resources

### Documentation Files

- `README.md`: Project overview and quick start
- `DOCKER.md`: This file - comprehensive Docker documentation
- `.env.example`: Environment variable reference
- `.env.production.example`: Production configuration template

### Useful Commands Reference

```bash
# Setup
make setup          # Initial setup
make start          # Start services
make stop           # Stop services
make restart        # Restart services

# Development
make logs           # View all logs
make build          # Build images
make rebuild        # Rebuild without cache

# Database
make db-shell       # PostgreSQL shell
make db-backup      # Create backup
make db-restore     # Restore backup
make db-migrate     # Run migrations

# Testing
make test           # Run all tests
make health         # Health check

# Production
make prod-build     # Build production images
make prod-start     # Start with nginx

# Utilities
make ps             # Container status
make stats          # Resource usage
make clean          # Full cleanup
```

### Docker Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

### PostgreSQL Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Questions or Issues?**

Check the troubleshooting section or open an issue in the repository.
