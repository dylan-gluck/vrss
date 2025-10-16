# Frontend Testing Infrastructure

Complete testing setup for the VRSS React + Vite PWA application.

## Overview

This testing infrastructure provides:
- **Vitest** for fast unit and integration testing
- **React Testing Library** for component testing
- **MSW (Mock Service Worker)** for API mocking
- **happy-dom** for lightweight DOM environment
- **Custom utilities** for rendering with providers
- **Test personas** matching specification requirements
- **80%+ coverage thresholds** enforced

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Directory Structure

```
test/
├── README.md                  # This file
├── setup.ts                   # Global test setup & MSW initialization
├── infrastructure.test.tsx    # Infrastructure validation tests
├── mocks/
│   ├── server.ts             # MSW server setup
│   ├── handlers.ts           # RPC API mock handlers
│   └── data.ts               # Test personas and mock data
└── utils/
    └── render.tsx            # Custom render utility with providers
```

## Writing Tests

### Basic Component Test

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/render';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing with TanStack Query

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import { FeedComponent } from '@/features/feed/components/FeedView';

describe('FeedComponent', () => {
  it('should load and display posts', async () => {
    render(<FeedComponent />);

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Working on my new album/)).toBeInTheDocument();
    });
  });
});
```

### Testing with User Interactions

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/features/auth/components/LoginForm';

describe('LoginForm', () => {
  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'maya@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'maya@example.com',
      password: 'SecurePass123!',
    });
  });
});
```

## Mock Data

### Test Personas

The testing infrastructure includes predefined test personas from the specification:

```typescript
import { TEST_PERSONAS } from '@/test/mocks/data';

// Available personas:
TEST_PERSONAS.CREATOR     // maya_music - Indie musician
TEST_PERSONAS.CONSUMER    // marcus_consumer - Music enthusiast
TEST_PERSONAS.BUSINESS    // jade_cafe - Local coffee shop
```

### Mock Posts

```typescript
import { MOCK_POSTS } from '@/test/mocks/data';

// Available mock posts
MOCK_POSTS[0] // Text post from maya_music
MOCK_POSTS[1] // Image post from maya_music
MOCK_POSTS[2] // Text post from marcus_consumer
```

### Creating Custom Mocks

```typescript
import { createMockPost, createMockProfile } from '@/test/mocks/data';

const customPost = createMockPost({
  content: 'Custom test post',
  likesCount: 100,
});

const customProfile = createMockProfile({
  username: 'test_user',
  followersCount: 500,
});
```

## API Mocking with MSW

All RPC API calls are automatically mocked by MSW. The handlers are defined in `/test/mocks/handlers.ts`.

### Covered RPC Methods

**Authentication:**
- `auth.register`
- `auth.login`
- `auth.logout`
- `auth.verify`

**Feed:**
- `feed.get`
- `post.get`
- `post.create`
- `post.like`
- `post.unlike`
- `post.bookmark`

**Profile:**
- `profile.get`
- `profile.me`
- `profile.update`
- `user.follow`
- `user.unfollow`

**Notifications:**
- `notifications.get`
- `notifications.unreadCount`
- `notification.markRead`
- `notifications.markAllRead`

**Search:**
- `search.users`
- `search`

**Upload:**
- `upload.getSignature`
- `upload.confirm`

### Custom Handler Overrides

For specific tests, you can override the default handlers:

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  // Override handler for this test only
  server.use(
    http.post('http://localhost:3000/api/rpc', async ({ request }) => {
      const body = await request.json() as any;
      if (body.method === 'post.create') {
        return HttpResponse.json({
          error: { code: 500, message: 'Server error' },
          id: body.id,
        });
      }
    })
  );

  // Test code that triggers the error...
});
```

## Custom Render Utility

The custom render utility automatically wraps components with all necessary providers:

- **QueryClientProvider** (TanStack Query)
- **BrowserRouter** (React Router)
- Zustand stores (accessed via hooks, no provider needed)

```tsx
import { render } from '@/test/utils/render';

// Automatically includes all providers
render(<MyComponent />);

// All React Testing Library utilities are re-exported
import { screen, waitFor, within } from '@/test/utils/render';
```

## Coverage Configuration

Coverage thresholds are enforced at **80%** for:
- Lines
- Branches
- Functions
- Statements

Run coverage report:

```bash
npm run test:coverage
```

View HTML coverage report:

```bash
open coverage/index.html
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:
```tsx
expect(component.state.isLoading).toBe(true);
```

✅ Good:
```tsx
expect(screen.getByText(/loading/i)).toBeInTheDocument();
```

### 2. Use Data Test IDs Sparingly

Prefer semantic queries:

```tsx
// Prefer these (in order):
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/hello/i)

// Use data-testid as last resort:
screen.getByTestId('complex-component')
```

### 3. Wait for Async Operations

```tsx
// Always wait for async updates
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});

// Or use findBy queries (built-in waiting)
const element = await screen.findByText(/success/i);
```

### 4. Clean Up Between Tests

Cleanup is automatic with the setup, but if you need manual cleanup:

```tsx
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

### 5. Mock External Dependencies

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock implementation
const mockFn = vi.fn().mockResolvedValue('result');
```

## Debugging Tests

### 1. Debug with UI

```bash
npm run test:ui
```

Opens an interactive UI to debug tests.

### 2. Print DOM

```tsx
import { screen } from '@/test/utils/render';

// Print current DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

### 3. Pause Test Execution

```tsx
import { screen } from '@/test/utils/render';

await screen.findByText(/hello/i);
// Add breakpoint here or use debugger
debugger;
```

## Common Issues

### Issue: Tests timeout waiting for elements

**Solution:** Check if MSW handlers are configured for the API endpoint.

```tsx
// Verify the handler exists in test/mocks/handlers.ts
http.post(`${API_BASE_URL}/api/rpc`, async ({ request }) => {
  const body = await request.json() as any;
  if (body.method === 'your.rpc.method') {
    return rpcSuccess({ /* your data */ });
  }
});
```

### Issue: "document is not defined"

**Solution:** Make sure to use `npm test` (vitest) instead of `bun test`. Bun's test runner doesn't support vitest's DOM environment.

```bash
# ❌ Don't use
bun test

# ✅ Use instead
npm test
npm run test:watch
```

### Issue: Query client state persisting between tests

**Solution:** The custom render creates a new QueryClient for each test, but if you're using a global client, reset it:

```tsx
import { beforeEach } from 'vitest';
import { queryClient } from '@/lib/api/queryClient';

beforeEach(() => {
  queryClient.clear();
});
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Test Specification Reference

All test personas and scenarios are based on:
- `/docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md`
- `/docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md`

Ensure all component tests follow the patterns defined in these specifications.
