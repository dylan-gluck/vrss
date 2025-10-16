# Better-auth Core Setup Tests

## Overview

This directory contains comprehensive TDD tests for the Better-auth integration in VRSS. These tests were written **before implementation** following Test-Driven Development principles.

## Test File

- **`better-auth-setup.test.ts`** - Core Better-auth configuration and setup validation

## Test Coverage

### 1. Better-auth Initialization (5 tests)
Validates that the Better-auth instance is properly configured and exported:

- ✅ Auth instance is exported and defined
- ✅ Required API methods exist (signUp, signIn, signOut, getSession)
- ✅ Configuration object is valid
- ✅ Session settings are configured
- ✅ Secret is configured from environment

### 2. Prisma Adapter Connection (3 tests)
Validates database adapter integration:

- ✅ Prisma adapter is initialized
- ✅ PostgreSQL connection is established
- ✅ Database queries work through Prisma

### 3. Session Table Validation (6 tests)
Validates database schema for authentication:

- ✅ User table has required columns (id, username, email, emailVerified, timestamps)
- ✅ Username column is unique
- ✅ Password hash is stored in User table
- ✅ Session table has required columns (id, userId, token, expiresAt, timestamps)
- ✅ Email verification support exists
- ✅ Session expiration works via expiresAt column

### 4. Configuration Validation (10 tests)
Validates environment and configuration requirements:

- ✅ BETTER_AUTH_SECRET is set (minimum 32 characters)
- ✅ DATABASE_URL is valid PostgreSQL connection string
- ✅ Session expiry is 7 days (604800 seconds)
- ✅ Session update age is 24 hours (86400 seconds)
- ✅ Cookie cache enabled with 5-minute maxAge
- ✅ Secure cookie settings configured
- ✅ baseURL configured from APP_URL
- ✅ Cookie sameSite set to 'lax'
- ✅ Email verification required
- ✅ Minimum password length of 12 characters enforced

## Total Test Count: 24 Tests

## Running Tests

```bash
# Run all Better-auth tests
bun test test/auth/better-auth-setup.test.ts

# Run with watch mode
bun test --watch test/auth/better-auth-setup.test.ts

# Run with coverage
bun test --coverage test/auth/better-auth-setup.test.ts
```

## Expected Results (TDD Red Phase)

These tests are **expected to fail** initially because the implementation doesn't exist yet. This is normal and correct for TDD:

1. **Red Phase** (Current): Tests fail because `src/lib/auth.ts` doesn't exist
2. **Green Phase** (Next): Implement `src/lib/auth.ts` to make tests pass
3. **Refactor Phase** (Final): Clean up implementation while keeping tests green

## Implementation Requirements

Based on these tests, the implementation must:

### File Structure
```
src/lib/auth.ts - Main Better-auth configuration
```

### Required Dependencies
```bash
bun add better-auth
bun add @better-auth/prisma-adapter
```

### Environment Variables
```env
BETTER_AUTH_SECRET=<minimum-32-characters>
APP_URL=http://localhost:3000
WEB_URL=http://localhost:5173
DATABASE_URL=postgresql://...
```

### Configuration Specifications

From `SECURITY_DESIGN.md` (docs/SECURITY_DESIGN.md):

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  advanced: {
    cookieSameSite: "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    cookiePrefix: "vrss",
    generateId: false,
  },

  baseURL: process.env.APP_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    process.env.APP_URL || "http://localhost:3000",
    process.env.WEB_URL || "http://localhost:5173",
  ],
});
```

## Database Schema Requirements

The Prisma schema (`prisma/schema.prisma`) already includes the required tables:

- ✅ **User** table with username, email, emailVerified, passwordHash
- ✅ **Session** table with userId, token, expiresAt
- ✅ Email verification support via emailVerified boolean

## Next Steps

1. **Install Better-auth packages**:
   ```bash
   cd apps/api
   bun add better-auth @better-auth/prisma-adapter
   ```

2. **Create auth configuration**:
   ```bash
   mkdir -p src/lib
   # Create src/lib/auth.ts following the configuration above
   ```

3. **Run tests to verify**:
   ```bash
   bun test test/auth/better-auth-setup.test.ts
   ```

4. **Expected outcome**: All 24 tests should pass ✅

## Test Infrastructure

Tests use the shared test infrastructure:

- **PostgreSQL**: Testcontainers provides isolated database
- **Prisma**: Database operations use real Prisma client
- **Cleanup**: Each test suite runs `beforeEach(() => cleanAllTables())`
- **Timeout**: Container startup has 180-second timeout

## References

- **Security Design**: `docs/SECURITY_DESIGN.md` (lines 80-150)
- **Testing Strategy**: `docs/TESTING-STRATEGY.md`
- **Better-auth Docs**: https://better-auth.com/docs
- **Prisma Adapter**: https://better-auth.com/docs/adapters/prisma

## Success Criteria

✅ All 24 tests pass
✅ 100% coverage of configuration validation
✅ Tests validate security requirements (12-char password, email verification, secure cookies)
✅ Tests validate session management (7-day expiry, 24-hour update)
✅ Tests validate database integration (Prisma adapter, table structure)

## Notes

- Tests are environment-aware (check NODE_ENV for production settings)
- Cookie security settings differ between development and production
- Session tokens use cryptographically secure random generation
- Database operations respect foreign key constraints
- All timestamps use PostgreSQL timestamptz(6) for timezone awareness
