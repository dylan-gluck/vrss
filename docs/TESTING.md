# Testing Documentation

Comprehensive testing guide for the VRSS platform, covering backend, frontend, and E2E testing strategies.

## Table of Contents

- [Testing Strategy Overview](#testing-strategy-overview)
- [Test Organization](#test-organization)
- [Backend Tests (Bun)](#backend-tests-bun)
- [Frontend Tests (Vitest)](#frontend-tests-vitest)
- [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Test Utilities](#test-utilities)
- [Coverage Goals](#coverage-goals)
- [CI/CD Pipeline](#cicd-pipeline)
- [Quick Start](#quick-start)
- [Test Execution Modes](#test-execution-modes)
- [Environment Detection](#environment-detection)
- [Database Configuration](#database-configuration)
- [Troubleshooting](#troubleshooting)
- [Writing Tests](#writing-tests)

---

## Testing Strategy Overview

The VRSS platform follows a **comprehensive testing strategy** with three test layers:

### Test Pyramid

```
        ┌────────────┐
        │    E2E     │  ← Playwright (disabled in CI)
        │   Tests    │     Multi-browser, slow, expensive
        └────────────┘
       ┌──────────────┐
       │  Integration │  ← Frontend + Backend
       │    Tests     │    API mocking, component integration
       └──────────────┘
     ┌────────────────────┐
     │    Unit Tests      │  ← Bun (backend) + Vitest (frontend)
     │  (595 + 333 tests) │    Fast, isolated, comprehensive
     └────────────────────┘
```

### Test Distribution

| Layer | Tool | Count | Speed | CI Status |
|-------|------|-------|-------|-----------|
| **Backend Unit** | Bun Test | 595 | ⚡ Fast | ✅ Enabled |
| **Frontend Unit** | Vitest | 333 | ⚡ Fast | ✅ Enabled |
| **E2E** | Playwright | Variable | 🐌 Slow | ⚠️ Disabled |

**Total Tests**: 928+ passing tests

### Testing Philosophy

1. **Test-Driven Development (TDD)**: Write tests before implementation
2. **Arrange-Act-Assert (AAA)**: Consistent test structure
3. **Isolation**: Each test cleans up after itself
4. **Realistic Data**: Builder pattern for flexible test data
5. **Coverage Over Quantity**: Focus on critical paths, edge cases

---

## Test Organization

### Monorepo Structure

```
vrss/
├── apps/
│   ├── api/
│   │   └── test/                 # Backend tests (595 tests)
│   │       ├── auth/             # Authentication tests
│   │       ├── rpc/              # RPC router tests
│   │       ├── fixtures/         # Test data builders
│   │       ├── helpers/          # Test utilities
│   │       └── setup.ts          # Test environment setup
│   └── web/
│       └── test/                 # Frontend tests (333 tests)
│           ├── mocks/            # MSW handlers
│           └── setup.ts          # Vitest setup
└── e2e/
    ├── tests/                    # E2E test specs
    ├── helpers/                  # E2E utilities (AuthHelper)
    ├── fixtures/                 # Test data
    └── playwright.config.ts      # Playwright config
```

### File Naming Conventions

- **Backend**: `*.test.ts` (e.g., `auth/login.test.ts`)
- **Frontend**: `*.test.tsx` or `*.test.ts` (e.g., `LoginForm.test.tsx`)
- **E2E**: `*.spec.ts` (e.g., `auth/login.spec.ts`)

---

## Backend Tests (Bun)

### Overview

**595 backend tests** cover the entire API surface with Bun's built-in test runner.

### Key Features

✅ **Fast Execution**: Bun test runner is blazingly fast (~2-5 seconds)
✅ **Built-in Mocking**: No external mocking library needed
✅ **TypeScript Native**: First-class TypeScript support
✅ **Database Isolation**: Each test cleans up after itself
✅ **Builder Pattern**: Flexible test data creation

### Test Structure

```typescript
// Pseudocode - typical backend test
import { describe, it, expect, beforeEach } from 'bun:test'
import { cleanAllTables } from '../helpers/database'
import { buildUser } from '../fixtures/userBuilder'
import { rpcClient } from '../helpers/request'

describe('auth.login', () => {
  beforeEach(async () => {
    await cleanAllTables() // Clean database before each test
  })

  it('should login user with valid credentials', async () => {
    // Arrange
    const password = 'TestPassword123!'
    const { user } = await buildUser().password(password).build()

    // Act
    const response = await rpcClient.call('auth.login', {
      username: user.username,
      password
    })

    // Assert
    expect(response.success).toBe(true)
    expect(response.data.user.username).toBe(user.username)
    expect(response.data.sessionToken).toBeDefined()
  })

  it('should reject invalid credentials', async () => {
    // Arrange
    const { user } = await buildUser().build()

    // Act & Assert
    await expect(
      rpcClient.call('auth.login', {
        username: user.username,
        password: 'WrongPassword123!'
      })
    ).rejects.toThrow('Invalid username or password')
  })
})
```

### Builder Pattern

UserBuilder provides flexible test data creation:

```typescript
// Pseudocode - UserBuilder usage examples

// 1. Basic user
const { user } = await buildUser().build()

// 2. Custom username
const { user } = await buildUser()
  .username('testuser')
  .build()

// 3. User with profile
const { user, profile } = await buildUser()
  .withProfile({ bio: 'Test bio' })
  .build()

// 4. Suspended user
const { user } = await buildUser()
  .suspended()
  .build()

// 5. Multiple users
const users = await buildUser().buildMany(10)
```

**Features**:
- **Automatic Uniqueness**: Generates unique usernames/emails
- **Sensible Defaults**: Works without configuration
- **Chainable API**: Fluent interface for customization
- **Related Data**: Creates profiles, storage quotas

### Auth Helpers

Authentication test helpers in `/apps/api/test/helpers/auth.ts`:

```typescript
// Pseudocode - auth helper usage

// 1. Create authenticated user
const { user, session, token } = await createAuthenticatedUser()

// 2. Custom user with session
const { user, session, token } = await createAuthenticatedUser({
  username: 'testuser',
  emailVerified: true
})

// 3. Create expired session
const { session, token } = await createExpiredSession(userId)

// 4. Create suspended user
const { user, session, token } = await createSuspendedUser()

// 5. Auth context helper
const authContext = await createAuthContext()
const authHeader = authContext.getAuthHeader() // 'Bearer <token>'
```

### Database Cleanup

Database helpers in `/apps/api/test/helpers/database.ts`:

```typescript
// Pseudocode - database cleanup utilities

// 1. Clean all tables (respects foreign keys)
await cleanAllTables()

// 2. Clean user-related data only
await cleanUserData()

// 3. Clean post-related data
await cleanPostData()

// 4. Clean feed data
await cleanFeedData()

// 5. Get table counts (debugging)
const counts = await getTableCounts()
// { users: 5, posts: 10, sessions: 3, ... }
```

**Cleanup Order**: Tables cleaned in reverse dependency order to respect foreign key constraints.

### Test Patterns

**TDD Pattern**:
1. Write failing test
2. Implement feature
3. Test passes
4. Refactor

**AAA Pattern**:
```typescript
it('should do something', async () => {
  // Arrange - Setup test data
  const user = await createTestUser()

  // Act - Execute the operation
  const result = await someOperation(user.id)

  // Assert - Verify the outcome
  expect(result).toBeDefined()
  expect(result.status).toBe('success')
})
```

---

## Frontend Tests (Vitest)

### Overview

**333 frontend tests** cover components, hooks, and integration with Vitest and React Testing Library.

### Key Features

✅ **Fast Execution**: Vite-powered, instant HMR
✅ **MSW Mocking**: Mock Service Worker for API mocking
✅ **React Testing Library**: User-centric testing
✅ **Component Tests**: Isolated component testing
✅ **Integration Tests**: Multi-component flows

### Test Structure

```typescript
// Pseudocode - typical frontend test
import { render, screen, userEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { createTestWrapper } from '@/test/utils'

describe('LoginForm', () => {
  it('should submit login form with valid credentials', async () => {
    // Arrange
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()
    render(<LoginForm onSuccess={mockOnSuccess} />, {
      wrapper: createTestWrapper()
    })

    // Act
    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Password'), 'TestPassword123!')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    // Assert
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should show validation errors for invalid input', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginForm />, { wrapper: createTestWrapper() })

    // Act
    await user.click(screen.getByRole('button', { name: 'Login' }))

    // Assert
    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(await screen.findByText('Password is required')).toBeInTheDocument()
  })
})
```

### MSW for API Mocking

Mock Service Worker intercepts API requests:

```typescript
// Pseudocode - MSW handler example
export const handlers = [
  http.post('/api/rpc', async ({ request }) => {
    const body = await request.json()

    if (body.procedure === 'auth.login') {
      const { username, password } = body.input

      if (username === 'testuser' && password === 'TestPassword123!') {
        return HttpResponse.json({
          success: true,
          data: {
            user: { id: '1', username: 'testuser', email: 'test@test.com' },
            sessionToken: 'mock-token'
          }
        })
      }

      return HttpResponse.json({
        success: false,
        error: { code: 1011, message: 'Invalid username or password' }
      }, { status: 401 })
    }
  })
]
```

**MSW Setup** (in `/apps/web/test/setup.ts`):
```typescript
// Pseudocode - MSW server setup
import { server } from './mocks/server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

### Custom Render with Providers

Test wrapper provides context:

```typescript
// Pseudocode - custom render wrapper
function createTestWrapper() {
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    )
  }
}

// Usage
render(<MyComponent />, { wrapper: createTestWrapper() })
```

### Component Testing Patterns

**User Interactions**:
```typescript
// Pseudocode - user interaction testing
const user = userEvent.setup()

// Type into input
await user.type(screen.getByLabelText('Username'), 'testuser')

// Click button
await user.click(screen.getByRole('button', { name: 'Submit' }))

// Select dropdown
await user.selectOptions(screen.getByRole('combobox'), 'option1')
```

**Async Assertions**:
```typescript
// Pseudocode - async assertions
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// Find element (waits automatically)
const element = await screen.findByText('Success')
```

---

## E2E Tests (Playwright)

### Overview

End-to-end tests using **Playwright** are **disabled in CI** but functional for local testing.

### Why Disabled in CI?

1. **Speed**: E2E tests are slow (2-5 minutes vs 10 seconds for unit tests)
2. **Cost**: CI minutes expensive for E2E tests
3. **Complexity**: Requires full stack running (API + DB + Frontend)
4. **Flakiness**: E2E tests more prone to intermittent failures
5. **Coverage**: 928 unit tests provide sufficient coverage

**Status**: E2E tests remain functional for local testing when needed.

### Multi-Browser Configuration

Playwright configured for 3 browsers:

```typescript
// Pseudocode - playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile-chrome', use: devices['Pixel 5'] },
    { name: 'mobile-safari', use: devices['iPhone 13'] }
  ]
})
```

### Page Object Pattern

AuthHelper encapsulates auth flows:

```typescript
// Pseudocode - AuthHelper usage
import { AuthHelper } from '@/e2e/helpers/auth-helper'

test('should login user', async ({ page }) => {
  const auth = new AuthHelper(page)

  await auth.login({
    email: 'test@test.com',
    password: 'TestPassword123!'
  })

  await expect(page).toHaveURL(/\/home/)
})
```

**AuthHelper Methods**:
- `register(credentials)` - Register via UI
- `registerViaAPI(credentials)` - Register via API (faster)
- `login(credentials)` - Login via UI
- `loginViaAPI(credentials)` - Login via API (faster)
- `logout()` - Logout
- `isAuthenticated()` - Check auth state
- `clearSession()` - Clear cookies and storage
- `setupAuthenticatedSession(credentials)` - Complete setup

### Running E2E Tests Locally

```bash
# Install Playwright browsers (first time only)
cd e2e && npx playwright install

# Run all E2E tests
bun run test:e2e

# Run specific test file
npx playwright test tests/auth/login.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

---

## Test Utilities

### Backend Utilities

**Fixtures** (`/apps/api/test/fixtures/`):
- `userBuilder.ts` - User creation builder
- `postBuilder.ts` - Post creation builder
- `feedBuilder.ts` - Feed creation builder

**Helpers** (`/apps/api/test/helpers/`):
- `auth.ts` - Authentication helpers
- `database.ts` - Database cleanup utilities
- `request.ts` - RPC client helpers

### Frontend Utilities

**Mocks** (`/apps/web/test/mocks/`):
- `handlers.ts` - MSW request handlers
- `server.ts` - MSW server setup
- `data.ts` - Mock data (users, posts, etc.)

**Setup** (`/apps/web/test/setup.ts`):
- MSW server lifecycle
- Global mocks (matchMedia, IntersectionObserver, ResizeObserver)
- crypto.randomUUID polyfill

### E2E Utilities

**Helpers** (`/e2e/helpers/`):
- `auth-helper.ts` - AuthHelper class

**Fixtures** (`/e2e/fixtures/`):
- `test-users.ts` - Predefined test users
- `test-data.ts` - Test data generators

---

## Coverage Goals

### Current Status

All tests passing:
- ✅ **595 backend tests** (Bun)
- ✅ **333 frontend tests** (Vitest)
- ⚠️ **E2E tests** (disabled in CI, functional locally)

### Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| **Statements** | 80% | TBD |
| **Branches** | 75% | TBD |
| **Functions** | 80% | TBD |
| **Lines** | 80% | TBD |

### Generating Coverage

```bash
# Backend coverage
cd apps/api
bun run test --coverage

# Frontend coverage
cd apps/web
bun run test --coverage

# View reports
open apps/api/coverage/index.html
open apps/web/coverage/index.html
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI pipeline runs **4 jobs** in parallel:

```yaml
# Pseudocode - .github/workflows/ci.yml structure
jobs:
  lint-and-typecheck:
    - Lint code (Biome)
    - Type check (TypeScript strict mode)

  test-backend:
    - Setup PostgreSQL service
    - Run migrations
    - Run 595 backend tests
    - Upload coverage

  test-frontend:
    - Run 333 frontend tests
    - Upload coverage

  build:
    - Build all packages (Turbo)
    - Upload artifacts
```

### CI Environment

**Database**:
- Service: PostgreSQL 16 Alpine
- Database: `vrss_test`
- User: `test_user`
- Password: `test_pass`
- Port: 5432

**Environment Variables**:
```bash
CI=true
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/vrss_test
BETTER_AUTH_SECRET=test_secret_minimum_32_chars...
```

### Test Execution Times

| Job | Duration | Parallelization |
|-----|----------|-----------------|
| Lint & Type Check | ~2 min | N/A |
| Test Backend | ~3 min | 1 worker |
| Test Frontend | ~2 min | 1 worker |
| Build | ~3 min | Turbo cache |

**Total CI Time**: ~5-7 minutes (jobs run in parallel)

---

---

## Quick Start

### Running Tests (Recommended)

```bash
# Start development environment
make start

# Run tests (fastest - uses dev containers)
make test

# Or explicitly
make test-docker-fast
```

### Other Test Commands

```bash
make test-local          # Run locally (requires PostgreSQL on port 6969)
make test-docker         # Run in isolated test environment
make test-coverage       # Generate coverage reports
make test-watch          # Run tests in watch mode
make test-ci             # CI/CD compatible mode
```

---

## Test Execution Modes

### 1. **Fast Mode** (Default - `make test` or `make test-docker-fast`)

**Best for:** Daily development workflow

- ✅ Fastest execution (~5-10 seconds)
- ✅ Uses existing dev containers
- ✅ No container startup overhead
- ⚠️ Shares development database
- ⚠️ May have state conflicts if dev DB is dirty

**How it works:**
```bash
make test
# Runs: docker-compose exec backend bun test
```

---

### 2. **Isolated Mode** (`make test-docker`)

**Best for:** Pre-commit checks, CI/CD simulation

- ✅ Completely isolated test database (tmpfs)
- ✅ No interference with development
- ✅ Automatic cleanup after tests
- ✅ Matches CI/CD environment
- ⚠️ Slower startup (~20-30 seconds)

**How it works:**
```bash
make test-docker
# 1. Starts isolated test database (db-test)
# 2. Runs migrations
# 3. Executes tests
# 4. Tears down and cleans up
```

---

### 3. **Local Mode** (`make test-local`)

**Best for:** Running tests on host machine

- ✅ No Docker overhead
- ✅ Fastest for debugging with breakpoints
- ⚠️ Requires local PostgreSQL installation
- ⚠️ Must manually manage database state

**Prerequisites:**
```bash
# Install and start PostgreSQL on port 6969
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb vrss

# Run tests
make test-local
```

---

### 4. **CI Mode** (`make test-ci`)

**Best for:** CI/CD pipelines (GitHub Actions, GitLab CI)

- ✅ Non-interactive mode (no TTY)
- ✅ Isolated environment
- ✅ Proper exit codes
- ✅ Automatic cleanup on failure

---

## Environment Detection

The test setup automatically detects the execution environment:

### Detection Logic

```typescript
// apps/api/test/setup.ts

function detectEnvironment(): 'docker' | 'ci' | 'local' {
  if (process.env.CI === 'true') return 'ci';
  if (process.env.IS_DOCKER === 'true' ||
      process.env.DB_HOST === 'db') return 'docker';
  return 'local';
}
```

### Environment-Specific Defaults

| Environment | DB_HOST | DB_PORT | Database |
|-------------|---------|---------|----------|
| **Docker** | `db` | `5432` | `vrss` |
| **CI/CD** | `localhost` | `5432` | `vrss_test` |
| **Local** | `localhost` | `6969` | `vrss` |

---

## Database Configuration

### Connection Priority

Tests connect to the database using this priority:

1. **`DATABASE_URL`** environment variable (if set)
2. Individual environment variables (`DB_HOST`, `DB_PORT`, etc.)
3. Auto-detected defaults based on environment

### Override Examples

```bash
# Use custom database URL
DATABASE_URL=postgresql://user:pass@localhost:5432/my_test_db make test-local

# Override individual settings
DB_HOST=custom-db DB_PORT=5433 make test-docker-fast

# Use specific test database
DB_NAME=vrss_test_custom make test
```

---

## Test Database Isolation

### Isolated Test Environment (`docker-compose.test.yml`)

The isolated test environment provides:

- **Separate Database:** `vrss_test` (not `vrss`)
- **In-Memory Storage:** Database runs in tmpfs for speed
- **Automatic Cleanup:** Removed after tests complete
- **No Interference:** Development database untouched

### Database Lifecycle

```bash
# Start isolated test database
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d db-test

# Database is created in memory (tmpfs)
# - Faster than disk-backed storage
# - Automatically cleared on container stop

# Run tests
docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm backend

# Cleanup (database data is destroyed)
docker-compose -f docker-compose.yml -f docker-compose.test.yml down -v
```

---

## Troubleshooting

### Tests Fail to Connect to Database

**Symptom:**
```
❌ Failed to connect to test database
```

**Solutions by Environment:**

#### Docker
```bash
# Verify database container is running
docker ps | grep vrss_db

# Check database logs
docker-compose logs db

# Restart containers
make restart
```

#### Local
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 6969

# Check if database exists
psql -h localhost -p 6969 -l | grep vrss

# Create database if missing
createdb -h localhost -p 6969 vrss
```

#### CI/CD
```bash
# Check GitHub Actions service configuration
# Verify environment variables in workflow file
# Review job logs for database initialization errors
```

---

### Port Conflicts

**Symptom:**
```
Error: Port 6969 is already in use
```

**Solution:**
```bash
# Find process using port
lsof -ti:6969

# Kill process
kill -9 $(lsof -ti:6969)

# Or use different port
DB_PORT=5433 make test-local
```

---

### Stale Test Data

**Symptom:**
Tests fail due to existing data in database

**Solution:**
```bash
# Use isolated test environment (recommended)
make test-docker

# Or manually clean development database
docker-compose exec db psql -U vrss_user -d vrss -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
make db-migrate
```

---

## CI/CD Integration

### GitHub Actions Configuration

The CI pipeline uses the same environment as local Docker testing:

```yaml
# .github/workflows/ci.yml
env:
  CI: "true"
  DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/vrss_test
  DB_HOST: localhost
  DB_PORT: 5432
  DB_NAME: vrss_test
```

### Running CI Tests Locally

To replicate CI behavior locally:

```bash
# Use the same isolated environment as CI
make test-docker

# Or use CI mode explicitly
make test-ci
```

---

## Writing Tests

### Test Structure

```typescript
// apps/api/test/rpc/example.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { cleanAllTables } from '../helpers/database';
import { createTestUser } from '../fixtures/userBuilder';
import { getTestDatabase } from '../setup';

describe('Example Router', () => {
  beforeEach(async () => {
    // Clean database before each test
    await cleanAllTables();
  });

  it('should do something', async () => {
    // Arrange
    const user = await createTestUser();

    // Act
    const result = await someFunction(user.id);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Test Helpers

**Database Cleanup:**
```typescript
import { cleanAllTables } from './helpers/database';

beforeEach(async () => {
  await cleanAllTables(); // Removes all data while preserving schema
});
```

**User Fixtures:**
```typescript
import { createTestUser, buildUser } from './fixtures/userBuilder';

// Quick user creation
const user = await createTestUser();

// Customized user
const admin = await buildUser({
  username: 'admin',
  status: 'active'
});
```

**Auth Context:**
```typescript
import { createAuthContext } from './helpers/auth';

const authContext = await createAuthContext(user);
// Use authContext.headers for authenticated requests
```

---

## Test Coverage

### Generate Coverage Reports

```bash
# Run tests with coverage
make test-coverage

# View coverage report
open apps/api/coverage/index.html
```

### Coverage Thresholds

Current targets:
- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

---

## Performance Tips

### Speed Comparison

| Mode | Cold Start | Warm Start | Database |
|------|------------|------------|----------|
| **Fast** | 5s | 2s | Dev (persistent) |
| **Isolated** | 25s | 20s | Test (tmpfs) |
| **Local** | 1s | 1s | Local (persistent) |

### Optimization Strategies

1. **Use Fast Mode for Active Development**
   ```bash
   make test-watch
   ```

2. **Use Isolated Mode for Pre-Commit**
   ```bash
   make test-docker
   ```

3. **Run Specific Tests During Development**
   ```bash
   docker-compose exec backend bun test --test-name-pattern "auth.login"
   ```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | Full connection string | Auto-generated | `postgresql://...` |
| `BETTER_AUTH_SECRET` | Auth secret (32+ chars) | *Required* | `dev_secret_...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | Auto-detected |
| `DB_PORT` | Database port | Auto-detected |
| `DB_NAME` | Database name | `vrss` |
| `DB_USER` | Database user | `vrss_user` |
| `DB_PASSWORD` | Database password | `vrss_dev_password` |
| `NODE_ENV` | Environment | `development` |
| `IS_DOCKER` | Docker flag | Auto-detected |
| `CI` | CI/CD flag | Auto-detected |

---

## Summary: Which Test Mode Should I Use?

```
┌─────────────────────────────────────────────────────────────────┐
│  Use Case                    │  Command                         │
├─────────────────────────────────────────────────────────────────┤
│  Daily development           │  make test                       │
│  Active TDD workflow         │  make test-watch                 │
│  Pre-commit verification     │  make test-docker                │
│  Debugging with breakpoints  │  make test-local                 │
│  CI/CD pipeline              │  make test-ci                    │
│  Coverage reporting          │  make test-coverage              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Support

For issues or questions:
- **Documentation:** Check this guide first
- **Issues:** Open a GitHub issue
- **Logs:** Run `docker-compose logs backend` for debugging
