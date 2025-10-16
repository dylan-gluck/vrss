# VRSS Security Documentation

Complete security architecture and implementation guide for the VRSS social platform MVP.

---

## Overview

This security design provides a production-ready authentication and security implementation using **Better-auth** with **Bun + Hono** backend. The architecture prioritizes security by default while maintaining developer experience and performance.

**Security Pillars:**
1. **Defense in Depth**: Multiple layers of security controls
2. **Secure by Default**: All endpoints protected, all inputs validated
3. **Privacy First**: User control over data and visibility
4. **Production Ready**: Scalable, maintainable, monitorable
5. **Compliance Ready**: GDPR-compliant data handling

---

## Documentation Structure

### 1. [SECURITY_DESIGN.md](./SECURITY_DESIGN.md)
**Comprehensive Security Architecture**

Complete design specification covering:
- Better-auth integration with Bun + Hono
- Authentication flows (registration, login, password reset)
- Session management strategy (cookies, expiration, refresh)
- Authorization patterns (ownership, visibility, quotas)
- API security (validation, CSRF, XSS, rate limiting)
- Media upload security (presigned URLs, validation, quotas)
- Data protection (encryption, hashing, secrets)
- Privacy controls (visibility settings, data export, deletion)
- Security headers and configuration
- Implementation timeline and checklist

**When to use**: Reference for architectural decisions, security patterns, and complete system design.

---

### 2. [SECURITY_IMPLEMENTATION_GUIDE.md](./SECURITY_IMPLEMENTATION_GUIDE.md)
**Quick Start Implementation Guide**

Practical implementation guide with:
- Step-by-step setup instructions
- Code examples and patterns
- Frontend integration (React)
- Protected routes and components
- Common security middleware
- File upload implementation
- Database migrations
- Testing examples
- Troubleshooting guide

**When to use**: Building the authentication system, implementing security features, debugging issues.

---

### 3. [AUTH_FLOWS.md](./AUTH_FLOWS.md)
**Visual Authentication Flows**

Detailed flow diagrams for:
- Registration with email verification
- Login with rate limiting
- Session validation (middleware)
- Password reset flow
- File upload (presigned URLs)
- Authorization checks (profile visibility)
- Account deletion (soft delete)
- Rate limiting mechanism

**When to use**: Understanding how authentication works, debugging flow issues, onboarding new developers.

---

### 4. [SECURITY_TESTING.md](./SECURITY_TESTING.md)
**Complete Testing Guide**

Comprehensive testing coverage:
- Authentication testing (registration, login, password reset)
- Authorization testing (protected endpoints, ownership)
- Input validation testing (XSS, SQL injection, CSRF)
- Session management testing
- File upload security testing
- API security testing (CORS, headers, rate limits)
- Common attack scenarios and defenses
- Automated testing tools (OWASP ZAP, Snyk, Semgrep)
- Manual penetration testing methodology
- Security monitoring queries
- Pre-launch security checklist

**When to use**: Testing implementation, security audits, penetration testing, pre-launch validation.

---

## Quick Reference

### Technology Stack

```
Authentication: Better-auth
Backend: Bun + Hono
Database: PostgreSQL (Prisma ORM)
Frontend: React + Vite
Storage: S3-compatible
Rate Limiting: Redis
Email: Resend (or similar)
```

### Security Features

**Authentication**
- Email/password with verification
- Session-based (7-day expiration)
- Password requirements (12+ chars, complexity)
- Rate limiting (10 attempts / 15 min)
- Password reset with 1-hour tokens

**Authorization**
- Resource ownership checks
- Profile visibility (PUBLIC, PRIVATE, UNLISTED)
- Storage quota enforcement (50MB free)
- Role-based access (future)

**Data Protection**
- Passwords hashed with bcrypt
- Session tokens (256-bit random)
- HttpOnly, Secure cookies
- Database encryption at rest
- TLS in transit

**API Security**
- Input validation (Zod schemas)
- XSS prevention (output sanitization)
- CSRF protection (SameSite cookies)
- SQL injection prevention (Prisma)
- Rate limiting per endpoint
- Security headers (CSP, HSTS, etc.)

**File Upload Security**
- Presigned URLs (15-min expiration)
- File type validation (magic bytes)
- Size limits (50MB per file)
- Storage quota per user
- Direct S3 upload (not through server)
- Virus scanning (optional)

---

## Getting Started

### 1. Read the Design

Start with [SECURITY_DESIGN.md](./SECURITY_DESIGN.md) to understand the architecture:
- Better-auth integration approach
- Session management strategy
- Authorization patterns
- Security best practices

### 2. Implement Authentication

Follow [SECURITY_IMPLEMENTATION_GUIDE.md](./SECURITY_IMPLEMENTATION_GUIDE.md):

```bash
# Install dependencies
bun add better-auth @better-auth/prisma-adapter
bun add hono @hono/zod-validator zod
bun add @prisma/client ioredis

# Set up database
bunx prisma migrate dev

# Configure Better-auth
# See guide for auth.ts setup

# Implement middleware
# See guide for middleware patterns
```

### 3. Understand the Flows

Reference [AUTH_FLOWS.md](./AUTH_FLOWS.md) to understand:
- How registration works (email verification)
- How login works (session creation)
- How sessions are validated (middleware)
- How file uploads work (presigned URLs)

### 4. Test Security

Use [SECURITY_TESTING.md](./SECURITY_TESTING.md) to:
- Test authentication endpoints
- Validate authorization checks
- Test for common vulnerabilities
- Run automated security scans
- Perform manual penetration testing

---

## Implementation Timeline

### Week 1: Core Authentication
- [ ] Install and configure Better-auth
- [ ] Set up database schema (Prisma)
- [ ] Implement registration/login endpoints
- [ ] Create authentication middleware
- [ ] Set up email service (Resend)

### Week 2: Authorization & API Security
- [ ] Implement authorization middleware
- [ ] Add input validation (Zod)
- [ ] Configure rate limiting (Redis)
- [ ] Set up security headers
- [ ] Add CSRF protection

### Week 3: Media Security
- [ ] Implement file upload flow (presigned URLs)
- [ ] Configure S3 bucket security
- [ ] Add storage quota enforcement
- [ ] Set up CDN (CloudFront/Cloudflare)
- [ ] Add file type validation

### Week 4: Privacy & Compliance
- [ ] Implement profile visibility controls
- [ ] Add data export functionality
- [ ] Create account deletion flow
- [ ] Set up audit logging
- [ ] Write privacy policy

### Week 5: Testing & Launch
- [ ] Run security test suite
- [ ] Perform penetration testing
- [ ] Configure error tracking (Sentry)
- [ ] Set up monitoring and alerts
- [ ] Complete pre-launch security checklist

---

## Security Checklist

### Pre-Launch (Critical)

- [ ] HTTPS enforced (production)
- [ ] Environment variables secured
- [ ] Passwords hashed (bcrypt)
- [ ] Sessions secure (HttpOnly, Secure cookies)
- [ ] Input validation on all endpoints
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] File upload validation
- [ ] Storage quota enforced
- [ ] Error messages don't leak info
- [ ] Security headers configured
- [ ] Database backups enabled

### Post-Launch (Important)

- [ ] Monitoring and alerting active
- [ ] Audit logs configured
- [ ] Incident response plan documented
- [ ] Regular security updates scheduled
- [ ] Dependency scanning automated
- [ ] Penetration testing scheduled

---

## Common Security Patterns

### Protected Endpoint

```typescript
import { requireAuth, requireVerifiedEmail } from './middleware/auth';

router.post(
  '/posts',
  requireAuth,              // Must be authenticated
  requireVerifiedEmail,     // Must have verified email
  zValidator('json', schema), // Input validation
  async (c) => {
    const user = c.get('user'); // Always available
    // Create post
  }
);
```

### Resource Ownership

```typescript
router.delete('/posts/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const postId = c.req.param('id');

  const post = await prisma.post.findUnique({
    where: { id: postId }
  });

  if (post.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await prisma.post.delete({ where: { id: postId } });
  return c.json({ success: true });
});
```

### File Upload

```typescript
// 1. Request upload URL
const { uploadId, presignedUrl } = await fetch('/api/upload/request-upload', {
  method: 'POST',
  body: JSON.stringify({
    filename: file.name,
    contentType: file.type,
    size: file.size
  })
}).then(r => r.json());

// 2. Upload to S3
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// 3. Confirm upload
await fetch(`/api/upload/confirm-upload/${uploadId}`, {
  method: 'POST'
});
```

---

## Testing Commands

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123","username":"test"}'

# Test login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"SecureP@ss123"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/posts \
  -b cookies.txt

# Run security scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000

# Check dependencies
bun audit
```

---

## Security Resources

### Documentation
- [Better-auth Docs](https://better-auth.com/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

### Tools
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Penetration testing toolkit
- **Snyk**: Dependency vulnerability scanner
- **Semgrep**: Static analysis (SAST)
- **securityheaders.com**: Check HTTP security headers

### Standards
- **OWASP ASVS**: Application Security Verification Standard
- **PCI DSS**: Payment card industry standards (if applicable)
- **GDPR**: EU data protection regulations
- **CCPA**: California Consumer Privacy Act

---

## Support & Questions

### Common Issues

**Q: Sessions not persisting across requests?**
A: Check CORS credentials and cookie domain settings. See [SECURITY_IMPLEMENTATION_GUIDE.md](./SECURITY_IMPLEMENTATION_GUIDE.md) troubleshooting section.

**Q: Rate limiting not working?**
A: Ensure Redis is running and connected. Check rate limit middleware configuration.

**Q: File uploads failing?**
A: Verify S3 credentials, bucket permissions, and CORS configuration.

**Q: CSRF errors?**
A: Check SameSite cookie settings and CORS origin configuration.

### Getting Help

1. Check troubleshooting sections in implementation guide
2. Review flow diagrams in AUTH_FLOWS.md
3. Search security testing guide for similar scenarios
4. Check Better-auth documentation
5. Review OWASP security guidelines

---

## Security Principles

1. **Never trust user input** - Validate and sanitize everything
2. **Defense in depth** - Multiple layers of security
3. **Principle of least privilege** - Minimal permissions needed
4. **Fail securely** - Errors should not expose information
5. **Complete mediation** - Check permissions on every access
6. **Secure by default** - Opt-in to less secure options
7. **Keep it simple** - Complexity is the enemy of security
8. **Monitor and respond** - Detect and react to threats

---

## Maintenance

### Regular Tasks

**Weekly**
- Review failed login attempts
- Check error rates and logs
- Update dependencies (security patches)

**Monthly**
- Review audit logs
- Analyze security metrics
- Update security documentation

**Quarterly**
- Rotate secrets and credentials
- Conduct security audit
- Review and update policies
- Penetration testing (if budget allows)

**Annually**
- Comprehensive security review
- Third-party penetration test
- Update threat model
- Security training for team

---

## License & Attribution

This security design was created specifically for VRSS social platform MVP.

**Technologies Used:**
- Better-auth (authentication library)
- Bun (JavaScript runtime)
- Hono (web framework)
- PostgreSQL (database)
- Prisma (ORM)
- Redis (rate limiting)

**Standards & Guidelines:**
- OWASP Top 10
- OWASP ASVS
- NIST Cybersecurity Framework
- CIS Benchmarks

---

## Conclusion

This security documentation provides everything needed to build a secure, production-ready authentication system for VRSS. The design balances security best practices with practical implementation, ensuring the platform is both secure and maintainable.

**Next Steps:**
1. Review all documentation
2. Follow implementation guide
3. Test thoroughly
4. Launch confidently

**Remember:** Security is an ongoing process, not a one-time implementation. Stay vigilant, keep learning, and always prioritize user privacy and data protection.

---

**Last Updated:** 2025-10-16
**Version:** 1.0
**Status:** Design Complete - Ready for Implementation
