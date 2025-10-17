# Frontend Test Infrastructure Documentation

## Overview

The VRSS web application uses a modern testing infrastructure built with:
- **Vitest** - Fast unit test runner with native ESM support
- **React Testing Library** - Component testing focused on user behavior
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **happy-dom** - Lightweight DOM implementation for fast tests

## Test Configuration

### Location: `vitest.config.ts`

Key configurations:
- **Environment**: `happy-dom` for fast DOM simulation
- **Globals**: Enabled for convenient test writing
- **Setup Files**: `./test/setup.ts` runs before all tests
- **Coverage**: v8 provider with 80% thresholds
- **Test Pattern**: `**/*.{test,spec}.{ts,tsx}` and `test/**/*.{test,spec}.{ts,tsx}`

## Test Utilities

### Custom Render Function (`test/utils/render.tsx`)

```typescript
import { renderWithProviders, screen } from '../../test/utils/render';

// Wraps components with:
// - QueryClientProvider (TanStack Query)
// - BrowserRouter (React Router)
renderWithProviders(<YourComponent />);
```

Benefits:
- Consistent provider setup across all tests
- Pre-configured QueryClient with test-friendly defaults
- No retry logic (faster tests)
- Infinite cache time (no refetching during tests)

### Mock Service Worker (MSW)

**Location**: `test/mocks/`

Files:
- `server.ts` - MSW server instance
- `handlers.ts` - RPC API endpoint handlers
- `data.ts` - Mock data and test personas

#### Available Test Personas

```typescript
import { TEST_PERSONAS, MOCK_POSTS } from '../../test/mocks/data';

// Three personas for different user types:
TEST_PERSONAS.CREATOR    // Content creator (Maya Music)
TEST_PERSONAS.CONSUMER   // Content consumer (Marcus)
TEST_PERSONAS.BUSINESS   // Business account (Jade Cafe)
```

#### Mocked RPC Endpoints

All RPC endpoints are mocked:
- Authentication (login, register, logout, verify)
- Feed (get feed, create post, like, bookmark)
- Profile (get, update, follow/unfollow)
- Notifications (get, mark read)
- Search (users, posts, hashtags)
- Upload (get signature, confirm upload)
- Messages (threads, send message)

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage (Note: version mismatch in dependencies)
npm run test:coverage
```

### From Project Root

```bash
# Run web tests specifically
make test

# Or directly
cd apps/web && npm test
```

## Test File Organization

### Test Files Created

1. **Infrastructure Tests** (`test/infrastructure.test.tsx`)
   - 20 tests validating the test setup
   - Verifies Vitest, RTL, MSW, and providers work correctly
   - Integration test for full RPC flow

2. **Component Tests** (`src/App.test.tsx`)
   - 5 tests for the main App component
   - Tests rendering, content, and basic functionality

3. **Hook Tests** (`src/hooks/useLocalStorage.test.ts`)
   - 10 tests for the useLocalStorage custom hook
   - Tests initialization, updates, persistence, edge cases

4. **Component Tests** (`src/components/Button.test.tsx`)
   - 20 tests for the Button component
   - Tests variants, sizes, states, interactions, accessibility

**Total: 55 passing tests**

## Writing New Tests

### Component Test Example

```typescript
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../../test/utils/render';
import YourComponent from './YourComponent';

describe('YourComponent', () => {
  it('should render successfully', () => {
    renderWithProviders(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Hook Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useYourHook } from './useYourHook';

describe('useYourHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useYourHook());
    expect(result.current).toBe('expected-value');
  });
});
```

### Testing with User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle button click', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

### Testing Async Behavior

```typescript
import { waitFor } from '@testing-library/react';

it('should load data', async () => {
  renderWithProviders(<DataComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

const TestComponent = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['test-data'],
    queryFn: async () => {
      // This will be intercepted by MSW
      const response = await fetch('http://localhost:3000/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'feed.get',
          params: { cursor: 0, limit: 20 }
        })
      });
      return response.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>Data: {data.result.posts.length}</div>;
};

// Test will use MSW mock handlers automatically
renderWithProviders(<TestComponent />);
```

## Best Practices

### 1. Test User Behavior, Not Implementation

❌ Bad:
```typescript
expect(component.state.count).toBe(1);
```

✅ Good:
```typescript
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Semantic Queries

Priority order:
1. `getByRole` - Best for accessibility
2. `getByLabelText` - Good for form fields
3. `getByText` - Good for non-interactive content
4. `getByTestId` - Last resort

### 3. Await Async Operations

```typescript
// Always await user interactions
await user.click(button);
await user.type(input, 'text');

// Always await async queries
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 4. Clean Up Between Tests

The setup file handles this automatically:
- `cleanup()` after each test
- MSW handlers reset after each test
- QueryClient is new for each test

### 5. Mock External Dependencies

Use MSW for API calls (already configured):
```typescript
// No need to mock fetch - MSW handles it
const response = await fetch('/api/rpc', { ... });
```

For other modules:
```typescript
import { vi } from 'vitest';

vi.mock('./external-module', () => ({
  externalFunction: vi.fn(() => 'mocked-value')
}));
```

## Global Mocks

The following are globally mocked in `test/setup.ts`:

- `window.matchMedia` - For responsive design testing
- `IntersectionObserver` - For scroll/visibility detection
- `ResizeObserver` - For component resize detection
- `crypto.randomUUID` - For UUID generation

## Troubleshooting

### Tests Not Found

Ensure test files match the pattern:
- `src/**/*.test.{ts,tsx}`
- `src/**/*.spec.{ts,tsx}`
- `test/**/*.test.{ts,tsx}`

### Provider Errors

Always use `renderWithProviders` instead of `render`:
```typescript
// ❌ Will fail if component uses React Query or Router
render(<Component />);

// ✅ Correct
renderWithProviders(<Component />);
```

### MSW Not Intercepting

Check the URL matches exactly:
```typescript
// MSW handler
http.post('http://localhost:3000/api/rpc', ...)

// Your fetch must match exactly
fetch('http://localhost:3000/api/rpc', ...)
```

### Async Test Timeouts

Increase timeout for slow operations:
```typescript
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

## Code Coverage

Coverage thresholds (configured in `vitest.config.ts`):
- Lines: 80%
- Branches: 80%
- Functions: 80%
- Statements: 80%

Note: There's currently a version mismatch between `vitest` (2.1.9) and `@vitest/coverage-v8` (3.2.4) that causes coverage reports to fail. Regular test execution works correctly.

## File Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx          # Component tests
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   └── useLocalStorage.test.ts  # Hook tests
│   ├── App.tsx
│   └── App.test.tsx                 # Main app tests
├── test/
│   ├── mocks/
│   │   ├── data.ts                  # Mock data & personas
│   │   ├── handlers.ts              # MSW API handlers
│   │   └── server.ts                # MSW server setup
│   ├── utils/
│   │   └── render.tsx               # Custom render utility
│   ├── infrastructure.test.tsx      # Infrastructure validation
│   ├── setup.ts                     # Global test setup
│   └── README.md                    # Testing guide
├── vitest.config.ts                 # Vitest configuration
└── package.json                     # Test scripts
```

## Next Steps

1. Add more component tests as components are created
2. Add integration tests for key user flows
3. Add visual regression tests (consider Chromatic or Percy)
4. Fix coverage version mismatch by updating dependencies
5. Add E2E tests with Playwright for critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
