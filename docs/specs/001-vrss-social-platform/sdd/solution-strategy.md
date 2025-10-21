# Solution Strategy

## Architecture Pattern: Monolith with Clear Module Boundaries

**Approach**: Feature-based monolithic application with containerized deployment, organized as a monorepo with clear separation between backend, frontend, and shared packages.

**Structure**:
- **Monorepo Organization**: Turborepo managing multiple apps and packages
- **Backend**: Bun runtime + Hono framework with RPC-style API
- **Frontend**: React PWA with Vite build tool
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Multi-container Docker Compose setup

**Why Monolith for MVP**:
1. **Simplicity**: Single deployment unit, no distributed systems complexity
2. **Development Speed**: Faster iteration, no network latency between components
3. **Type Safety**: Shared types across frontend/backend in monorepo
4. **Cost-Effective**: Single server can handle MVP traffic ($12-50/month)
5. **Debugging**: Easier to trace requests through single codebase
6. **Database Transactions**: ACID guarantees without distributed transactions

**Scalability Path**: Clear module boundaries allow gradual extraction to microservices when needed (100K+ users).

## Integration Approach

**Greenfield MVP** - No existing system integration required.

**External Integrations**:
1. **S3-Compatible Storage**: MinIO (dev) / AWS S3 (prod) for media
2. **Email Service**: SMTP or SendGrid for verification emails
3. **Better-auth**: Pre-built authentication library

**Integration Pattern**:
- Backend owns all integrations
- Frontend only integrates with backend RPC API
- Direct S3 upload from frontend (via presigned URLs)

## Justification for Key Decisions

### 1. RPC-Style API (Not REST or GraphQL)
**Why**:
- Type-safe end-to-end (shared TypeScript types)
- Single endpoint (`/api/rpc`) simplifies routing
- Procedure-based naming matches domain actions
- Less boilerplate than REST, simpler than GraphQL
- Better developer experience with autocomplete

**Trade-off**: Less standardized than REST, but gains in DX and type safety outweigh this.

### 2. Prisma ORM (Per PLAN.md)
**Why**:
- Type-safe database queries
- Excellent migration system
- Auto-generated client with full TypeScript support
- Great developer experience
- Industry-proven with large community

**Trade-off**: Slightly heavier than raw SQL, but DX and safety worth it.

### 3. Better-auth (Session-based)
**Why**:
- Built for Bun + Hono
- Database-backed sessions (not JWT)
- Better security than JWT for web apps
- Email verification built-in
- Extensible for future OAuth

**Trade-off**: Sessions require database lookups, but acceptable for MVP scale.

### 4. Monorepo with Turborepo
**Why**:
- Shared types between frontend/backend (single source of truth)
- Atomic commits across both apps
- Fast builds with intelligent caching
- Better than multi-repo for small team

**Trade-off**: Slightly more complex setup, but massive DX improvement.

### 5. PostgreSQL (Not MongoDB or graph DB)
**Why**:
- Relational model fits social graph well
- JSONB for flexible profile customization
- Excellent performance with proper indexing
- Battle-tested for production
- Graph DB can be added later if needed

**Trade-off**: More complex queries for deep graph traversal, mitigated by denormalization.

## Key Design Decisions

1. **Feature-Based Organization**: Code organized by business domain (auth, feed, profile) not technical layer
2. **Test-Driven Development**: Infrastructure and tests before features
3. **Two-Phase File Upload**: Presigned S3 URLs avoid backend bottleneck
4. **JSONB for Customization**: Profile styles and feed algorithms stored as flexible JSON
5. **Cursor-Based Pagination**: Better UX than offset pagination for feeds
6. **PWA Offline-First**: Service worker caching for offline experience
7. **Zustand for State**: Simpler than Redux, better than Context for complex state
8. **Shadcn-ui Components**: Radix UI + Tailwind, copy-paste approach vs NPM dependency

See `/docs/architecture/ARCHITECTURE_DECISIONS.md` for complete ADR documentation.
