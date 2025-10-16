# VRSS E2E Testing Infrastructure

End-to-end testing suite for the VRSS social platform using Playwright with multi-browser support.

## Overview

This package contains the complete E2E testing infrastructure for VRSS, implementing critical user journey tests as defined in the [TEST-SPECIFICATIONS.md](../docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md).

### Features

- **Multi-browser testing**: Chromium, Mobile Chrome, Mobile Safari
- **Parallel execution**: Tests run in parallel for faster feedback
- **Screenshots/videos on failure**: Automatic capture for debugging
- **Authentication helpers**: Reusable utilities for login/register flows
- **Test personas**: Predefined users matching specification (maya_music, marcus_consumer, jade_cafe)
- **Test data builders**: Flexible fixtures for posts, feeds, messages

## Quick Start

### Prerequisites

- Bun 1.0+ installed
- Frontend running on `http://localhost:5173`
- Backend running on `http://localhost:3000`
- Playwright browsers installed (automatically handled)

### Installation

```bash
# From project root
bun install

# Install Playwright browsers (if not already done)
cd e2e
bunx playwright install
```

### Running Tests

```bash
# From project root
bun run test:e2e              # Run all E2E tests
bun run test:e2e --headed     # Run with browser visible
bun run test:e2e --debug      # Run in debug mode
bun run test:e2e --ui         # Run with Playwright UI

# From e2e directory
cd e2e
bunx playwright test          # Run all tests
bunx playwright test --headed # Run with browser visible
bunx playwright test --debug  # Debug mode
bunx playwright test --ui     # UI mode
```

### Run Specific Tests

```bash
# Run smoke tests only
bunx playwright test smoke

# Run specific test file
bunx playwright test tests/smoke.spec.ts

# Run tests matching pattern
bunx playwright test -g "authentication"
```

### Run on Specific Browsers

```bash
# Run on Chromium only
bunx playwright test --project=chromium

# Run on mobile devices only
bunx playwright test --project=mobile-chrome --project=mobile-safari
```

## Project Structure

```
e2e/
├── fixtures/
│   ├── test-users.ts       # Test personas (maya_music, marcus_consumer, jade_cafe)
│   └── test-data.ts        # Sample data builders (posts, feeds, messages)
├── helpers/
│   └── auth-helper.ts      # Authentication utilities (login, register, session)
├── tests/
│   └── smoke.spec.ts       # Infrastructure validation tests
├── playwright.config.ts    # Playwright configuration
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Test Personas

Based on TEST-SPECIFICATIONS.md, we use these predefined test users:

### Maya Music (Creator)
- **Username**: `maya_music`
- **Email**: `maya@example.com`
- **Profile**: Independent musician, 30MB of 50MB storage, 1250 followers
- **Use case**: Creator posting music content

### Marcus Consumer (Consumer)
- **Username**: `marcus_consumer`
- **Email**: `marcus@example.com`
- **Profile**: Content consumer, 5MB storage, 320 following
- **Use case**: User discovering and following creators

### Jade Cafe (Business)
- **Username**: `jade_cafe`
- **Email**: `jade@example.com`
- **Profile**: Small business, 45MB of 50MB storage (near limit), 2500 followers
- **Use case**: Business promoting products/services

## Usage Examples

### Using Authentication Helper

```typescript
import { test } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { MAYA_MUSIC } from '../fixtures/test-users';

test('should login as Maya Music', async ({ page }) => {
  const authHelper = new AuthHelper(page);

  // Login via API (faster)
  await authHelper.loginViaAPI({
    email: MAYA_MUSIC.email,
    password: MAYA_MUSIC.password,
  });

  // Navigate to home page
  await page.goto('/home');
});
```

### Using Test Data Builders

```typescript
import { PostBuilder } from '../fixtures/test-data';

const post = new PostBuilder()
  .withType('music')
  .withContent('New album out now!')
  .withAuthor('maya_music')
  .withTags(['#indie', '#newmusic'])
  .build();
```

### Creating Unique Test Users

```typescript
import { generateUniqueTestUser } from '../fixtures/test-users';

const uniqueUser = generateUniqueTestUser('test_user');
// Creates user: test_user_1697481234_567@example.com
```

## Configuration

### Environment Variables

```bash
# Base URL for frontend (default: http://localhost:5173)
BASE_URL=http://localhost:5173

# API URL (default: http://localhost:3000)
API_URL=http://localhost:3000
```

### Playwright Configuration

See `playwright.config.ts` for detailed configuration:

- **Test timeout**: 30s
- **Expect timeout**: 5s
- **Parallel execution**: Enabled
- **Retries**: 2 in CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Trace**: On first retry

### Multi-Browser Projects

- **chromium**: Desktop Chrome (1920x1080)
- **mobile-chrome**: Pixel 5 viewport
- **mobile-safari**: iPhone 13 viewport

## Test Reports

After running tests, view reports:

```bash
# View HTML report
bunx playwright show-report

# Reports are saved to:
# - test-results/html/        HTML report
# - test-results/results.json JSON results
```

## Debugging

### Debug Mode

```bash
# Run with inspector
bunx playwright test --debug

# Debug specific test
bunx playwright test smoke.spec.ts --debug
```

### UI Mode

```bash
# Interactive test runner with time travel debugging
bunx playwright test --ui
```

### Screenshots

Screenshots are automatically captured on test failure and saved to `test-results/`.

### Videos

Videos are retained only when tests fail, saved to `test-results/`.

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { MAYA_MUSIC } from '../fixtures/test-users';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login, navigate, etc.
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act
    await page.click('button');

    // Assert
    await expect(page).toHaveURL('/expected-path');
  });
});
```

### Best Practices

1. **Use test personas**: Prefer predefined users (maya_music, etc.) for consistency
2. **Use auth helpers**: Don't reimplement login logic
3. **API setup**: Use `loginViaAPI()` for faster test setup
4. **Unique users**: Use `generateUniqueTestUser()` when tests require unique data
5. **Wait for states**: Use `waitForLoadState('networkidle')` for full page loads
6. **Descriptive names**: Test names should clearly describe behavior
7. **Arrange-Act-Assert**: Structure tests clearly
8. **Test isolation**: Each test should be independent
9. **Clean selectors**: Use `data-testid` attributes when possible
10. **Screenshot on failure**: Tests auto-capture, no manual screenshots needed

## Critical Test Scenarios

Based on TEST-SPECIFICATIONS.md, implement these scenarios:

### Phase 1: Critical Scenarios (P0)
1. User Registration - Happy Path
2. User Login - Validation Error Handling
3. Post Creation with File Upload - Happy Path
4. Storage Quota Limit Enforcement - Edge Case
5. Authentication Session Management - Security

### Phase 2: Core Features (P1)
6. Feed Viewing with Custom Filters - Happy Path
7. Social Following and Notifications - Happy Path
8. Profile Customization - Happy Path
9. Search and Discovery - Happy Path

### Phase 3: Messaging (P2)
10. Direct Messaging - Happy Path

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries on failure
- Single worker (sequential execution)
- JSON and HTML reports
- Screenshots and videos on failure

```yaml
# Example GitHub Actions workflow
- name: Run E2E tests
  run: |
    bun run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: e2e/test-results/
```

## Troubleshooting

### Tests Failing to Connect

```bash
# Check if services are running
curl http://localhost:3000/health  # Backend
curl http://localhost:5173         # Frontend

# Start services if needed
bun run dev  # From project root
```

### Browsers Not Installed

```bash
cd e2e
bunx playwright install
```

### Port Conflicts

If ports 3000 or 5173 are in use, update `playwright.config.ts`:

```typescript
use: {
  baseURL: 'http://localhost:YOUR_PORT',
}
```

### Slow Tests

- Use `loginViaAPI()` instead of UI login
- Run specific tests instead of full suite
- Increase workers in `playwright.config.ts`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [TEST-SPECIFICATIONS.md](../docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md)
- [TESTING-STRATEGY.md](../docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md)
- [PRD.md](../docs/specs/001-vrss-social-platform/PRD.md)

## Support

For questions or issues:
1. Check this README
2. Review TEST-SPECIFICATIONS.md for expected behavior
3. Check Playwright documentation
4. Review existing test patterns in `tests/`
