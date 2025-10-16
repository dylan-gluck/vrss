# VRSS Architecture Visual Summary

**One-page visual guide to the complete architecture**

---

## 📐 System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Mobile Browser │  │ Desktop Browser │  │   PWA Installed │   │
│  │   (Safari/      │  │  (Chrome/       │  │   (Offline      │   │
│  │    Chrome)      │  │   Firefox)      │  │    Support)     │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼────────────────────┼────────────────────┼─────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │ HTTPS
┌────────────────────────────────┼─────────────────────────────────────┐
│                    REVERSE PROXY (NGINX)                             │
│                        Port 8080 / 443                               │
│                                                                       │
│  Routes:                                                              │
│  • /api/*  → Backend API                                            │
│  • /*      → Frontend SPA                                           │
│  • /health → Health checks                                          │
└───────────────┬───────────────────────────┬──────────────────────────┘
                │                           │
    ┌───────────┴──────────┐    ┌───────────┴──────────┐
    │   BACKEND API        │    │   FRONTEND WEB       │
    │   (Bun + Hono)       │    │   (React + Vite)     │
    │   Port 3000          │    │   Port 5173 (dev)    │
    │                      │    │   Static (prod)      │
    │  • RPC Endpoints     │    │  • PWA               │
    │  • Better-auth       │    │  • Service Worker    │
    │  • Business Logic    │    │  • Offline Cache     │
    └──────────┬───────────┘    └──────────────────────┘
               │
     ┌─────────┴─────────────────────┐
     │                               │
┌────┴──────┐            ┌───────────┴──────┐
│ PostgreSQL│            │  MinIO (S3)      │
│  Database │            │  Media Storage   │
│  Port 5432│            │  Ports 9000/9001 │
│           │            │                  │
│ • Users   │            │ • Images         │
│ • Posts   │            │ • Videos         │
│ • Feeds   │            │ • Audio          │
│ • Messages│            │ • Profiles       │
└───────────┘            └──────────────────┘
```

---

## 🗂️ Repository Structure

```
vrss/ (monorepo)
│
├── 📱 apps/
│   ├── api/                          # Backend Application
│   │   ├── src/
│   │   │   ├── modules/              # Feature Modules
│   │   │   │   ├── auth/             # Authentication
│   │   │   │   ├── users/            # User management
│   │   │   │   ├── posts/            # Posts & media
│   │   │   │   ├── feeds/            # Custom feeds & algorithms
│   │   │   │   ├── profiles/         # Profile customization
│   │   │   │   ├── messages/         # Direct messaging
│   │   │   │   └── notifications/    # Notifications
│   │   │   │
│   │   │   ├── lib/                  # Shared Utilities
│   │   │   │   ├── db.ts             # Database client
│   │   │   │   ├── s3.ts             # Storage client
│   │   │   │   ├── logger.ts         # Logging
│   │   │   │   └── errors.ts         # Error handling
│   │   │   │
│   │   │   ├── db/                   # Database Layer
│   │   │   │   └── schema.ts         # Drizzle schema
│   │   │   │
│   │   │   ├── middleware/           # Middleware
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── error.middleware.ts
│   │   │   │
│   │   │   └── main.ts               # Server Entry Point
│   │   │
│   │   ├── drizzle/                  # Migrations
│   │   ├── tests/                    # Tests
│   │   ├── Dockerfile                # Container definition
│   │   └── package.json
│   │
│   └── web/                          # Frontend Application
│       ├── src/
│       │   ├── features/             # Feature Modules
│       │   │   ├── auth/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/
│       │   │   │   ├── api/
│       │   │   │   └── pages/
│       │   │   ├── profile/
│       │   │   ├── feed/
│       │   │   ├── posts/
│       │   │   ├── discover/
│       │   │   ├── messages/
│       │   │   └── settings/
│       │   │
│       │   ├── components/           # Shared Components
│       │   │   ├── ui/               # Shadcn-ui
│       │   │   └── common/           # Reusable
│       │   │
│       │   ├── lib/                  # Utilities
│       │   │   ├── api-client.ts     # RPC client
│       │   │   ├── query-client.ts   # React Query
│       │   │   └── utils.ts
│       │   │
│       │   ├── hooks/                # Custom Hooks
│       │   ├── routes/               # Routing
│       │   ├── App.tsx
│       │   └── main.tsx              # App Entry Point
│       │
│       ├── public/                   # Static Assets
│       ├── tests/                    # Tests
│       ├── Dockerfile
│       ├── vite.config.ts
│       └── package.json
│
├── 📦 packages/
│   ├── shared-types/                 # Shared TypeScript Types
│   │   ├── src/
│   │   │   ├── api/                  # API contracts
│   │   │   ├── domain/               # Domain models
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                       # Shared Configs
│       ├── eslint-config/
│       ├── typescript-config/
│       └── tailwind-config/
│
├── 🐳 docker/                        # Docker Configs
│   ├── nginx/
│   │   ├── nginx.conf                # Dev config
│   │   └── nginx.prod.conf           # Prod config
│   ├── postgres/
│   │   └── init.sql                  # DB initialization
│   └── minio/
│       └── init.sh                   # Storage setup
│
├── 📝 docs/                          # Documentation
│   ├── architecture/                 # Architecture docs
│   └── specs/                        # Specifications
│
├── 🔧 scripts/                       # Utility Scripts
│   ├── setup.sh
│   ├── seed-db.sh
│   └── generate-types.sh
│
├── docker-compose.yml                # Dev environment
├── docker-compose.prod.yml           # Prod environment
├── turbo.json                        # Turborepo config
├── package.json                      # Root package
└── .env.example                      # Environment template
```

---

## 🔄 Data Flow

### User Registration Flow

```
┌──────┐     1. Fill Form     ┌─────────┐
│ User │ ──────────────────────> │  Web    │
└──────┘                        │  App    │
                                └────┬────┘
                                     │ 2. POST /api/users.create
                                     │    { username, email, password }
                                ┌────▼────┐
                                │   API   │
                                │ Server  │
                                └────┬────┘
                                     │ 3. Hash password
                                     │ 4. Validate data
                                ┌────▼────┐
                                │ Better- │
                                │  auth   │
                                └────┬────┘
                                     │ 5. Create user
                                ┌────▼────┐
                                │  Post-  │
                                │  greSQL │
                                └────┬────┘
                                     │ 6. Return user data
                                ┌────▼────┐
                                │   API   │
                                │ Response│
                                └────┬────┘
                                     │ 7. Success response
                                ┌────▼────┐
                                │  Web    │
                                │  App    │
                                └────┬────┘
                                     │ 8. Navigate to home
┌──────┐                        ┌────▼────┐
│ User │ <────────────────────── │  Home   │
└──────┘     Logged in!         │  Page   │
                                └─────────┘
```

### Post Creation with Media Flow

```
┌──────┐     1. Create Post    ┌─────────┐
│ User │ ──────────────────────> │  Web    │
└──────┘     + Upload Image     │  App    │
                                └────┬────┘
                                     │ 2. POST /api/uploads.presign
                                     │    { filename, mimetype }
                                ┌────▼────┐
                                │   API   │
                                └────┬────┘
                                     │ 3. Generate presigned URL
                                ┌────▼────┐
                                │  MinIO  │
                                │  (S3)   │
                                └────┬────┘
                                     │ 4. Return presigned URL
                                ┌────▼────┐
                                │  Web    │
                                │  App    │
                                └────┬────┘
                                     │ 5. Upload file directly to S3
                                ┌────▼────┐
                                │  MinIO  │
                                └────┬────┘
                                     │ 6. Upload complete
                                ┌────▼────┐
                                │  Web    │
                                │  App    │
                                └────┬────┘
                                     │ 7. POST /api/posts.create
                                     │    { content, mediaUrl }
                                ┌────▼────┐
                                │   API   │
                                └────┬────┘
                                     │ 8. Create post record
                                ┌────▼────┐
                                │  Post-  │
                                │  greSQL │
                                └────┬────┘
                                     │ 9. Post created
┌──────┐                        ┌────▼────┐
│ User │ <────────────────────── │  Feed   │
└──────┘     See new post       └─────────┘
```

---

## 🧪 Test Strategy

```
                    Testing Pyramid
                         /\
                        /  \
                       /E2E \        ← 5-10 critical flows
                      /______\         (Playwright)
                     /        \
                    /  Integr. \      ← ~50 API tests
                   /____________\       (Vitest + test DB)
                  /              \
                 /   Unit Tests   \   ← ~200+ tests
                /                  \    (Vitest/Bun test)
               /____________________\

Fast Feedback ────────────────────────> Comprehensive Coverage
Low Cost ──────────────────────────────> High Confidence
```

**Unit Tests**: Business logic, utilities, validation
**Integration Tests**: API endpoints, database operations
**E2E Tests**: Critical user journeys (auth, post, feed)

---

## 📈 Scalability Journey

```
Phase 1: MVP (0-10K users)
┌────────────────────────────────────────┐
│  Load Balancer (NGINX)                 │
├────────────────────────────────────────┤
│  API Container × 1-2                   │
├────────────────────────────────────────┤
│  PostgreSQL (Single instance)          │
└────────────────────────────────────────┘
Cost: $12-50/month (VPS)
```

```
Phase 2: Optimized (10K-100K users)
┌────────────────────────────────────────┐
│  Load Balancer + CDN                   │
├────────────────────────────────────────┤
│  API Containers × 3-5                  │
├────────────────────────────────────────┤
│  Redis Cache Layer                     │
├────────────────────────────────────────┤
│  PostgreSQL Primary + Read Replica     │
└────────────────────────────────────────┘
Cost: $100-200/month (Cloud platform)
```

```
Phase 3: Hybrid (100K-1M users)
┌────────────────────────────────────────┐
│  API Gateway + CDN                     │
├────────────────────────────────────────┤
│  Core API (Monolith) × 5+              │
│  Media Service (Extracted)             │
│  Feed Engine (Extracted)               │
│  Notification Service (Extracted)      │
├────────────────────────────────────────┤
│  Redis Cluster                         │
├────────────────────────────────────────┤
│  PostgreSQL Cluster + Read Replicas    │
└────────────────────────────────────────┘
Cost: $500-1000/month
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────┐
│              Application Layer                   │
│                                                  │
│  • Input Validation (Zod schemas)               │
│  • SQL Injection Prevention (Drizzle ORM)       │
│  • XSS Protection (React escaping)              │
│  • CSRF Protection (Better-auth)                │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│             Authentication Layer                 │
│                                                  │
│  • Password Hashing (bcrypt/argon2)             │
│  • Session Management (Better-auth)             │
│  • JWT Tokens (HTTPOnly cookies)                │
│  • Rate Limiting (API level)                    │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│              Transport Layer                     │
│                                                  │
│  • HTTPS/TLS (NGINX)                            │
│  • Secure Headers (HSTS, CSP)                   │
│  • CORS Configuration                           │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│            Infrastructure Layer                  │
│                                                  │
│  • Network Isolation (Docker networks)          │
│  • Secret Management (Environment variables)    │
│  • Database Encryption at Rest                  │
│  • Regular Backups                              │
└─────────────────────────────────────────────────┘
```

---

## ⚡ Performance Characteristics

### API Response Times (Target)

| Endpoint Type | Target | Max Acceptable |
|---------------|--------|----------------|
| Simple GET (cached) | <50ms | <100ms |
| Simple GET (DB) | <100ms | <200ms |
| Complex Query | <300ms | <500ms |
| POST/PUT | <200ms | <400ms |
| Media Upload | <2s | <5s |

### Frontend Performance (Target)

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | <1.5s | Lighthouse |
| Time to Interactive | <3.5s | Lighthouse |
| Largest Contentful Paint | <2.5s | Lighthouse |
| Cumulative Layout Shift | <0.1 | Lighthouse |

### Database

| Operation | Target |
|-----------|--------|
| Simple SELECT | <10ms |
| JOIN (2-3 tables) | <50ms |
| Complex Feed Query | <200ms |

---

## 🚀 Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Developer pushes to main branch                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GitHub Actions Triggered                                    │
│     • Checkout code                                             │
│     • Install dependencies                                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Run Tests                                                   │
│     • Lint (ESLint)                                             │
│     • Type check (TypeScript)                                   │
│     • Unit tests (Vitest/Bun)                                   │
│     • Integration tests (Vitest + test DB)                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Build Docker Images                                         │
│     • Build API image (apps/api/Dockerfile)                     │
│     • Build Web image (apps/web/Dockerfile)                     │
│     • Tag with git SHA                                          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Push to Registry                                            │
│     • Docker Hub / GitHub Container Registry                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Deploy to Environment                                       │
│     • SSH to server OR                                          │
│     • Cloud platform API (Railway/Fly.io)                       │
│     • Run migrations (bun run db:migrate)                       │
│     • Pull new images                                           │
│     • Restart containers                                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Health Checks                                               │
│     • GET /health endpoint                                      │
│     • Database connectivity                                     │
│     • S3 connectivity                                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. Success! Notify team (Slack/Discord)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Development Workflow

```
┌──────────────────────────────────────────────────────────────┐
│  Morning: Start development environment                      │
│                                                               │
│  $ docker-compose up -d                                      │
│  $ bun run dev                                               │
│                                                               │
│  Services running:                                           │
│  ✓ PostgreSQL (localhost:5432)                              │
│  ✓ MinIO (localhost:9000)                                   │
│  ✓ API (localhost:3000)                                     │
│  ✓ Web (localhost:5173)                                     │
│  ✓ NGINX (localhost:8080)                                   │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Development cycle                                           │
│                                                               │
│  1. Create feature branch                                    │
│     $ git checkout -b feature/user-profiles                  │
│                                                               │
│  2. Make changes (hot reload active)                         │
│     • Backend: Bun watches files                             │
│     • Frontend: Vite HMR                                     │
│                                                               │
│  3. Write tests (TDD)                                        │
│     $ bun run test --watch                                   │
│                                                               │
│  4. Check types                                              │
│     $ bun run type-check                                     │
│                                                               │
│  5. Lint code                                                │
│     $ bun run lint                                           │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Commit and push                                             │
│                                                               │
│  $ git add .                                                 │
│  $ git commit -m "feat: add user profile customization"     │
│  $ git push origin feature/user-profiles                    │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Create pull request                                         │
│  • CI runs automatically                                     │
│  • Review with team                                          │
│  • Merge to main                                             │
│  • Auto-deploy to staging                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    Logging Layer                             │
│                                                              │
│  • Structured logs (JSON format)                            │
│  • Log levels (DEBUG, INFO, WARN, ERROR)                    │
│  • Request IDs for tracing                                  │
│  • User context in logs                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Metrics Layer                             │
│                                                              │
│  • Request counts                                            │
│  • Response times (p50, p95, p99)                           │
│  • Error rates                                               │
│  • Database query times                                      │
│  • Cache hit rates                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Health Checks Layer                          │
│                                                              │
│  GET /health:                                                │
│  {                                                           │
│    "status": "ok",                                           │
│    "database": "connected",                                  │
│    "storage": "connected",                                   │
│    "uptime": "3d 12h 45m"                                    │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Criteria

### MVP Launch Ready When:

- ✅ All Phase 1 features implemented (auth, posts, profiles, feeds)
- ✅ Test coverage >80% for backend, >70% for frontend
- ✅ All E2E critical paths passing
- ✅ Performance targets met (<2s page load)
- ✅ Security review completed
- ✅ Docker deployment tested on staging
- ✅ Database migrations reversible
- ✅ Monitoring and logging in place
- ✅ Error handling comprehensive
- ✅ Documentation complete

### Scale-Ready When:

- ✅ Horizontal scaling tested (multiple API instances)
- ✅ Database connection pooling optimized
- ✅ Caching layer implemented (Redis)
- ✅ CDN configured for static assets
- ✅ Load testing completed (100 concurrent users)
- ✅ Auto-scaling configured
- ✅ Backup and recovery tested
- ✅ Service extraction boundaries clear

---

## 📚 Quick Reference

### Key Commands

```bash
# Start everything
bun run docker:up && bun run dev

# Run tests
bun run test              # All tests
bun run test:e2e          # E2E only

# Database
bun run db:migrate        # Run migrations
bun run db:studio         # Open Drizzle Studio

# Build for production
bun run build

# Deploy (depends on platform)
git push origin main      # Triggers CI/CD
```

### Key URLs (Local Dev)

```
Frontend:    http://localhost:8080
API:         http://localhost:8080/api
API Direct:  http://localhost:3000
Postgres:    postgresql://vrss:password@localhost:5432/vrss_dev
MinIO:       http://localhost:9001
```

### Key Directories

```
/apps/api/src/modules/     # Backend features
/apps/web/src/features/    # Frontend features
/packages/shared-types/    # Shared types
/docker/                   # Docker configs
/docs/architecture/        # Architecture docs
```

---

**Need More Details?** See full documentation:
- [MONOLITH_ARCHITECTURE.md](./MONOLITH_ARCHITECTURE.md) - Complete design
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Decision rationale
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Step-by-step setup
- [ARCHITECTURE_COMPARISON.md](./ARCHITECTURE_COMPARISON.md) - Alternatives

**Ready to build?** 🚀
