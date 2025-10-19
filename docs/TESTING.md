# Testing Guide

Complete guide for running tests in the VRSS platform across different environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Execution Modes](#test-execution-modes)
- [Environment Detection](#environment-detection)
- [Database Configuration](#database-configuration)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Writing Tests](#writing-tests)

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
