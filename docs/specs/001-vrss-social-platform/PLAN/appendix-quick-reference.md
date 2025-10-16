# Appendix: Quick Reference

**Key Commands:**
```bash
# Start everything
make start

# Run all tests
make test

# Run with coverage
make test-coverage

# Backend dev mode
cd apps/api && bun run dev

# Frontend dev mode
cd apps/web && bun run dev

# Database migrations
cd apps/api && bunx prisma migrate dev

# E2E tests
cd e2e && bunx playwright test
```

**Critical Paths (100% Coverage Required):**
1. Authentication flow (register, verify, login, logout)
2. Storage quota enforcement (check, upload, delete)
3. Session management (create, refresh, expire, logout)
4. Data integrity (post creation, profile updates, messages)

**Specification Compliance:**
- Always reference PRD for business requirements
- Always reference SDD for technical design
- Never deviate without documenting reason
- Update specs if implementation improves design
