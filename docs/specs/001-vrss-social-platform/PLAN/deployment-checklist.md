# Deployment Checklist

Before deploying to production:

- [ ] Generate all secrets (`openssl rand -base64 32`)
- [ ] Set production environment variables (`.env.production`)
- [ ] Run database migrations (`make prod-migrate`)
- [ ] Build Docker images (`make prod-build`)
- [ ] Start services (`make prod-start`)
- [ ] Verify health checks (`make prod-health`)
- [ ] Run smoke tests (login, create post, view feed)
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring (Sentry, logs)
- [ ] Configure backups (database, S3)
- [ ] Set up alerts (downtime, errors)
- [ ] Load testing (100 concurrent users)
- [ ] Security scan (OWASP ZAP, npm audit)
- [ ] Review privacy policy and terms of service
- [ ] Test email delivery (verification, notifications)
- [ ] Verify S3 storage quota enforcement
- [ ] Test payment processing (if applicable)
- [ ] Final E2E tests on production environment

---
