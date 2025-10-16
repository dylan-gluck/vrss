# VRSS Social Platform

A customizable social media platform with user-defined algorithms, flexible profiles, and transparent content discovery.

![VRSS Platform](docs/images/vrss-banner.png)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

VRSS empowers users to build authentic digital identities through fully customizable social experiences. Unlike traditional platforms with rigid templates and opaque algorithms, VRSS gives you complete control over:

- **Profile Customization**: Adapt your profile to any use case - personal blog, business storefront, creative portfolio
- **Feed Algorithms**: Create custom feeds using visual logical blocks (inspired by Apple Shortcuts)
- **Content Discovery**: Design transparent discovery algorithms that match your interests
- **Digital Identity**: Own your social media experience, not the other way around

### Technology Stack

- **Backend**: Bun + Hono (TypeScript)
- **Frontend**: Vite PWA (Progressive Web App)
- **Database**: PostgreSQL 16
- **Container**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)

---

## Features

### MVP Features

#### Core Functionality
- **User Authentication**: Secure registration, login, and session management
- **Customizable Profiles**: Background, fonts, colors, music, and flexible sections
- **Content Creation**: Text, images, videos, and songs with gallery support
- **Social Interactions**: Follow, like, comment, repost
- **Direct Messaging**: Private conversations between users
- **Notifications**: Real-time alerts for interactions

#### Unique Differentiators
- **Visual Algorithm Builder**: Create feed and discovery algorithms using drag-and-drop logical blocks
- **Multiple Custom Feeds**: Switch between different feeds for different moods/contexts
- **Transparent Discovery**: See and modify how content is recommended
- **Flexible Profile Sections**: Customize layout with feeds, galleries, links, and more
- **Storage Management**: 50MB free tier, upgrade to 1GB+ paid tier

### Planned Features

- Advanced profile templates (Musician, Restaurant, Portfolio, Business)
- Post scheduling
- Enhanced analytics
- Collaborative posts
- Collections and playlists
- Native mobile apps (iOS/Android)

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- [Make](https://www.gnu.org/software/make/) (optional but recommended)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/vrss.git
   cd vrss
   ```

2. **Run automated setup**:
   ```bash
   ./scripts/dev-setup.sh
   ```

   This script will:
   - Create necessary directories
   - Copy and configure environment files
   - Generate secure secrets
   - Build Docker images
   - Start all services
   - Verify health status

3. **Access the application**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000
   - **Database**: localhost:5432

### Manual Setup

If you prefer manual setup or the script fails:

```bash
# Copy environment configuration
cp .env.example .env

# Create directories
mkdir -p docker/db/backup storage/media backend/logs frontend/logs

# Start services
make setup
make start

# Verify health
make health
```

### Verify Installation

```bash
# Check all services are running
make ps

# Run health check
./scripts/health-check.sh

# View logs
make logs
```

---

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
        │   Port: 5173  │  │   Port: 3000   │
        └───────────────┘  └────────┬────────┘
                                    │
                            ┌───────▼────────┐
                            │   PostgreSQL   │
                            │   Database     │
                            │   Port: 5432   │
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
make test               # Run all tests
make test-backend       # Run backend tests
make test-frontend      # Run frontend tests
make test-coverage      # Run tests with coverage

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

---

## Documentation

### Infrastructure
- **[Docker Documentation](docs/DOCKER.md)**: Comprehensive Docker infrastructure guide
  - Architecture and design decisions
  - Development workflow
  - Production deployment
  - Database management
  - Troubleshooting
  - Performance optimization
  - Security considerations

### API
- **API Architecture**: Located in `docs/api-architecture.md`
- **Implementation Guide**: Located in `docs/api-implementation-guide.md`
- **Quick Reference**: Located in `docs/api-quick-reference.md`

### Product Specifications
- **Product Requirements**: `docs/specs/001-vrss-social-platform/PRD.md`
- **Solution Design**: `docs/specs/001-vrss-social-platform/SDD.md`

---

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/vrss.git`
3. Run setup: `./scripts/dev-setup.sh`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `make test`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to your fork: `git push origin feature/your-feature`
9. Open a Pull Request

### Code Style

- **TypeScript**: Follow existing patterns, use strict type checking
- **Formatting**: Run `make format` before committing
- **Testing**: Add tests for new features
- **Documentation**: Update docs for user-facing changes

### Pull Request Process

1. Ensure all tests pass (`make test`)
2. Update documentation if needed
3. Add description of changes
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

---

## Production Deployment

### Quick Production Start

```bash
# Copy production environment
cp .env.production.example .env.production

# Edit production settings
nano .env.production

# Build production images
make prod-build

# Start with Nginx reverse proxy
make prod-start
```

### Production Checklist

Before deploying to production, ensure:

- [ ] All default passwords changed
- [ ] Secure JWT secret generated
- [ ] S3 bucket configured for media storage
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting set up
- [ ] Rate limiting configured
- [ ] CORS origins reviewed
- [ ] Error tracking enabled
- [ ] Log aggregation configured
- [ ] Email service configured
- [ ] Backup procedures tested

See [docs/DOCKER.md](docs/DOCKER.md) for detailed production deployment guide.

---

## Troubleshooting

### Service Won't Start

```bash
# Check container status
make ps

# View logs
make logs

# Check for port conflicts
lsof -i :3000
lsof -i :5173
lsof -i :5432

# Restart services
make restart
```

### Database Connection Issues

```bash
# Check database health
docker-compose exec db pg_isready -U vrss_user -d vrss

# Restart database
docker-compose restart db

# Reset database (WARNING: deletes data)
make db-reset
```

### Hot Reload Not Working

```bash
# Check file watching is enabled
make logs-backend | grep watch

# Rebuild containers
make rebuild

# Restart specific service
docker-compose restart backend
```

### Run Health Check

```bash
./scripts/health-check.sh
```

For more troubleshooting, see [docs/DOCKER.md](docs/DOCKER.md#troubleshooting).

---

## Performance

### Development
- Hot reload enabled for instant feedback
- Volume mounts optimized for macOS/Windows
- Database queries indexed for common operations

### Production
- Multi-stage builds reduce image size by 60-80%
- Nginx caching for static assets (1 year TTL)
- Database connection pooling
- Gzip compression enabled
- Resource limits prevent memory leaks

---

## Security

### Container Security
- Non-root users in all containers
- Minimal Alpine base images (~5MB)
- Regular security updates
- Network isolation

### Application Security
- HTTPS required in production
- CORS strictly configured
- Rate limiting enabled
- Security headers (CSP, HSTS, etc.)
- JWT authentication with rotating secrets
- SQL injection prevention via prepared statements

### Database Security
- Strong password requirements
- Connection encryption (SSL)
- Backup encryption
- Regular security audits

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/vrss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vrss/discussions)

---

## Acknowledgments

- Inspired by MySpace's customization philosophy
- Algorithm transparency influenced by emerging regulations (EU DSA, etc.)
- Visual algorithm builder inspired by Apple Shortcuts
- Community feedback from creators, intentional consumers, and local businesses

---

**Built with ❤️ by the VRSS team**

Start customizing your social media experience today!
