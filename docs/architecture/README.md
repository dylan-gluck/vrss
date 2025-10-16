# VRSS Architecture Documentation

**Last Updated**: 2025-10-16

## Overview

This directory contains the complete architectural design for the VRSS social platform MVP. The architecture follows a **monolith-first, scale-ready** approach using modern technologies and containerization.

---

## Documents in This Directory

### 📋 [MONOLITH_ARCHITECTURE.md](./MONOLITH_ARCHITECTURE.md)
**Complete architectural design document**

Covers:
- Architecture overview and principles
- Monorepo structure with workspaces
- Multi-container Docker strategy
- Backend architecture (Bun + Hono RPC)
- Frontend architecture (React PWA)
- Database management (PostgreSQL + Drizzle)
- Development workflow
- Environment configuration
- Testing strategy
- Scalability path (monolith → services)
- Deployment options

**Start here** for comprehensive understanding.

---

### 🎯 [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)
**Architecture Decision Records (ADRs)**

Key decisions with rationale:
- ADR-001: Monorepo with Workspaces
- ADR-002: Multi-Container Docker Compose
- ADR-003: RPC-Style API with Hono
- ADR-004: PostgreSQL with Drizzle ORM
- ADR-005: Feature-Based Frontend Organization
- ADR-006: PWA with Vite and Workbox
- ADR-007: Better-auth for Authentication
- ADR-008: Gradual Service Extraction Path
- ADR-009: Repository Pattern
- ADR-010: TanStack Query for State Management
- ADR-011: Test-Driven Development

Each decision includes alternatives considered and trade-offs.

**Read this** to understand "why" behind architectural choices.

---

### 🚀 [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
**Step-by-step implementation guide**

Practical phases:
- Phase 0: Project Setup
- Phase 1: Backend Foundation
- Phase 2: Docker Setup
- Phase 3: Frontend Foundation
- Phase 4: First Feature (Authentication)
- Phase 5: Testing Setup

**Use this** to start building the MVP.

---

### 🐳 [DEPLOYMENT_VIEW.md](./DEPLOYMENT_VIEW.md)
**Deployment architecture and configuration**

Detailed specifications:
- Container architecture (services, ports, volumes)
- Environment variables by service
- Service dependencies and startup order
- Performance configuration (connection pools, caching)
- Health checks and readiness probes
- Deployment orchestration (dev and prod)

**Reference this** for deployment setup and operations.

---

### ⚡ [RUNTIME_VIEW.md](./RUNTIME_VIEW.md)
**Runtime behavior and dynamic interactions**

Covers:
- 7 primary user workflows (registration, login, post creation, feed viewing, follow, messaging, media upload)
- Mermaid sequence diagrams for each workflow
- Error handling strategies by error category (validation, auth, rate limiting, storage, server errors)
- Complex logic documentation (feed algorithms, storage quota calculation, friend detection, custom feed builder)
- Performance considerations and scalability notes

**Reference this** to understand how the system behaves during operation.

---

## Quick Architecture Summary

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Bun + Hono | Fast runtime + lightweight framework |
| **Frontend** | React + Vite | Modern UI with PWA support |
| **Database** | PostgreSQL 16 | Reliable ACID-compliant storage |
| **ORM** | Drizzle | Type-safe database access |
| **Auth** | Better-auth | Secure authentication |
| **Storage** | S3-compatible | Media uploads (MinIO local, S3 prod) |
| **State** | TanStack Query | Server state management |
| **Build** | Turborepo | Fast monorepo builds |
| **Container** | Docker Compose | Multi-container orchestration |

---

### Repository Structure

```
vrss/
├── apps/
│   ├── api/                    # Backend (Bun + Hono)
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── lib/            # Shared utilities
│   │   │   ├── db/             # Database schemas
│   │   │   └── main.ts         # API entry point
│   │   ├── drizzle/            # Migrations
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend (React PWA)
│       ├── src/
│       │   ├── features/       # Feature-based organization
│       │   ├── components/     # Shared components
│       │   ├── lib/            # API client, utilities
│       │   └── main.tsx        # App entry point
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/           # TypeScript types
│   └── config/                 # Shared configs
│
├── docker/                     # Docker configurations
├── docs/                       # Documentation
├── docker-compose.yml          # Local development
└── turbo.json                  # Turborepo config
```

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICES                          │
│                   PWA (Mobile / Desktop)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
│                   Port 8080 → Routes Traffic                 │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
    /api/*   │                                │  /
             ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Backend API Container   │    │  Frontend Web Container  │
│   Bun + Hono (RPC API)   │    │   Vite Dev Server /      │
│      Port 3000           │    │   Static Files           │
└──────────┬───────────────┘    └──────────────────────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌────────────────────┐  ┌─────────────────────┐
│  PostgreSQL        │  │   MinIO (S3)        │
│  Database          │  │   Media Storage     │
│  Port 5432         │  │   Ports 9000, 9001  │
└────────────────────┘  └─────────────────────┘
```

---

### Key Architectural Principles

1. **Separation of Concerns**
   - Backend and frontend are independently deployable
   - Clear module boundaries within backend
   - Feature-based organization in frontend

2. **Type Safety End-to-End**
   - Shared TypeScript types between backend/frontend
   - RPC-style API provides auto-complete and type checking
   - Drizzle ORM ensures database type safety

3. **Container-First Development**
   - All services containerized from day one
   - Docker Compose for local development
   - Production-ready deployment strategy

4. **Test-Driven Foundation**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user journeys

5. **Scalability Path**
   - Start with monolith for simplicity
   - Clear module boundaries enable service extraction
   - Horizontal scaling ready (multiple API instances)

---

### Development Workflow

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Run migrations
bun run db:migrate

# 3. Start development servers
bun run dev

# Access:
# - Frontend: http://localhost:8080
# - API: http://localhost:8080/api
# - PostgreSQL: localhost:5432
# - MinIO Console: http://localhost:9001
```

---

### Scalability Journey

```
Phase 1: MVP (0-10K users)
└─ Single monolith + PostgreSQL
   ├─ Multiple API container instances
   └─ NGINX load balancing

Phase 2: Optimized (10K-100K users)
└─ Monolith + optimizations
   ├─ Redis caching layer
   ├─ PostgreSQL read replicas
   ├─ CDN for static assets
   └─ Background job queue

Phase 3: Hybrid (100K-1M users)
└─ Extract high-load services
   ├─ Core monolith remains
   ├─ Media service (separate)
   ├─ Feed engine (separate)
   └─ Notification service (separate)

Phase 4: Microservices (1M+ users, if needed)
└─ Full service decomposition
   └─ Only if operational complexity justified
```

**Recommendation**: Stay in Phase 1-2 as long as possible.

---

## Getting Started

### For New Developers

1. Read [MONOLITH_ARCHITECTURE.md](./MONOLITH_ARCHITECTURE.md) for complete picture
2. Review [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) to understand "why"
3. Follow [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) to set up local environment

### For Architects / Tech Leads

1. Review all ADRs in [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)
2. Confirm decisions align with team capabilities and project goals
3. Adjust as needed before implementation begins

### For Product / Stakeholders

Key points:
- **Monolith-first** approach accelerates MVP delivery
- **Containerized** from day one ensures consistent environments
- **Clear scalability path** prevents rewrites as user base grows
- **Test-driven** foundation reduces bugs and technical debt
- **Type-safe** architecture catches errors at compile time

---

## Decision Approval Checklist

Before starting implementation, confirm:

- [ ] **Monorepo structure** approved
- [ ] **Multi-container Docker** approach approved
- [ ] **Technology stack** (Bun, Hono, PostgreSQL, React, Vite) approved
- [ ] **RPC-style API** pattern approved (vs REST/GraphQL)
- [ ] **Better-auth** for authentication approved
- [ ] **Test-driven development** approach approved
- [ ] **Scalability path** understood and accepted

---

## Next Steps

1. ✅ **Review architecture documents** (you are here)
2. ⏭️ **Approve architectural decisions**
3. ⏭️ **Set up project structure** (Phase 0 in Implementation Guide)
4. ⏭️ **Implement backend foundation** (Phase 1)
5. ⏭️ **Configure Docker environment** (Phase 2)
6. ⏭️ **Build frontend foundation** (Phase 3)
7. ⏭️ **Develop authentication** (Phase 4)
8. ⏭️ **Set up testing** (Phase 5)
9. ⏭️ **Iterate on MVP features**
10. ⏭️ **Deploy to staging**
11. ⏭️ **Launch MVP** 🚀

---

## Questions or Concerns?

If you have questions about:
- **Architecture decisions**: Review ADRs and rationale
- **Technology choices**: See alternatives considered in each ADR
- **Implementation details**: Check Implementation Guide for step-by-step instructions
- **Scaling concerns**: Review scalability path in main architecture doc

**Ready to build?** Start with Phase 0 in the Implementation Guide! 🚀
