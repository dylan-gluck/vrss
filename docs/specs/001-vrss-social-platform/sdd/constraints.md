# Constraints

## Technical Constraints
- **Runtime**: Bun (JavaScript runtime, TypeScript-native)
- **Backend Framework**: Hono (lightweight, RPC-friendly)
- **Frontend Framework**: React 18+ with TypeScript 5.5+
- **Database**: PostgreSQL 16+ (with Prisma ORM)
- **Authentication**: Better-auth (session-based, database-backed)
- **UI Library**: Shadcn-ui (Radix UI + Tailwind CSS)
- **Build Tool**: Vite 5+ for frontend, Turborepo for monorepo
- **Container Runtime**: Docker with Docker Compose
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Mobile Support**: Progressive Web App (PWA) - no native apps for MVP
- **Performance Targets**:
  - Page load: <2 seconds (3G network)
  - Feed rendering: <50ms (initial load)
  - Custom feed execution: <100ms
  - API response time: <200ms (p95)
  - Database queries: <50ms (p95)

## Organizational Constraints
- **Team Size**: Small team (MVP development)
- **Deployment**: Self-hosted VPS or cloud (DigitalOcean, Linode, AWS)
- **Budget**: MVP optimized for $12-50/month hosting
- **Development Approach**: Test-driven, infrastructure-first, then features
- **Code Organization**: Monorepo structure with clear module boundaries
- **Documentation**: All architecture decisions documented (see `/docs/architecture/`)

## Security & Compliance Constraints
- **Authentication**: Email/password with email verification (OAuth social login future)
- **Session Management**: Database-backed sessions (7-day expiry, sliding window)
- **Data Protection**:
  - HTTPS/TLS required for all connections
  - Passwords hashed with bcrypt (10 rounds)
  - Session tokens: 256-bit random
  - Database encryption at rest
- **Authorization**: Resource ownership checks, profile visibility controls
- **Privacy**: User data export (GDPR), account deletion (30-day grace period)
- **File Upload Security**:
  - Type validation (magic bytes)
  - Size limits (50MB per file)
  - Direct S3 upload (presigned URLs)
  - Storage quotas enforced (50MB free, 1GB+ paid)
- **API Security**: Input validation (Zod), XSS prevention, CSRF protection, rate limiting
- **Compliance**: Basic GDPR compliance for MVP (data export, deletion)
