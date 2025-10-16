# Test & Lint Workflows

## Overview

This document describes testing and linting patterns in the VRSS Turborepo monorepo. The monorepo uses a heterogeneous testing setup with framework-specific tools optimized for different layers, and centralized ESLint configuration for consistent code quality.

## Test Framework Strategy

### Framework Selection by Layer

| Layer | Framework | Version | Purpose | Test Location |
|-------|-----------|---------|---------|---------------|
| Frontend (React) | Vitest | 2.1.8 | Component & unit tests | `apps/web/` |
| Backend (API) | Bun Test | Built-in | RPC & integration tests | `apps/api/test/` |
| End-to-End | Playwright | 1.48.2 | Browser automation | `e2e/tests/` |

**Rationale**:
- **Vitest**: Optimized for Vite-based React apps, fast with HMR support
- **Bun Test**: Native TypeScript support, no transpilation overhead
- **Playwright**: Multi-browser E2E with visual debugging

## Frontend Testing (Vitest)

### Configuration

**File**: `apps/web/vitest.config.ts`

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Key features**:
- **`globals: true`**: `describe`, `it`, `expect` available without imports
- **`environment: 'happy-dom'`**: Fast DOM simulation (lighter than jsdom)
- **Coverage thresholds**: 80% minimum across all metrics
- **V8 coverage**: Native coverage via Node's built-in profiler

### Test Setup File

**File**: `apps/web/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
});

// Browser API mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

global.crypto.randomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
```

**Purpose**:
- MSW (Mock Service Worker) for API mocking
- Automatic React component cleanup
- Browser API polyfills for test environment

### MSW Server Setup

**File**: `apps/web/test/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Mock Service Worker server for Node environment (tests)
 * Intercepts API calls and returns mock responses
 */
export const server = setupServer(...handlers);
```

### Commands

**File**: `apps/web/package.json:10-13`

```json
{
  "scripts": {
    "test": "npx vitest run",
    "test:watch": "npx vitest --watch",
    "test:ui": "npx vitest --ui",
    "test:coverage": "npx vitest run --coverage"
  }
}
```

**Usage**:
```bash
# Run tests once
cd apps/web && bun run test

# Watch mode with interactive filtering
cd apps/web && bun run test:watch

# Visual UI with browser interface
cd apps/web && bun run test:ui

# Generate coverage report
cd apps/web && bun run test:coverage
```

## Backend Testing (Bun Test)

### Configuration

**File**: `apps/api/bunfig.toml`

```toml
# Bun Test Configuration for VRSS API
[test]
timeout = 60000  # 60 seconds for integration tests
```

### Test Structure Example

**File**: `apps/api/test/rpc/user.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getTestDatabase } from "../setup";
import { cleanAllTables } from "../helpers/database";
import { buildUser } from "../fixtures/userBuilder";
import { ProcedureContext } from "../../src/rpc/types";
import { ErrorCode } from "@vrss/api-contracts";

// Mock context builder
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T> {
  return {
    c: {} as any,
    user: null,
    session: null,
    ip: "127.0.0.1",
    userAgent: "Test User Agent",
    input: {} as T,
    ...overrides,
  };
}

describe("User Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    // Cleanup
  });

  describe("getProfile", () => {
    it("should return user profile for authenticated user", async () => {
      const user = await buildUser(db).create();
      const ctx = createMockContext({ user });

      const result = await getProfileProcedure(ctx);

      expect(result).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    });

    it("should throw AUTH_REQUIRED for unauthenticated user", async () => {
      const ctx = createMockContext();

      expect(() => getProfileProcedure(ctx)).toThrow(ErrorCode.AUTH_REQUIRED);
    });
  });
});
```

**Key patterns**:
- Import from `"bun:test"` (not `"vitest"`)
- Testcontainers for isolated PostgreSQL instances
- Mock context builders for RPC procedures
- Fixture builders for test data

### Commands

**File**: `apps/api/package.json:10-13`

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:ui": "bun test --watch"
  }
}
```

**Usage**:
```bash
# Run tests once
cd apps/api && bun run test

# Watch mode
cd apps/api && bun run test:watch

# With coverage
cd apps/api && bun run test:coverage
```

## End-to-End Testing (Playwright)

### Configuration

**File**: `e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 10 * 1000,
    actionTimeout: 10 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../apps/web && bun run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd ../apps/api && bun run dev',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
```

**Key features**:
- **Multi-browser**: Desktop Chrome, Mobile Chrome, Mobile Safari
- **Auto-start servers**: Playwright starts both web and API servers
- **Failure artifacts**: Screenshots, videos, traces on failure
- **Parallel execution**: Full parallelism locally, sequential in CI

### Commands

**File**: `e2e/package.json:7-13`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen http://localhost:5173",
    "test": "playwright test"
  }
}
```

**Usage**:
```bash
# Run E2E tests (headless)
cd e2e && bun run test:e2e

# Run with visible browser
cd e2e && bun run test:e2e:headed

# Debug mode (step through)
cd e2e && bun run test:e2e:debug

# Visual UI mode
cd e2e && bun run test:e2e:ui

# View HTML report
cd e2e && bun run test:e2e:report

# Generate tests via recording
cd e2e && bun run test:e2e:codegen
```

## Linting

### Shared ESLint Configuration

**Package**: `@vrss/eslint-config`

#### Base Configuration

**File**: `packages/eslint-config/index.js`

```javascript
/**
 * Base TypeScript ESLint configuration for all packages
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn'
  },
  ignorePatterns: ['dist', 'build', '.turbo', 'node_modules']
};
```

**Key rules**:
- **Type-aware linting**: `project: true` enables TypeScript type checking
- **Strict `any`**: Error on `any` usage
- **Unused vars**: Error unless prefixed with `_`
- **Ignores**: Build artifacts and cache directories

#### React Configuration

**File**: `packages/eslint-config/react.js`

```javascript
/**
 * React-specific ESLint configuration
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: [
    './index.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  env: {
    browser: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',  // Not needed in React 18+
    'react/prop-types': 'off'  // Using TypeScript
  }
};
```

**Key features**:
- **React Hooks**: Validates proper hook usage
- **Accessibility (a11y)**: JSX accessibility checks
- **Modern React**: No React import needed (React 18+)

### Lint Commands

**Root** (`package.json:17`):
```json
{
  "scripts": {
    "lint": "turbo run lint"
  }
}
```

**Web App** (`apps/web/package.json:14`):
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

**API App** (`apps/api/package.json:14`):
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

**Usage**:
```bash
# Lint all workspaces (with caching)
bun run lint

# Lint specific workspace
turbo run lint --filter=@vrss/web

# Lint with auto-fix
cd apps/web && npx eslint . --fix
```

## Turborepo Orchestration

### Configuration

**File**: `turbo.json`

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "outputs": ["test-results/**", "playwright-report/**"],
      "cache": false
    }
  }
}
```

### Execution Behavior

#### Test Task
```
turbo run test
  │
  ├─→ Check cache (hash of source files)
  │     │
  │     ├─ Cache hit? → Return cached result
  │     │
  │     └─ Cache miss:
  │           │
  │           └─→ Run build (dependsOn)
  │                 │
  │                 └─→ Run tests in parallel
  │                       ├─ apps/api: bun test
  │                       ├─ apps/web: vitest run
  │                       └─ Cache outputs (coverage/**)
```

**Why `dependsOn: ["build"]`**: Ensures shared packages are built before tests import them.

#### Lint Task
```
turbo run lint
  │
  ├─→ Check cache (hash of source files)
  │     │
  │     ├─ Cache hit? → Return cached exit code
  │     │
  │     └─ Cache miss:
  │           │
  │           └─→ Run lint in parallel
  │                 ├─ apps/api: eslint .
  │                 ├─ apps/web: eslint .
  │                 └─ Cache exit code (no outputs)
```

**Why `outputs: []`**: Linting produces no files, only exit code.

#### E2E Task
```
turbo run test:e2e
  │
  ├─→ No cache check (cache: false)
  │
  └─→ Run ^build (upstream dependencies)
        │
        └─→ Run Playwright
              ├─ Start web server (port 5173)
              ├─ Start API server (port 3000)
              ├─ Run tests across browsers
              └─ Generate reports
```

**Why `cache: false`**: E2E tests may have external dependencies (database, network).

## Watch Mode Patterns

### Vitest Watch Mode

**Interactive features**:
- Filter tests by filename pattern
- Filter tests by test name pattern
- Re-run only failed tests
- Re-run only changed files
- Toggle coverage
- Quit watch mode

**Usage**:
```bash
cd apps/web
bun run test:watch

# Shortcuts in watch mode:
# a = run all tests
# f = run failed tests
# p = filter by filename
# t = filter by test name
# c = toggle coverage
# q = quit
```

### Bun Test Watch Mode

**Features**:
- Automatic re-run on file changes
- Fast re-execution (native TypeScript)
- Terminal output with results

**Usage**:
```bash
cd apps/api
bun run test:watch
```

### Playwright UI Mode

**Features**:
- Visual test execution
- Time-travel debugging with traces
- Step-by-step execution
- Watch mode for E2E tests

**Usage**:
```bash
cd e2e
bun run test:e2e:ui
```

## Claude Code Agent Integration

### Pattern: Run Tests After Changes

**Agent command**:
```typescript
const result = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && bun run test",
  timeout: 120000,  // 2 minutes
  description: "Run all tests"
});

// Parse test results
if (result.includes("FAIL") || result.includes("✘")) {
  // Extract failed tests and fix
}
```

### Pattern: Continuous Testing in Background

**For long-running agent sessions**:

```typescript
// Start test watcher in background
const testBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/web && npx vitest --watch",
  run_in_background: true,
  description: "Watch frontend tests"
});

// Monitor for failures periodically
const output = await BashOutput({
  bash_id: testBashId,
  filter: "FAIL|✘|Test Files.*failed"
});

if (output.includes("FAIL")) {
  // Parse failures and fix
}
```

### Pattern: Pre-Commit Validation

**Agent workflow**:
```typescript
// 1. Run type-check
await Bash("cd /Users/dylan/Workspace/projects/vrss && bun run type-check");

// 2. Run linter
await Bash("cd /Users/dylan/Workspace/projects/vrss && bun run lint");

// 3. Run tests
await Bash("cd /Users/dylan/Workspace/projects/vrss && bun run test");

// 4. If all pass, commit
await Bash("git add . && git commit -m 'feat: ...'");
```

### Pattern: E2E Testing Safety

**Critical**: E2E tests start their own servers!

**Agent rule**:
```typescript
// ❌ WRONG: Dev server already running
// Starting E2E will conflict on ports
const devBashId = await Bash("turbo run dev --parallel", { background: true });
await Bash("cd e2e && bun run test:e2e");  // Port conflict!

// ✅ CORRECT: Stop dev server before E2E
await KillShell(devBashId);
await Bash("cd /Users/dylan/Workspace/projects/vrss/e2e && bun run test:e2e");
```

**Alternative**: Use `reuseExistingServer: true` in Playwright config (already configured).

## Testing Best Practices

1. **Isolated Tests**: Each test should be independent and resettable
2. **Mock External Services**: Use MSW for frontend, Testcontainers for backend
3. **Watch Mode for Development**: Continuous feedback while coding
4. **Coverage Thresholds**: Maintain 80% minimum across all metrics
5. **Run Before Commit**: Always run tests before committing
6. **E2E for Critical Paths**: Test user journeys, not every feature
7. **Parallel Execution**: Leverage Turborepo's parallel test execution

## Related Documentation

- [Dev Server Management](./dev-server-management.md)
- [TypeScript Type-Check Patterns](./typescript-typecheck-patterns.md)
- [Agent Bash Coordination](../domain/agent-bash-coordination.md)
