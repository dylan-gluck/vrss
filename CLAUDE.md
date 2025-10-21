# CLAUDE.md

VRSS social platform. MVP build.

## Architecture

### Container Architecture

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
        │   Port: 5050  │  │   Port: 3030   │
        └───────────────┘  └────────┬────────┘
                                    │
                            ┌───────▼────────┐
                            │   PostgreSQL   │
                            │   Database     │
                            │   Port: 6969   │
                            └────────────────┘
```

### Key Design Decisions

1. **Containerized Monolith**: Simplifies MVP development while maintaining deployment flexibility
2. **Multi-Stage Dockerfiles**: Optimized images (50-100MB production vs 200-300MB dev)
3. **Hot Reload**: File changes instantly reflect without rebuilding
4. **Volume Persistence**: Data survives container restarts
5. **Security-First**: Non-root users, minimal base images, isolated networks

---

## Development

### Daily Workflow

```bash
# Start development environment
make start

# View logs (Ctrl+C to exit)
make logs

# Make code changes
# Files in backend/src and frontend/src automatically reload

# Stop services (data persists)
make stop
```

### Common Commands

```bash
# Service Management
make start              # Start all services
make stop               # Stop all services
make restart            # Restart all services
make ps                 # Show running containers
make logs               # View all logs
make logs-backend       # View backend logs only
make logs-frontend      # View frontend logs only

# Database Operations
make db-shell           # Open PostgreSQL shell
make db-backup          # Create database backup
make db-restore         # Restore from backup
make db-migrate         # Run migrations
make db-seed            # Seed test data

# Testing
make test               # Run all tests (fast mode)
make test-docker        # Run tests in isolated environment
make test-local         # Run tests locally (no Docker)
make test-backend       # Run backend tests only
make test-frontend      # Run frontend tests only
make test-coverage      # Run tests with coverage
make test-watch         # Run tests in watch mode
make test-ci            # Run tests in CI/CD mode

# See docs/TESTING.md for comprehensive testing guide

# Building
make build              # Build Docker images
make rebuild            # Rebuild without cache

# Utilities
make stats              # Show resource usage
make health             # Run health check
make shell-backend      # Open backend shell
make shell-frontend     # Open frontend shell
make clean              # Remove all containers/volumes
```

### Project Structure

```
vrss/
├── backend/                 # Backend API (Bun + Hono)
│   ├── src/                # Source code
│   ├── migrations/         # Database migrations
│   ├── Dockerfile          # Multi-stage backend build
│   └── package.json        # Dependencies
│
├── frontend/               # Frontend PWA (Vite)
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── Dockerfile         # Multi-stage frontend build
│   └── package.json       # Dependencies
│
├── docker/                # Docker configuration
│   ├── db/               # Database configuration
│   │   ├── init/         # Initialization scripts
│   │   ├── backup/       # Backup storage
│   │   └── postgresql.conf
│   └── nginx/            # Nginx configuration
│       ├── nginx.conf    # Global nginx config
│       └── conf.d/       # Site-specific config
│
├── scripts/              # Utility scripts
│   ├── dev-setup.sh     # Automated setup
│   └── health-check.sh  # Health verification
│
├── docs/                # Documentation
│   ├── DOCKER.md       # Docker infrastructure guide
│   ├── API.md          # API documentation
│   └── specs/          # Product specifications
│
├── docker-compose.yml  # Service orchestration
├── Makefile           # Development commands
├── .env.example       # Environment template
└── README.md         # This file
```

### Adding New Features

1. **Backend**:
   ```bash
   # Edit files in backend/src/
   # Changes automatically reload via Bun watch
   ```

2. **Frontend**:
   ```bash
   # Edit files in frontend/src/
   # Changes instantly reflect via Vite HMR
   ```

3. **Database**:
   ```bash
   # Create migration
   docker-compose exec backend bun run migrate:create feature_name

   # Edit migration file
   # Run migration
   make db-migrate
   ```

4. **Tests**:
   ```bash
   # Write tests in *.test.ts files
   # Run tests
   make test
   ```
