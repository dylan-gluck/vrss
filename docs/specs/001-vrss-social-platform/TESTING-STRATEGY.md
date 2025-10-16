# Testing Strategy Specification
## VRSS Social Platform MVP

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Testing Frameworks and Tools](#testing-frameworks-and-tools)
4. [Test Organization Structure](#test-organization-structure)
5. [Testing Pyramid Strategy](#testing-pyramid-strategy)
6. [Backend Testing Strategy](#backend-testing-strategy)
7. [Frontend Testing Strategy](#frontend-testing-strategy)
8. [End-to-End Testing Strategy](#end-to-end-testing-strategy)
9. [Database Testing Strategy](#database-testing-strategy)
10. [Authentication Testing Strategy](#authentication-testing-strategy)
11. [API Contract Testing Strategy](#api-contract-testing-strategy)
12. [Test Data Management](#test-data-management)
13. [CI/CD Integration](#cicd-integration)
14. [Test Coverage Goals](#test-coverage-goals)
15. [Performance Testing](#performance-testing)
16. [Security Testing](#security-testing)
17. [PWA Offline Testing](#pwa-offline-testing)
18. [Test Patterns and Examples](#test-patterns-and-examples)

---

## Overview

### Purpose

This document defines the comprehensive testing infrastructure and strategy for the VRSS social platform MVP. Following the MVP philosophy of "solid foundation, infrastructure, tests, end-to-end working, then core features," this strategy ensures quality is built in from day one and supports confident iteration on features.

### Scope

**In Scope:**
- Unit, integration, and E2E testing infrastructure
- Backend API and business logic testing
- Frontend component and integration testing
- Database schema and migration testing
- Authentication flow testing
- API contract testing (RPC)
- Test data management and fixtures
- CI/CD pipeline integration
- PWA offline functionality testing
- Security testing approach

**Out of Scope (Post-MVP):**
- Load testing infrastructure
- Advanced chaos engineering
- Penetration testing (manual security review for MVP)
- Cross-browser automation (focus on modern browsers only)

### Success Criteria

- All critical user journeys have E2E test coverage
- 80%+ code coverage for business logic
- All API endpoints have integration tests
- Database migrations tested in CI/CD
- Authentication flows comprehensively tested
- Tests run in under 5 minutes in CI/CD
- Test failures are actionable and debuggable
- Supports TDD/test-first development workflow

---

## Testing Philosophy

### Core Principles

1. **Infrastructure First**: Build testing infrastructure before features
2. **Test Behavior, Not Implementation**: Focus on user-facing behavior and contracts
3. **Fast Feedback Loops**: Prioritize fast unit tests, selective integration/E2E tests
4. **Confidence to Ship**: Tests should give team confidence to deploy
5. **Maintainable Tests**: Tests are code - keep them clean and readable
6. **Realistic Test Data**: Use fixtures that reflect actual use cases
7. **Test Independence**: Each test should run in isolation
8. **Fail Fast**: Tests should fail quickly and clearly when something breaks

### Testing Quadrants

```
                   Technology-Facing
                          |
    Unit Tests      |     Integration Tests
    Component Tests |     API Tests
    ----------------+--------------------
    E2E Tests       |     Performance Tests
    User Acceptance |     Security Tests
                          |
                   Business-Facing
```

### Test-First Development

For MVP development, we adopt a pragmatic test-first approach:

1. **Critical Paths**: Write tests before implementation for authentication, payments, data integrity
2. **Complex Logic**: Write tests before implementation for feed algorithms, profile customization
3. **Bug Fixes**: Always write a failing test that reproduces the bug, then fix
4. **Refactoring**: Ensure comprehensive test coverage before refactoring

---

## Testing Frameworks and Tools

### Backend (Bun + Hono)

| Layer | Framework | Purpose |
|-------|-----------|---------|
| **Unit Testing** | Bun Test | Built-in test runner, fast, TypeScript native |
| **Integration Testing** | Bun Test + Testcontainers | API endpoint testing with real PostgreSQL |
| **API Testing** | Hono Test Helpers | HTTP request/response testing |
| **Database Testing** | Bun Test + pg | Schema validation, migration testing |
| **Mocking** | Bun.mock() | Built-in mocking for dependencies |

**Rationale for Bun Test:**
- Native to Bun runtime (no additional dependencies)
- Fast execution (optimized for Bun)
- Built-in TypeScript support
- Compatible with Jest-like API
- Integrated coverage reporting

**Dependencies:**
```json
{
  "devDependencies": {
    "bun-types": "latest",
    "@testcontainers/postgresql": "^10.0.0",
    "testcontainers": "^10.0.0"
  }
}
```

### Frontend (React + PWA)

| Layer | Framework | Purpose |
|-------|-----------|---------|
| **Component Testing** | Vitest + Testing Library | React component testing |
| **Integration Testing** | Vitest + Testing Library | Multi-component flows |
| **E2E Testing** | Playwright | Full user journey testing |
| **Visual Regression** | Playwright Screenshots | UI consistency testing |
| **PWA Testing** | Playwright + PWA Test Helpers | Offline/service worker testing |
| **Mocking** | MSW (Mock Service Worker) | API mocking in browser |

**Rationale for Vitest:**
- Fast (Vite-powered)
- ESM and TypeScript native
- Compatible with React Testing Library
- Built-in coverage
- Watch mode for development

**Rationale for Playwright:**
- Modern browser automation
- Built-in waiting and retry logic
- Mobile viewport testing
- Screenshot/video recording
- PWA testing capabilities

**Dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

### Database Testing

| Tool | Purpose |
|------|---------|
| **Testcontainers PostgreSQL** | Isolated test database instances |
| **pg** | Direct database queries in tests |
| **Custom Migration Runner** | Test migration up/down |

### End-to-End Testing

| Tool | Purpose |
|------|---------|
| **Playwright** | Browser automation |
| **Playwright Test Runner** | Test execution and reporting |
| **Playwright Inspector** | Debugging failing tests |

### CI/CD Integration

| Tool | Purpose |
|------|---------|
| **GitHub Actions** | CI/CD pipeline |
| **Bun CI** | Fast test execution in CI |
| **Playwright CI** | E2E tests in CI |
| **Codecov** | Coverage reporting |

---

## Test Organization Structure

### Directory Structure

```
vrss/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.service.test.ts          # Unit tests
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── auth.controller.test.ts       # Integration tests
│   │   │   ├── posts/
│   │   │   │   ├── posts.service.ts
│   │   │   │   ├── posts.service.test.ts
│   │   │   │   └── posts.repository.test.ts
│   │   │   ├── feeds/
│   │   │   │   ├── feed-algorithm.ts
│   │   │   │   └── feed-algorithm.test.ts        # Complex logic tests
│   │   │   └── db/
│   │   │       ├── migrations/
│   │   │       └── migrations.test.ts            # Migration tests
│   │   ├── test/
│   │   │   ├── setup.ts                          # Test setup/teardown
│   │   │   ├── fixtures/                         # Test data
│   │   │   │   ├── users.ts
│   │   │   │   ├── posts.ts
│   │   │   │   └── feeds.ts
│   │   │   ├── helpers/                          # Test utilities
│   │   │   │   ├── db-helper.ts
│   │   │   │   ├── auth-helper.ts
│   │   │   │   └── request-helper.ts
│   │   │   └── integration/                      # Cross-module tests
│   │   │       ├── auth-flow.test.ts
│   │   │       ├── post-creation.test.ts
│   │   │       └── feed-generation.test.ts
│   │   └── bunfig.toml                           # Bun test config
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── FeedBuilder/
│   │   │   │   │   ├── FeedBuilder.tsx
│   │   │   │   │   ├── FeedBuilder.test.tsx     # Component tests
│   │   │   │   │   └── FeedBuilder.stories.tsx  # Storybook (optional)
│   │   │   │   ├── ProfileCustomizer/
│   │   │   │   │   ├── ProfileCustomizer.tsx
│   │   │   │   │   └── ProfileCustomizer.test.tsx
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   ├── LoginForm.test.tsx
│   │   │   │   │   └── auth.integration.test.tsx # Integration tests
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   └── api-client.test.ts
│   │   │   └── sw/
│   │   │       ├── service-worker.ts
│   │   │       └── service-worker.test.ts        # PWA tests
│   │   ├── test/
│   │   │   ├── setup.ts                          # Vitest setup
│   │   │   ├── mocks/                            # MSW handlers
│   │   │   │   ├── handlers.ts
│   │   │   │   └── server.ts
│   │   │   └── fixtures/                         # Test data
│   │   │       ├── users.ts
│   │   │       └── posts.ts
│   │   └── vitest.config.ts
│   │
│   └── e2e/
│       ├── tests/
│       │   ├── auth/
│       │   │   ├── registration.spec.ts
│       │   │   ├── login.spec.ts
│       │   │   └── logout.spec.ts
│       │   ├── posts/
│       │   │   ├── create-post.spec.ts
│       │   │   ├── view-post.spec.ts
│       │   │   └── delete-post.spec.ts
│       │   ├── feeds/
│       │   │   ├── view-default-feed.spec.ts
│       │   │   ├── create-custom-feed.spec.ts
│       │   │   └── switch-feeds.spec.ts
│       │   ├── profile/
│       │   │   ├── customize-profile.spec.ts
│       │   │   └── view-profile.spec.ts
│       │   └── offline/
│       │       ├── offline-viewing.spec.ts
│       │       └── offline-sync.spec.ts
│       ├── fixtures/
│       │   ├── test-users.json
│       │   └── test-data.ts
│       ├── helpers/
│       │   ├── auth-helper.ts
│       │   ├── page-objects/                     # Page Object Model
│       │   │   ├── LoginPage.ts
│       │   │   ├── HomePage.ts
│       │   │   ├── ProfilePage.ts
│       │   │   └── FeedBuilderPage.ts
│       │   └── db-seed.ts
│       └── playwright.config.ts
│
└── .github/
    └── workflows/
        ├── test-backend.yml
        ├── test-frontend.yml
        └── test-e2e.yml
```

### Naming Conventions

**Test Files:**
- Unit tests: `*.test.ts` (co-located with source)
- Integration tests: `*.integration.test.ts` or in `test/integration/`
- E2E tests: `*.spec.ts` (in `e2e/tests/`)

**Test Suites:**
- `describe('ComponentName', ...)` for component tests
- `describe('ServiceName', ...)` for service tests
- `describe('Feature: FeatureName', ...)` for E2E tests

**Test Cases:**
- `it('should do something when condition', ...)` (behavior-focused)
- `test('edge case: description', ...)` for edge cases

---

## Testing Pyramid Strategy

### Distribution

```
         /\
        /  \  E2E Tests (10%)
       /    \ ~50 critical path tests
      /------\
     /        \ Integration Tests (30%)
    /          \ ~200 API/component tests
   /------------\
  /              \ Unit Tests (60%)
 /                \ ~400 business logic tests
/__________________\
```

### Rationale

**Unit Tests (60% - ~400 tests):**
- **Why**: Fast, isolated, cheap to maintain
- **What**: Business logic, utilities, pure functions, algorithms
- **Example**: Feed algorithm logic, post validation, user profile rules
- **Execution Time**: <1 second

**Integration Tests (30% - ~200 tests):**
- **Why**: Verify modules work together correctly
- **What**: API endpoints, database operations, component interactions
- **Example**: POST /api/posts creates post in database
- **Execution Time**: 1-3 minutes

**E2E Tests (10% - ~50 tests):**
- **Why**: Verify critical user journeys work end-to-end
- **What**: Full user flows across frontend and backend
- **Example**: User registers → logs in → creates post → views feed
- **Execution Time**: 2-4 minutes

### Test Selection Criteria

**When to write a Unit Test:**
- Pure functions (input → output)
- Business logic algorithms (feed filtering, post sorting)
- Validation rules (password strength, username format)
- Utilities and helpers
- Edge cases and error handling

**When to write an Integration Test:**
- API endpoint behavior
- Database queries and transactions
- External service integrations (with mocks)
- Component + hook interactions
- State management flows

**When to write an E2E Test:**
- Critical user journeys (registration, login, post creation)
- Payment flows
- Multi-step wizards (feed builder)
- Cross-page interactions
- PWA offline functionality

---

## Backend Testing Strategy

### Unit Testing

**Scope:**
- Service layer business logic
- Repository layer query builders
- Utility functions
- Validation logic
- Algorithm implementations (feed filtering, sorting)

**Example: Feed Algorithm Service**

```typescript
// packages/backend/src/feeds/feed-algorithm.ts
export class FeedAlgorithm {
  filterPosts(posts: Post[], rules: FilterRule[]): Post[] {
    return posts.filter(post => this.matchesRules(post, rules));
  }

  private matchesRules(post: Post, rules: FilterRule[]): boolean {
    // Complex filtering logic
  }
}

// packages/backend/src/feeds/feed-algorithm.test.ts
import { describe, it, expect } from 'bun:test';
import { FeedAlgorithm } from './feed-algorithm';

describe('FeedAlgorithm', () => {
  const algorithm = new FeedAlgorithm();

  describe('filterPosts', () => {
    it('should filter posts by post type', () => {
      const posts = [
        { id: 1, type: 'text', content: 'Hello' },
        { id: 2, type: 'image', content: 'Photo' },
      ];
      const rules = [{ field: 'type', operator: 'equals', value: 'text' }];

      const result = algorithm.filterPosts(posts, rules);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter posts by author', () => {
      const posts = [
        { id: 1, authorId: 'user1', content: 'Post 1' },
        { id: 2, authorId: 'user2', content: 'Post 2' },
      ];
      const rules = [{ field: 'author', operator: 'equals', value: 'user1' }];

      const result = algorithm.filterPosts(posts, rules);

      expect(result).toHaveLength(1);
      expect(result[0].authorId).toBe('user1');
    });

    it('should handle AND logic between multiple rules', () => {
      const posts = [
        { id: 1, type: 'text', authorId: 'user1' },
        { id: 2, type: 'image', authorId: 'user1' },
        { id: 3, type: 'text', authorId: 'user2' },
      ];
      const rules = [
        { field: 'type', operator: 'equals', value: 'text' },
        { field: 'author', operator: 'equals', value: 'user1' },
      ];

      const result = algorithm.filterPosts(posts, rules);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array when no posts match', () => {
      const posts = [{ id: 1, type: 'text' }];
      const rules = [{ field: 'type', operator: 'equals', value: 'video' }];

      const result = algorithm.filterPosts(posts, rules);

      expect(result).toEqual([]);
    });
  });
});
```

### Integration Testing

**Scope:**
- API endpoint request/response
- Database operations (CRUD)
- Authentication middleware
- Request validation
- Error handling

**Setup Pattern:**

```typescript
// packages/backend/test/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Database } from '../src/db';

let container: StartedPostgreSqlContainer;
let db: Database;

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  const connectionString = container.getConnectionUri();
  db = new Database(connectionString);

  // Run migrations
  await db.migrate();

  return db;
}

export async function teardownTestDatabase() {
  await db.close();
  await container.stop();
}

export async function clearDatabase() {
  // Clear all tables
  await db.query('TRUNCATE users, posts, feeds CASCADE');
}

export { db };
```

**Example: Post Creation API Test**

```typescript
// packages/backend/src/posts/posts.controller.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { app } from '../app';
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../../test/setup';
import { createTestUser, createAuthToken } from '../../test/helpers/auth-helper';

describe('POST /api/posts', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create a text post with valid authentication', async () => {
    const user = await createTestUser({ username: 'testuser' });
    const token = createAuthToken(user);

    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'text',
        content: 'This is a test post',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.type).toBe('text');
    expect(data.content).toBe('This is a test post');
    expect(data.authorId).toBe(user.id);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', content: 'Test' }),
    });

    expect(response.status).toBe(401);
  });

  it('should return 400 when content is missing', async () => {
    const user = await createTestUser();
    const token = createAuthToken(user);

    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'text' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('content');
  });

  it('should enforce storage limits on image uploads', async () => {
    const user = await createTestUser({ storageUsed: 49_000_000 }); // 49MB used
    const token = createAuthToken(user);

    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'image',
        imageUrl: 'https://example.com/large-image.jpg',
        imageSize: 2_000_000, // 2MB would exceed 50MB limit
      }),
    });

    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data.error).toContain('storage limit');
  });
});
```

---

## Frontend Testing Strategy

### Component Unit Testing

**Scope:**
- Individual components in isolation
- Component props and state
- Event handlers
- Conditional rendering
- Accessibility

**Example: LoginForm Component**

```typescript
// packages/frontend/src/features/auth/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render login form with username and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('should call onSubmit with credentials when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  it('should display error message when username is empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    const slowSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<LoginForm onSubmit={slowSubmit} />);

    const submitButton = screen.getByRole('button', { name: /log in/i });

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('should meet accessibility standards', async () => {
    const { container } = render(<LoginForm onSubmit={vi.fn()} />);

    // Check for proper label associations
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Check for form structure
    expect(container.querySelector('form')).toBeInTheDocument();
  });
});
```

### Integration Testing (Components + API)

**Scope:**
- Component interactions with API
- Data fetching and state management
- Error handling and loading states
- User flows across multiple components

**Setup: MSW (Mock Service Worker)**

```typescript
// packages/frontend/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json();

    if (username === 'testuser' && password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: { id: '1', username: 'testuser' },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get('/api/posts', () => {
    return HttpResponse.json({
      posts: [
        { id: '1', type: 'text', content: 'Test post 1', authorId: '1' },
        { id: '2', type: 'text', content: 'Test post 2', authorId: '2' },
      ],
    });
  }),

  http.post('/api/posts', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: '3',
      ...body,
      authorId: '1',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// packages/frontend/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Example: Login Flow Integration Test**

```typescript
// packages/frontend/src/features/auth/auth.integration.test.tsx
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../../../test/mocks/server';
import { LoginPage } from './LoginPage';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Login Flow Integration', () => {
  it('should log in user and redirect to home page', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    render(<LoginPage navigate={mockNavigate} />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  it('should display error message on invalid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'wronguser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.error();
      })
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
```

---

## End-to-End Testing Strategy

### Scope

Critical user journeys that must work end-to-end:

1. **Authentication Flows**
   - User registration
   - User login
   - User logout
   - Password reset (future)

2. **Post Management**
   - Create text post
   - Create image post
   - View post details
   - Delete post

3. **Feed Viewing**
   - View default feed
   - Switch between feeds
   - Scroll and pagination

4. **Feed Builder**
   - Create custom feed
   - Add filter blocks
   - Save and apply feed
   - Edit existing feed

5. **Profile Customization**
   - Update profile settings
   - Change background
   - Add profile sections

6. **Offline Functionality (PWA)**
   - View cached content offline
   - Sync when back online

### Page Object Model (POM)

**Pattern: Encapsulate page interactions in classes**

```typescript
// packages/e2e/helpers/page-objects/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel(/username/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /log in/i });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }

  async isLoggedIn(): Promise<boolean> {
    await this.page.waitForURL('/home', { timeout: 5000 });
    return this.page.url().includes('/home');
  }
}

// packages/e2e/helpers/page-objects/HomePage.ts
export class HomePage {
  readonly page: Page;
  readonly feedContainer: Locator;
  readonly feedTabs: Locator;
  readonly createPostButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.feedContainer = page.getByTestId('feed-container');
    this.feedTabs = page.getByRole('tablist');
    this.createPostButton = page.getByRole('button', { name: /create post/i });
  }

  async switchToFeed(feedName: string) {
    await this.feedTabs.getByRole('tab', { name: feedName }).click();
  }

  async getVisiblePosts() {
    return await this.feedContainer.getByTestId('post-card').all();
  }

  async createPost() {
    await this.createPostButton.click();
  }
}
```

### E2E Test Examples

**Example: Registration and Login Flow**

```typescript
// packages/e2e/tests/auth/registration.spec.ts
import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../../helpers/page-objects/RegistrationPage';
import { HomePage } from '../../helpers/page-objects/HomePage';

test.describe('User Registration', () => {
  test('should register new user and redirect to home', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const homePage = new HomePage(page);

    await registrationPage.goto();
    await registrationPage.register({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePass123!',
    });

    // Should redirect to home page after registration
    await expect(page).toHaveURL('/home');

    // Should display welcome message
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show error for duplicate username', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.goto();
    await registrationPage.register({
      username: 'existinguser', // Seeded in test database
      email: 'new@example.com',
      password: 'SecurePass123!',
    });

    await expect(registrationPage.errorMessage).toContainText(/username already taken/i);
  });

  test('should validate password strength', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.goto();
    await registrationPage.fillUsername('newuser');
    await registrationPage.fillEmail('newuser@example.com');
    await registrationPage.fillPassword('weak');

    await expect(registrationPage.passwordStrengthIndicator).toContainText(/weak/i);
    await expect(registrationPage.submitButton).toBeDisabled();
  });
});
```

**Example: Post Creation and Feed Viewing**

```typescript
// packages/e2e/tests/posts/create-post.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../../helpers/auth-helper';
import { HomePage } from '../../helpers/page-objects/HomePage';
import { CreatePostModal } from '../../helpers/page-objects/CreatePostModal';

test.describe('Post Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'testuser', 'password123');
  });

  test('should create text post and display in feed', async ({ page }) => {
    const homePage = new HomePage(page);
    const createPostModal = new CreatePostModal(page);

    await homePage.createPost();

    await createPostModal.selectPostType('text');
    await createPostModal.fillContent('This is a test post from E2E tests');
    await createPostModal.submit();

    // Modal should close
    await expect(createPostModal.modal).not.toBeVisible();

    // New post should appear at top of feed
    const posts = await homePage.getVisiblePosts();
    await expect(posts[0]).toContainText('This is a test post from E2E tests');
  });

  test('should create image post with upload', async ({ page }) => {
    const homePage = new HomePage(page);
    const createPostModal = new CreatePostModal(page);

    await homePage.createPost();

    await createPostModal.selectPostType('image');
    await createPostModal.uploadImage('test/fixtures/test-image.jpg');
    await createPostModal.fillCaption('Test image post');
    await createPostModal.submit();

    // Should show uploading indicator
    await expect(page.getByText(/uploading/i)).toBeVisible();

    // Should complete and show in feed
    await expect(page.getByText(/uploading/i)).not.toBeVisible({ timeout: 10000 });

    const posts = await homePage.getVisiblePosts();
    await expect(posts[0]).toContainText('Test image post');
    await expect(posts[0].getByRole('img')).toBeVisible();
  });

  test('should enforce storage limits', async ({ page }) => {
    // User with 49MB used (1MB under limit)
    await loginAsUser(page, 'almostfulluser', 'password123');

    const homePage = new HomePage(page);
    const createPostModal = new CreatePostModal(page);

    await homePage.createPost();
    await createPostModal.selectPostType('image');
    await createPostModal.uploadImage('test/fixtures/large-image-2mb.jpg');

    // Should show storage limit error
    await expect(page.getByText(/storage limit exceeded/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /upgrade storage/i })).toBeVisible();
  });
});
```

**Example: Feed Builder**

```typescript
// packages/e2e/tests/feeds/create-custom-feed.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../../helpers/auth-helper';
import { HomePage } from '../../helpers/page-objects/HomePage';
import { FeedBuilderPage } from '../../helpers/page-objects/FeedBuilderPage';

test.describe('Custom Feed Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'testuser', 'password123');
  });

  test('should create custom feed with post type filter', async ({ page }) => {
    const homePage = new HomePage(page);
    const feedBuilder = new FeedBuilderPage(page);

    // Open feed builder
    await homePage.openFeedBuilder();

    // Add filter block
    await feedBuilder.addFilterBlock('Post Type');
    await feedBuilder.selectPostType('image');

    // Name and save feed
    await feedBuilder.setFeedName('Images Only');
    await feedBuilder.saveFeed();

    // Should redirect to home with new feed active
    await expect(page).toHaveURL('/home');
    await expect(homePage.activeFeedTab).toContainText('Images Only');

    // Feed should only show image posts
    const posts = await homePage.getVisiblePosts();
    for (const post of posts) {
      await expect(post.getByRole('img')).toBeVisible();
    }
  });

  test('should create feed with AND logic (multiple filters)', async ({ page }) => {
    const homePage = new HomePage(page);
    const feedBuilder = new FeedBuilderPage(page);

    await homePage.openFeedBuilder();

    // Add post type filter
    await feedBuilder.addFilterBlock('Post Type');
    await feedBuilder.selectPostType('text');

    // Add author filter
    await feedBuilder.addFilterBlock('Author');
    await feedBuilder.selectAuthor('specificuser');

    // Add date range filter
    await feedBuilder.addFilterBlock('Date Range');
    await feedBuilder.selectDateRange('Last 7 days');

    await feedBuilder.setFeedName('Recent Text Posts from User');
    await feedBuilder.saveFeed();

    // Verify feed results match all filters
    const posts = await homePage.getVisiblePosts();
    for (const post of posts) {
      await expect(post).toContainText('specificuser');
      // Should be text posts only (no images)
      await expect(post.getByRole('img')).not.toBeVisible();
    }
  });

  test('should show live preview while building feed', async ({ page }) => {
    const feedBuilder = new FeedBuilderPage(page);

    await page.goto('/feed-builder');

    // Initially shows all posts
    let previewCount = await feedBuilder.getPreviewPostCount();
    const initialCount = previewCount;

    // Add filter
    await feedBuilder.addFilterBlock('Post Type');
    await feedBuilder.selectPostType('image');

    // Preview updates
    previewCount = await feedBuilder.getPreviewPostCount();
    expect(previewCount).toBeLessThan(initialCount);

    // All preview posts should be images
    const previewPosts = await feedBuilder.getPreviewPosts();
    for (const post of previewPosts) {
      await expect(post.getByRole('img')).toBeVisible();
    }
  });
});
```

### E2E Configuration

```typescript
// packages/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Database Testing Strategy

### Scope

1. **Schema Validation**: Ensure database schema matches expectations
2. **Migration Testing**: Test migration up/down operations
3. **Data Integrity**: Test constraints, indexes, relationships
4. **Query Performance**: Basic query performance validation

### Test Database Setup

**Approach: Testcontainers for isolated PostgreSQL instances**

```typescript
// packages/backend/test/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from '../src/db/migrate';
import postgres from 'postgres';

let container: PostgreSqlContainer;
let sql: postgres.Sql;

export async function setupDatabase() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();
  sql = postgres(connectionString);

  // Run migrations
  await migrate(sql);

  return sql;
}

export async function teardownDatabase() {
  await sql.end();
  await container.stop();
}

export async function clearDatabase() {
  await sql`TRUNCATE users, posts, feeds, comments, likes, follows CASCADE`;
}
```

### Migration Testing

**Example: Test Migration Up and Down**

```typescript
// packages/backend/src/db/migrations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupDatabase, teardownDatabase } from '../../test/setup';
import postgres from 'postgres';

describe('Database Migrations', () => {
  let sql: postgres.Sql;

  beforeAll(async () => {
    sql = await setupDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  it('should create users table with correct schema', async () => {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    expect(columns).toContainEqual(
      expect.objectContaining({
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
      })
    );

    expect(columns).toContainEqual(
      expect.objectContaining({
        column_name: 'username',
        data_type: 'character varying',
        is_nullable: 'NO',
      })
    );

    expect(columns).toContainEqual(
      expect.objectContaining({
        column_name: 'email',
        data_type: 'character varying',
        is_nullable: 'NO',
      })
    );
  });

  it('should create unique constraint on username', async () => {
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
    `;

    const usernameConstraint = constraints.find(c =>
      c.constraint_name.includes('username')
    );

    expect(usernameConstraint).toBeDefined();
  });

  it('should enforce unique username constraint', async () => {
    await sql`
      INSERT INTO users (id, username, email, password_hash)
      VALUES (gen_random_uuid(), 'testuser', 'test@example.com', 'hash123')
    `;

    await expect(async () => {
      await sql`
        INSERT INTO users (id, username, email, password_hash)
        VALUES (gen_random_uuid(), 'testuser', 'other@example.com', 'hash456')
      `;
    }).toThrow(/duplicate key value/);
  });

  it('should create posts table with foreign key to users', async () => {
    const foreignKeys = await sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'posts' AND tc.constraint_type = 'FOREIGN KEY'
    `;

    expect(foreignKeys).toContainEqual(
      expect.objectContaining({
        column_name: 'author_id',
        foreign_table_name: 'users',
        foreign_column_name: 'id',
      })
    );
  });

  it('should create indexes on frequently queried columns', async () => {
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'posts'
    `;

    // Index on author_id for feed queries
    expect(indexes).toContainEqual(
      expect.objectContaining({
        indexname: expect.stringContaining('author_id'),
      })
    );

    // Index on created_at for chronological sorting
    expect(indexes).toContainEqual(
      expect.objectContaining({
        indexname: expect.stringContaining('created_at'),
      })
    );
  });
});
```

### Repository Testing

**Example: Post Repository Tests**

```typescript
// packages/backend/src/posts/posts.repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupDatabase, teardownDatabase, clearDatabase } from '../../test/setup';
import { PostsRepository } from './posts.repository';
import { createTestUser } from '../../test/fixtures/users';

describe('PostsRepository', () => {
  let repo: PostsRepository;

  beforeAll(async () => {
    const sql = await setupDatabase();
    repo = new PostsRepository(sql);
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('create', () => {
    it('should create a post and return it with id', async () => {
      const user = await createTestUser();

      const post = await repo.create({
        authorId: user.id,
        type: 'text',
        content: 'Test post',
      });

      expect(post.id).toBeDefined();
      expect(post.authorId).toBe(user.id);
      expect(post.type).toBe('text');
      expect(post.content).toBe('Test post');
      expect(post.createdAt).toBeInstanceOf(Date);
    });

    it('should increment user storage when creating image post', async () => {
      const user = await createTestUser({ storageUsed: 1000 });

      await repo.create({
        authorId: user.id,
        type: 'image',
        imageUrl: 'https://example.com/image.jpg',
        imageSize: 500000, // 500KB
      });

      const updatedUser = await repo.getUserById(user.id);
      expect(updatedUser.storageUsed).toBe(501000);
    });
  });

  describe('findByAuthor', () => {
    it('should return posts by specific author', async () => {
      const user1 = await createTestUser({ username: 'user1' });
      const user2 = await createTestUser({ username: 'user2' });

      await repo.create({ authorId: user1.id, type: 'text', content: 'User 1 post' });
      await repo.create({ authorId: user2.id, type: 'text', content: 'User 2 post' });
      await repo.create({ authorId: user1.id, type: 'text', content: 'User 1 second post' });

      const posts = await repo.findByAuthor(user1.id);

      expect(posts).toHaveLength(2);
      expect(posts.every(p => p.authorId === user1.id)).toBe(true);
    });

    it('should return posts in reverse chronological order', async () => {
      const user = await createTestUser();

      const post1 = await repo.create({ authorId: user.id, type: 'text', content: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const post2 = await repo.create({ authorId: user.id, type: 'text', content: 'Second' });

      const posts = await repo.findByAuthor(user.id);

      expect(posts[0].id).toBe(post2.id); // Most recent first
      expect(posts[1].id).toBe(post1.id);
    });
  });

  describe('delete', () => {
    it('should delete post and return true', async () => {
      const user = await createTestUser();
      const post = await repo.create({ authorId: user.id, type: 'text', content: 'Test' });

      const result = await repo.delete(post.id, user.id);

      expect(result).toBe(true);

      const found = await repo.findById(post.id);
      expect(found).toBeNull();
    });

    it('should not delete post if user is not author', async () => {
      const author = await createTestUser({ username: 'author' });
      const otherUser = await createTestUser({ username: 'other' });
      const post = await repo.create({ authorId: author.id, type: 'text', content: 'Test' });

      const result = await repo.delete(post.id, otherUser.id);

      expect(result).toBe(false);

      const found = await repo.findById(post.id);
      expect(found).not.toBeNull();
    });

    it('should decrease user storage when deleting image post', async () => {
      const user = await createTestUser({ storageUsed: 500000 });
      const post = await repo.create({
        authorId: user.id,
        type: 'image',
        imageUrl: 'https://example.com/image.jpg',
        imageSize: 250000,
      });

      await repo.delete(post.id, user.id);

      const updatedUser = await repo.getUserById(user.id);
      expect(updatedUser.storageUsed).toBe(250000); // 500000 - 250000
    });
  });
});
```

---

## Authentication Testing Strategy

### Scope

1. **Registration Flow**: Username/email/password validation, account creation
2. **Login Flow**: Credential validation, session creation
3. **Session Management**: Token generation, validation, expiration
4. **Protected Routes**: Authorization middleware
5. **Logout**: Session cleanup

### Integration Tests

**Example: Better-auth Integration Tests**

```typescript
// packages/backend/src/auth/auth.controller.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { app } from '../app';
import { setupDatabase, teardownDatabase, clearDatabase } from '../../test/setup';

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('newuser');
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.token).toBeDefined();
      expect(data.user.password).toBeUndefined(); // Never expose password
    });

    it('should reject duplicate username', async () => {
      // Create first user
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test1@example.com',
          password: 'SecurePass123!',
        }),
      });

      // Try to create second user with same username
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'SecurePass456!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('username');
    });

    it('should enforce password strength requirements', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'weak',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('password');
    });

    it('should validate email format', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('email');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      });
    });

    it('should login with valid credentials', async () => {
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');
      expect(data.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'WrongPassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid credentials');
    });
  });

  describe('Protected Routes', () => {
    it('should allow access with valid token', async () => {
      // Register and login
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'SecurePass123!',
        }),
      });
      const { token } = await loginRes.json();

      // Access protected route
      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'text',
          content: 'Test post',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should reject access without token', async () => {
      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: 'Test post',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          type: 'text',
          content: 'Test post',
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
```

---

## API Contract Testing Strategy

### Scope

For RPC-style API, ensure:

1. **Request/Response Type Safety**: TypeScript types match runtime behavior
2. **Input Validation**: Invalid inputs rejected with clear errors
3. **Output Contracts**: Responses match declared types
4. **Error Handling**: Errors formatted consistently
5. **Backward Compatibility**: Changes don't break existing clients

### Type-Safe RPC Pattern

**Example: Shared Types**

```typescript
// packages/shared/types/api.ts
export interface CreatePostRequest {
  type: 'text' | 'image' | 'video' | 'song';
  content?: string;
  imageUrl?: string;
  imageSize?: number;
}

export interface CreatePostResponse {
  id: string;
  authorId: string;
  type: string;
  content?: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}
```

**Contract Tests**

```typescript
// packages/backend/src/posts/posts.contract.test.ts
import { describe, it, expect } from 'bun:test';
import { app } from '../app';
import { CreatePostRequest, CreatePostResponse, ApiError } from '@vrss/shared/types/api';
import { createTestUser, createAuthToken } from '../../test/helpers/auth-helper';

describe('Posts API Contract', () => {
  describe('POST /api/posts', () => {
    it('should match CreatePostResponse type for valid request', async () => {
      const user = await createTestUser();
      const token = createAuthToken(user);

      const request: CreatePostRequest = {
        type: 'text',
        content: 'Test post',
      };

      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(201);
      const data: CreatePostResponse = await response.json();

      // Verify response matches contract
      expect(typeof data.id).toBe('string');
      expect(typeof data.authorId).toBe('string');
      expect(data.type).toBe('text');
      expect(typeof data.content).toBe('string');
      expect(typeof data.createdAt).toBe('string');
      expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
    });

    it('should match ApiError type for invalid request', async () => {
      const user = await createTestUser();
      const token = createAuthToken(user);

      const invalidRequest = {
        type: 'invalid-type',
      };

      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);
      const data: ApiError = await response.json();

      // Verify error matches contract
      expect(typeof data.error).toBe('string');
      expect(typeof data.code).toBe('string');
      if (data.details) {
        expect(typeof data.details).toBe('object');
      }
    });

    it('should validate request against TypeScript types', async () => {
      const user = await createTestUser();
      const token = createAuthToken(user);

      // Type checker should catch this at compile time
      // @ts-expect-error - Testing runtime validation
      const invalidRequest: CreatePostRequest = {
        type: 'text',
        invalidField: 'should be rejected',
      };

      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(invalidRequest),
      });

      // Runtime should also reject
      expect(response.status).toBe(400);
    });
  });
});
```

### Runtime Type Validation

**Example: Using Zod for validation**

```typescript
// packages/backend/src/posts/posts.schema.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'song']),
  content: z.string().min(1).max(10000).optional(),
  imageUrl: z.string().url().optional(),
  imageSize: z.number().int().positive().optional(),
}).refine(
  (data) => {
    // Text posts must have content
    if (data.type === 'text' && !data.content) return false;
    // Image posts must have imageUrl and imageSize
    if (data.type === 'image' && (!data.imageUrl || !data.imageSize)) return false;
    return true;
  },
  { message: 'Invalid post data for post type' }
);

// Test schema validation
describe('Post Schema Validation', () => {
  it('should validate valid text post', () => {
    const result = createPostSchema.safeParse({
      type: 'text',
      content: 'Hello world',
    });

    expect(result.success).toBe(true);
  });

  it('should reject text post without content', () => {
    const result = createPostSchema.safeParse({
      type: 'text',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('content');
    }
  });

  it('should reject image post without imageUrl', () => {
    const result = createPostSchema.safeParse({
      type: 'image',
      imageSize: 100000,
    });

    expect(result.success).toBe(false);
  });
});
```

---

## Test Data Management

### Fixtures Strategy

**Principles:**
- Realistic test data reflecting actual use cases
- Reusable fixtures across tests
- Builders for flexible test data creation
- Seed data for E2E tests

### Fixture Builders

```typescript
// packages/backend/test/fixtures/users.ts
import { randomUUID } from 'crypto';

interface UserFixture {
  id?: string;
  username?: string;
  email?: string;
  password?: string;
  storageUsed?: number;
  storageLimit?: number;
  createdAt?: Date;
}

export function buildUser(overrides: UserFixture = {}): User {
  const username = overrides.username || `user_${randomUUID().slice(0, 8)}`;

  return {
    id: overrides.id || randomUUID(),
    username,
    email: overrides.email || `${username}@example.com`,
    passwordHash: hashPassword(overrides.password || 'DefaultPass123!'),
    storageUsed: overrides.storageUsed || 0,
    storageLimit: overrides.storageLimit || 50_000_000, // 50MB
    createdAt: overrides.createdAt || new Date(),
  };
}

export async function createTestUser(overrides: UserFixture = {}): Promise<User> {
  const user = buildUser(overrides);
  await db.insertUser(user);
  return user;
}

// Predefined personas
export const PERSONA_CREATOR = {
  username: 'maya_creator',
  email: 'maya@example.com',
  storageUsed: 30_000_000, // 30MB used
};

export const PERSONA_CONSUMER = {
  username: 'marcus_consumer',
  email: 'marcus@example.com',
};

export const PERSONA_BUSINESS = {
  username: 'jade_restaurant',
  email: 'jade@restaurant.com',
  storageUsed: 45_000_000, // 45MB used
};
```

```typescript
// packages/backend/test/fixtures/posts.ts
interface PostFixture {
  id?: string;
  authorId?: string;
  type?: 'text' | 'image' | 'video' | 'song';
  content?: string;
  imageUrl?: string;
  imageSize?: number;
  createdAt?: Date;
}

export function buildPost(overrides: PostFixture = {}): Post {
  const type = overrides.type || 'text';

  return {
    id: overrides.id || randomUUID(),
    authorId: overrides.authorId || randomUUID(),
    type,
    content: overrides.content || (type === 'text' ? 'Sample post content' : undefined),
    imageUrl: overrides.imageUrl || (type === 'image' ? 'https://example.com/image.jpg' : undefined),
    imageSize: overrides.imageSize || (type === 'image' ? 500000 : 0),
    createdAt: overrides.createdAt || new Date(),
  };
}

export async function createTestPost(overrides: PostFixture = {}): Promise<Post> {
  const post = buildPost(overrides);
  await db.insertPost(post);
  return post;
}

// Sample posts for different scenarios
export const SAMPLE_TEXT_POST = {
  type: 'text' as const,
  content: 'This is a sample text post for testing',
};

export const SAMPLE_IMAGE_POST = {
  type: 'image' as const,
  imageUrl: 'https://example.com/test-image.jpg',
  imageSize: 500000,
  content: 'Sample image caption',
};

export const SAMPLE_LONG_POST = {
  type: 'text' as const,
  content: 'Lorem ipsum dolor sit amet...'.repeat(100), // Long content
};
```

### Database Seeding for E2E Tests

```typescript
// packages/e2e/helpers/db-seed.ts
import { db } from './db-connection';
import { buildUser, buildPost } from './fixtures';

export async function seedDatabase() {
  // Clear existing data
  await db.query('TRUNCATE users, posts, feeds, follows CASCADE');

  // Create users
  const creator = await db.insertUser(buildUser({
    username: 'testcreator',
    email: 'creator@test.com',
  }));

  const consumer = await db.insertUser(buildUser({
    username: 'testconsumer',
    email: 'consumer@test.com',
  }));

  // Create posts
  await db.insertPost(buildPost({
    authorId: creator.id,
    type: 'text',
    content: 'First test post',
  }));

  await db.insertPost(buildPost({
    authorId: creator.id,
    type: 'image',
    imageUrl: 'https://example.com/test1.jpg',
    imageSize: 250000,
  }));

  // Create follows
  await db.insertFollow({
    followerId: consumer.id,
    followingId: creator.id,
  });

  return { creator, consumer };
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

**Backend Tests**

```yaml
# .github/workflows/test-backend.yml
name: Backend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    paths:
      - 'packages/backend/**'
      - '.github/workflows/test-backend.yml'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: vrss_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install
        working-directory: packages/backend

      - name: Run unit tests
        run: bun test
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vrss_test

      - name: Run integration tests
        run: bun test:integration
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vrss_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/backend/coverage/coverage-final.json
          flags: backend
```

**Frontend Tests**

```yaml
# .github/workflows/test-frontend.yml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    paths:
      - 'packages/frontend/**'
      - '.github/workflows/test-frontend.yml'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install
        working-directory: packages/frontend

      - name: Run unit tests
        run: bun test:unit
        working-directory: packages/frontend

      - name: Run component tests
        run: bun test:components
        working-directory: packages/frontend

      - name: Run integration tests
        run: bun test:integration
        working-directory: packages/frontend

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/frontend/coverage/coverage-final.json
          flags: frontend
```

**E2E Tests**

```yaml
# .github/workflows/test-e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    timeout-minutes: 15
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: vrss_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium
        working-directory: packages/e2e

      - name: Build backend
        run: bun run build
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vrss_test

      - name: Build frontend
        run: bun run build
        working-directory: packages/frontend

      - name: Run migrations
        run: bun run migrate
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vrss_test

      - name: Start backend server
        run: bun run start &
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vrss_test
          PORT: 3001

      - name: Start frontend server
        run: bun run preview &
        working-directory: packages/frontend
        env:
          VITE_API_URL: http://localhost:3001

      - name: Wait for servers
        run: |
          npx wait-on http://localhost:3001/health http://localhost:3000

      - name: Run E2E tests
        run: bunx playwright test
        working-directory: packages/e2e
        env:
          BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: packages/e2e/playwright-report/
          retention-days: 7
```

### Test Execution Time Targets

| Test Suite | Target Time | Max Acceptable |
|------------|-------------|----------------|
| Backend Unit | <30s | 1min |
| Backend Integration | <2min | 3min |
| Frontend Unit | <30s | 1min |
| Frontend Integration | <1min | 2min |
| E2E (Critical paths) | <3min | 5min |
| **Total CI Pipeline** | **<5min** | **10min** |

---

## Test Coverage Goals

### Overall Coverage Targets

| Layer | Line Coverage | Branch Coverage | Function Coverage |
|-------|---------------|-----------------|-------------------|
| **Backend Services** | 90%+ | 85%+ | 90%+ |
| **Backend Controllers** | 85%+ | 80%+ | 85%+ |
| **Frontend Components** | 80%+ | 75%+ | 80%+ |
| **Frontend Utilities** | 90%+ | 85%+ | 90%+ |
| **Overall Project** | 80%+ | 75%+ | 80%+ |

### Critical Path Coverage

**Must have 100% test coverage:**
- Authentication (registration, login, session management)
- Payment processing (storage upgrades)
- Data integrity (post creation, deletion, storage calculations)
- Security (authorization checks, input validation)

**Should have 90%+ coverage:**
- Feed algorithm logic
- Profile customization
- Post management
- User settings

**Can have 70%+ coverage:**
- UI components (visual presentation)
- Static content
- Non-critical features

### Coverage Enforcement

**package.json scripts:**

```json
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:coverage:check": "bun test --coverage --coverage-threshold=80"
  }
}
```

**CI Configuration:**

```yaml
- name: Check coverage thresholds
  run: bun test:coverage:check

- name: Comment coverage on PR
  uses: codecov/codecov-action@v3
  with:
    fail_ci_if_error: true
    files: ./coverage/coverage-final.json
```

---

## Performance Testing

### Scope (MVP)

**In Scope:**
- Response time validation for critical endpoints
- Database query performance
- Feed algorithm performance (max 1000 posts)
- Frontend component render performance

**Out of Scope (Post-MVP):**
- Load testing (concurrent users)
- Stress testing (system limits)
- Endurance testing (long-running stability)

### Performance Benchmarks

**Backend API Response Times:**

| Endpoint | Target (p50) | Max (p95) |
|----------|--------------|-----------|
| GET /api/posts | <100ms | <200ms |
| POST /api/posts | <150ms | <300ms |
| GET /api/feeds/:id | <200ms | <500ms |
| POST /api/feeds | <100ms | <200ms |
| POST /api/auth/login | <150ms | <300ms |

**Frontend Performance:**

| Metric | Target | Max |
|--------|--------|-----|
| First Contentful Paint | <1.5s | <2s |
| Time to Interactive | <2.5s | <3.5s |
| Component Render | <16ms | <50ms |

### Performance Test Examples

```typescript
// packages/backend/src/feeds/feed-algorithm.perf.test.ts
import { describe, it, expect } from 'bun:test';
import { FeedAlgorithm } from './feed-algorithm';
import { generateTestPosts } from '../../test/fixtures/posts';

describe('Feed Algorithm Performance', () => {
  it('should filter 1000 posts in under 100ms', () => {
    const algorithm = new FeedAlgorithm();
    const posts = generateTestPosts(1000);
    const rules = [
      { field: 'type', operator: 'equals', value: 'text' },
      { field: 'author', operator: 'in', value: ['user1', 'user2', 'user3'] },
    ];

    const startTime = performance.now();
    const result = algorithm.filterPosts(posts, rules);
    const endTime = performance.now();

    const duration = endTime - startTime;
    expect(duration).toBeLessThan(100);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle complex nested rules efficiently', () => {
    const algorithm = new FeedAlgorithm();
    const posts = generateTestPosts(500);

    // Complex rules: (type=text OR type=image) AND (author IN list) AND (date > threshold)
    const rules = [
      { field: 'type', operator: 'in', value: ['text', 'image'] },
      { field: 'author', operator: 'in', value: Array.from({ length: 50 }, (_, i) => `user${i}`) },
      { field: 'createdAt', operator: 'gte', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    ];

    const startTime = performance.now();
    const result = algorithm.filterPosts(posts, rules);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50);
  });
});
```

---

## Security Testing

### Scope (MVP)

**Automated Security Tests:**
1. **Authentication Security**
   - Password hashing verification
   - Session token security
   - CSRF protection

2. **Authorization**
   - Access control enforcement
   - Resource ownership validation

3. **Input Validation**
   - SQL injection prevention
   - XSS prevention
   - Path traversal prevention

4. **Data Protection**
   - Sensitive data masking in logs
   - Password never exposed in responses

**Manual Security Review (Pre-Launch):**
- Dependency vulnerability scan
- Security headers configuration
- HTTPS enforcement
- Rate limiting configuration

### Security Test Examples

```typescript
// packages/backend/src/auth/auth.security.test.ts
import { describe, it, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './auth.service';

describe('Authentication Security', () => {
  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      // Hash should be different from original password
      expect(hash).not.toBe(password);

      // Hash should be sufficiently long (bcrypt produces 60-char hashes)
      expect(hash.length).toBeGreaterThan(50);

      // Same password should produce different hashes (salt)
      const hash2 = await hashPassword(password);
      expect(hash2).not.toBe(hash);
    });

    it('should verify correct passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousUsername = "admin' OR '1'='1";
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: maliciousUsername,
          password: 'anything',
        }),
      });

      // Should return 401, not execute SQL injection
      expect(response.status).toBe(401);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input in posts', async () => {
      const user = await createTestUser();
      const token = createAuthToken(user);

      const maliciousContent = '<script>alert("XSS")</script>';

      const response = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'text',
          content: maliciousContent,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      // Content should be escaped or sanitized
      expect(data.content).not.toContain('<script>');
    });
  });

  describe('Authorization', () => {
    it('should prevent users from deleting others posts', async () => {
      const author = await createTestUser({ username: 'author' });
      const otherUser = await createTestUser({ username: 'other' });

      const post = await createTestPost({ authorId: author.id });
      const token = createAuthToken(otherUser);

      const response = await app.request(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Data Protection', () => {
    it('should never expose password hash in API responses', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      });

      const data = await response.json();

      expect(data.user.password).toBeUndefined();
      expect(data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('password');
    });
  });
});
```

---

## PWA Offline Testing

### Scope

1. **Service Worker Registration**: Verify SW installs and activates
2. **Cache Management**: Test caching strategies
3. **Offline Viewing**: Verify cached content accessible offline
4. **Background Sync**: Test queued actions sync when online
5. **Installation**: Test "Add to Home Screen" flow

### Testing Strategy

**Unit Tests (Service Worker):**

```typescript
// packages/frontend/src/sw/service-worker.test.ts
import { describe, it, expect, mock } from 'vitest';

describe('Service Worker', () => {
  it('should cache essential assets on install', async () => {
    const mockCache = {
      addAll: mock.fn(),
    };

    globalThis.caches = {
      open: mock.fn(() => Promise.resolve(mockCache)),
    };

    const event = new ExtendableEvent('install');

    // Import and trigger install event
    const { onInstall } = await import('./service-worker');
    await onInstall(event);

    expect(mockCache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining([
        '/',
        '/index.html',
        '/assets/main.js',
        '/assets/main.css',
      ])
    );
  });

  it('should serve cached content when offline', async () => {
    const mockResponse = new Response('Cached content');
    const mockCache = {
      match: mock.fn(() => Promise.resolve(mockResponse)),
    };

    globalThis.caches = {
      match: mock.fn(() => Promise.resolve(mockResponse)),
    };

    const request = new Request('https://example.com/');
    const { onFetch } = await import('./service-worker');

    const response = await onFetch(request);

    expect(response).toBe(mockResponse);
  });
});
```

**E2E Tests (Offline Functionality):**

```typescript
// packages/e2e/tests/offline/offline-viewing.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../../helpers/auth-helper';

test.describe('Offline Functionality', () => {
  test('should display cached posts when offline', async ({ page, context }) => {
    await loginAsUser(page, 'testuser', 'password123');

    // Navigate to home page and ensure posts loaded
    await page.goto('/home');
    await expect(page.getByTestId('post-card')).toHaveCount(5);

    // Wait for service worker to cache content
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Should still display cached posts
    await expect(page.getByTestId('post-card')).toHaveCount(5);

    // Should show offline indicator
    await expect(page.getByText(/offline/i)).toBeVisible();
  });

  test('should queue post creation when offline and sync when online', async ({ page, context }) => {
    await loginAsUser(page, 'testuser', 'password123');
    await page.goto('/home');

    // Go offline
    await context.setOffline(true);

    // Create post while offline
    await page.getByRole('button', { name: /create post/i }).click();
    await page.getByLabel(/content/i).fill('Offline post test');
    await page.getByRole('button', { name: /submit/i }).click();

    // Should show queued status
    await expect(page.getByText(/queued for sync/i)).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Should sync and show success
    await expect(page.getByText(/post created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should install as PWA', async ({ page }) => {
    await page.goto('/');

    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Verify service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistered).toBe(true);
  });
});
```

---

## Test Patterns and Examples

### Common Test Patterns

#### 1. Arrange-Act-Assert (AAA) Pattern

```typescript
describe('PostsService', () => {
  it('should create post with valid data', async () => {
    // ARRANGE: Set up test data and dependencies
    const user = await createTestUser();
    const postData = {
      authorId: user.id,
      type: 'text',
      content: 'Test post',
    };
    const service = new PostsService(db);

    // ACT: Execute the behavior being tested
    const post = await service.createPost(postData);

    // ASSERT: Verify the outcome
    expect(post.id).toBeDefined();
    expect(post.content).toBe('Test post');
    expect(post.authorId).toBe(user.id);
  });
});
```

#### 2. Test Data Builders

```typescript
class PostBuilder {
  private data: Partial<Post> = {
    type: 'text',
    content: 'Default content',
  };

  withAuthor(authorId: string): this {
    this.data.authorId = authorId;
    return this;
  }

  withType(type: PostType): this {
    this.data.type = type;
    return this;
  }

  withContent(content: string): this {
    this.data.content = content;
    return this;
  }

  build(): Post {
    return {
      id: randomUUID(),
      createdAt: new Date(),
      ...this.data,
    } as Post;
  }

  async create(): Promise<Post> {
    const post = this.build();
    await db.insertPost(post);
    return post;
  }
}

// Usage
describe('Feed Algorithm', () => {
  it('should filter posts by type', async () => {
    const user = await createTestUser();

    await new PostBuilder()
      .withAuthor(user.id)
      .withType('text')
      .create();

    await new PostBuilder()
      .withAuthor(user.id)
      .withType('image')
      .create();

    const textPosts = await feedService.getPosts({ type: 'text' });
    expect(textPosts).toHaveLength(1);
  });
});
```

#### 3. Parameterized Tests

```typescript
describe('Password Validation', () => {
  const validPasswords = [
    'SecurePass123!',
    'MyP@ssw0rd2025',
    'Str0ng!Pass#word',
  ];

  validPasswords.forEach(password => {
    it(`should accept valid password: ${password}`, () => {
      const result = validatePassword(password);
      expect(result.valid).toBe(true);
    });
  });

  const invalidPasswords = [
    { password: 'short', reason: 'too short' },
    { password: 'nouppercase123!', reason: 'no uppercase' },
    { password: 'NOLOWERCASE123!', reason: 'no lowercase' },
    { password: 'NoSpecialChar123', reason: 'no special char' },
    { password: 'NoNumbers!', reason: 'no numbers' },
  ];

  invalidPasswords.forEach(({ password, reason }) => {
    it(`should reject password ${reason}: ${password}`, () => {
      const result = validatePassword(password);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(reason);
    });
  });
});
```

#### 4. Mocking External Dependencies

```typescript
import { describe, it, expect, mock } from 'bun:test';

describe('S3 Upload Service', () => {
  it('should upload file to S3', async () => {
    const mockS3Client = {
      upload: mock.fn(() => Promise.resolve({
        url: 'https://s3.amazonaws.com/bucket/file.jpg',
      })),
    };

    const service = new UploadService(mockS3Client);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.uploadImage(file);

    expect(mockS3Client.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      })
    );
    expect(result.url).toBe('https://s3.amazonaws.com/bucket/file.jpg');
  });

  it('should handle S3 errors gracefully', async () => {
    const mockS3Client = {
      upload: mock.fn(() => Promise.reject(new Error('S3 unavailable'))),
    };

    const service = new UploadService(mockS3Client);
    const file = new File(['content'], 'test.jpg');

    await expect(service.uploadImage(file)).rejects.toThrow(/upload failed/i);
  });
});
```

#### 5. Testing Async Operations

```typescript
describe('Async Post Creation', () => {
  it('should create post and trigger notification', async () => {
    const user = await createTestUser();
    const notificationSpy = mock.fn();

    const service = new PostsService(db, { onPostCreated: notificationSpy });

    const post = await service.createPost({
      authorId: user.id,
      type: 'text',
      content: 'Test',
    });

    // Wait for async notification
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(notificationSpy).toHaveBeenCalledWith(post);
  });

  it('should handle concurrent post creation', async () => {
    const user = await createTestUser();
    const service = new PostsService(db);

    // Create 10 posts concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      service.createPost({
        authorId: user.id,
        type: 'text',
        content: `Post ${i}`,
      })
    );

    const posts = await Promise.all(promises);

    expect(posts).toHaveLength(10);
    expect(new Set(posts.map(p => p.id))).toHaveLength(10); // All unique IDs
  });
});
```

#### 6. Testing Error Handling

```typescript
describe('Error Handling', () => {
  it('should return 400 for validation errors', async () => {
    const user = await createTestUser();
    const token = createAuthToken(user);

    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'invalid-type',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('should return 500 for unexpected errors', async () => {
    // Mock database failure
    const mockDB = {
      query: mock.fn(() => Promise.reject(new Error('Database error'))),
    };

    const service = new PostsService(mockDB);

    await expect(
      service.createPost({ authorId: '123', type: 'text', content: 'Test' })
    ).rejects.toThrow(/database error/i);
  });

  it('should log errors without exposing sensitive details', async () => {
    const mockLogger = {
      error: mock.fn(),
    };

    // Trigger error
    // ...

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        // Should NOT contain passwords, tokens, etc.
      })
    );
  });
});
```

---

## Summary

### Key Testing Infrastructure Decisions

1. **Backend**: Bun Test + Testcontainers PostgreSQL
2. **Frontend**: Vitest + React Testing Library + MSW
3. **E2E**: Playwright with Page Object Model
4. **Database**: Testcontainers for isolated test databases
5. **API Mocking**: MSW for frontend, real HTTP calls for backend integration tests
6. **CI/CD**: GitHub Actions with parallel test execution

### Testing Pyramid

- **60% Unit Tests**: Fast, isolated, business logic
- **30% Integration Tests**: API endpoints, database operations, component integration
- **10% E2E Tests**: Critical user journeys, full stack validation

### Coverage Goals

- **Overall**: 80%+ line coverage
- **Critical paths**: 100% coverage (auth, payments, data integrity)
- **Business logic**: 90%+ coverage

### Success Metrics

- All tests run in <5 minutes in CI/CD
- Zero flaky tests
- Test failures are actionable and debuggable
- Tests support TDD workflow
- Comprehensive E2E coverage of critical flows

---

## Next Steps

1. **Set up testing infrastructure** (Week 1)
   - Install testing frameworks
   - Configure Testcontainers
   - Set up CI/CD workflows

2. **Write foundational tests** (Week 2)
   - Database schema tests
   - Authentication tests
   - Basic API endpoint tests

3. **Implement TDD for features** (Ongoing)
   - Write tests before implementation
   - Maintain coverage goals
   - Iterate based on feedback

4. **Monitor and improve** (Continuous)
   - Track test execution time
   - Fix flaky tests immediately
   - Refactor tests as needed
   - Update coverage goals based on learnings
