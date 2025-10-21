# Quality Requirements

**Complete Documentation**: @docs/specs/001-vrss-social-platform/QUALITY_REQUIREMENTS.md

## Performance Requirements

**API Response Time**: P95 < 200ms
- Read operations: <100ms (user profile, post fetch)
- Write operations: <200ms (post creation, follow action)
- Complex queries: <300ms (custom feed execution, discovery algorithm)

**Page Load**: <2 seconds on 3G network
- First Contentful Paint (FCP): <1.5s
- Time to Interactive (TTI): <3.5s
- Largest Contentful Paint (LCP): <2.5s

**Feed Rendering**: <50ms for 20 posts
- Virtualized scrolling for performance
- Memoization for expensive computations
- Optimistic updates for instant feedback

**Database Performance**: P95 < 50ms
- Connection pool: min=5, max=20
- Query timeout: 30 seconds
- Index all foreign keys and frequently queried columns

**Rate Limiting**:
- Default: 60 requests/minute
- auth.login: 5 requests/minute
- post.create: 10 requests/minute
- media.initiateUpload: 10 requests/minute

## Security Requirements

**Authentication**:
- Session-based with Better-auth (7-day expiration with sliding window)
- Email verification required for new accounts
- Password: min 12 chars, complexity requirements (uppercase, lowercase, number)

**Authorization**:
- Role-based access control (user, admin)
- Resource ownership validation (can only edit own content)
- Profile visibility enforcement (PUBLIC, PRIVATE, UNLISTED)

**Data Protection**:
- Encryption at rest: Database volumes, S3 storage
- Encryption in transit: HTTPS/TLS 1.3, database SSL connections
- Password hashing: bcrypt with cost factor 12

**Input Validation**:
- Zod schemas for all RPC inputs
- File type validation by magic bytes (not just extension)
- SQL injection prevention via Prisma parameterized queries
- XSS protection: DOMPurify sanitization, output encoding, CSP headers

**File Upload Security**:
- Two-phase upload with presigned URLs (15-minute expiration)
- S3 bucket access control (no public access)
- File type whitelist: image/*, video/*, audio/*
- Max file size: 100MB per file
- Storage quota enforcement before upload

## Reliability Requirements

**Uptime Target**: 99.5% monthly (3.6 hours downtime allowed)

**Error Recovery**:
- Circuit breakers for external services
- Retry logic with exponential backoff (3 attempts max)
- Graceful degradation (offline mode, cached content)

**Data Integrity**:
- ACID transactions for critical operations (money, auth, ownership changes)
- Soft deletes with 30-day recovery window
- Foreign key constraints enforced at database level
- Audit trail for sensitive operations

**Backup Strategy**:
- Daily automated backups
- 30-day retention period
- Point-in-time recovery capability
- Recovery Time Objective (RTO): <4 hours
- Recovery Point Objective (RPO): <1 hour

## Usability Requirements

**User Experience**:
- Loading states for operations >1 second
- Feedback for all user actions (toasts, modals, inline messages)
- Confirmation dialogs for destructive actions

**Accessibility**: WCAG 2.1 Level AA compliance
- Keyboard navigation support (tab order, focus indicators)
- Screen reader support (ARIA labels, semantic HTML)
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Touch targets ≥ 44x44px on mobile

**Mobile-First Design**:
- Responsive 320px-1920px
- Touch-friendly interactions
- Optimized for 3G networks

**PWA Capabilities**:
- Installable (web app manifest)
- Offline viewing (cached content)
- Background sync (queued operations)
