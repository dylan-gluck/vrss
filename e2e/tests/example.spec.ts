import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import {
  MAYA_MUSIC,
  MARCUS_CONSUMER,
  JADE_CAFE,
  generateUniqueTestUser,
} from '../fixtures/test-users';
import {
  PostBuilder,
  FeedBuilder,
  MessageBuilder,
  SAMPLE_POSTS,
} from '../fixtures/test-data';

/**
 * Example E2E Test Scenarios
 *
 * This file demonstrates best practices for writing E2E tests
 * using the VRSS testing infrastructure.
 *
 * NOTE: These are example patterns - not comprehensive test coverage.
 * Implement full critical scenarios based on TEST-SPECIFICATIONS.md
 */

test.describe('Example: User Authentication Flows', () => {
  test('should register and login a new user', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('example_user');

    // Register user
    await test.step('Register new user', async () => {
      await authHelper.registerViaAPI(uniqueUser);
    });

    // Login
    await test.step('Login with new user', async () => {
      await authHelper.loginViaAPI({
        email: uniqueUser.email,
        password: uniqueUser.password,
      });
    });

    // Verify session
    await test.step('Verify authenticated session', async () => {
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeTruthy();
    });

    // Navigate to home
    await test.step('Navigate to home page', async () => {
      await page.goto('/home');
      await expect(page).toHaveURL(/\/(home|feed|profile)/);
    });
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message (adjust selector based on your UI)
    await expect(
      page.locator('text=/Invalid|incorrect|wrong/i')
    ).toBeVisible({ timeout: 5000 });

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('logout_test');

    // Setup authenticated session
    await authHelper.setupAuthenticatedSession(uniqueUser);

    // Logout
    await authHelper.logout();

    // Verify session cleared
    const isAuth = await authHelper.isAuthenticated();
    expect(isAuth).toBeFalsy();
  });
});

test.describe('Example: Using Test Personas', () => {
  test('should use Maya Music persona', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    // Login as Maya Music (creator persona)
    await authHelper.setupAuthenticatedSession(MAYA_MUSIC);

    // Navigate to profile
    await page.goto(`/profile/${MAYA_MUSIC.username}`);

    // Profile should display username
    await expect(page.locator(`text=${MAYA_MUSIC.username}`)).toBeVisible();
  });

  test('should use Marcus Consumer persona', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    // Login as Marcus (consumer persona)
    await authHelper.setupAuthenticatedSession(MARCUS_CONSUMER);

    // Navigate to discovery page
    await page.goto('/discover');

    // Should be able to search and discover content
    await expect(page).toHaveURL(/\/discover/);
  });

  test('should use Jade Cafe persona (near storage limit)', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    // Login as Jade Cafe (business persona with high storage usage)
    await authHelper.setupAuthenticatedSession(JADE_CAFE);

    // Navigate to post creation
    await page.goto('/post/create');

    // Storage warning should be visible (45MB of 50MB used)
    // Adjust selector based on your UI implementation
    await expect(
      page.locator('text=/storage|quota|limit/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Example: Using Test Data Builders', () => {
  test('should create test post data', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('post_test');

    await authHelper.setupAuthenticatedSession(uniqueUser);

    // Build test post using builder pattern
    const testPost = new PostBuilder()
      .withType('text')
      .withContent('This is a test post created with PostBuilder')
      .withAuthor(uniqueUser.username)
      .withTags(['#test', '#example'])
      .build();

    // Navigate to post creation page
    await page.goto('/post/create');

    // Fill post form (adjust selectors based on your UI)
    await page.selectOption('select[name="type"]', testPost.type);
    await page.fill('textarea[name="content"]', testPost.content);

    // Add tags if UI supports it
    if (testPost.tags && testPost.tags.length > 0) {
      for (const tag of testPost.tags) {
        await page.fill('input[name="tags"]', tag);
        await page.keyboard.press('Enter');
      }
    }

    // Submit post
    await page.click('button[type="submit"]');

    // Verify post created
    await expect(page.locator(`text=${testPost.content}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should create test feed with filters', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    await authHelper.setupAuthenticatedSession(MARCUS_CONSUMER);

    // Build test feed using builder pattern
    const testFeed = new FeedBuilder()
      .withName('Example Music Feed')
      .withOwner(MARCUS_CONSUMER.username)
      .addFilter({
        field: 'post_type',
        operator: 'equals',
        value: 'music',
      })
      .addFilter({
        field: 'likes',
        operator: 'greater_than',
        value: 10,
      })
      .withLogicalOperator('AND')
      .build();

    // Navigate to feed builder
    await page.goto('/feeds/create');

    // Fill feed form
    await page.fill('input[name="feedName"]', testFeed.name);

    // Add filters (adjust selectors based on your UI)
    for (const filter of testFeed.filters) {
      await page.click('button:has-text("Add Filter")');
      await page.selectOption('select[name="filterField"]', filter.field);
      await page.selectOption('select[name="filterOperator"]', filter.operator);
      await page.fill('input[name="filterValue"]', String(filter.value));
    }

    // Save feed
    await page.click('button:has-text("Save Feed")');

    // Verify feed created
    await expect(page.locator(`text=${testFeed.name}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should use sample post data', async ({ page }) => {
    // Use predefined sample posts from test-data.ts
    const mayaPost = SAMPLE_POSTS[0]; // Maya's music post

    console.log('Sample post:', mayaPost);

    // Use sample data in your tests
    expect(mayaPost.type).toBe('music');
    expect(mayaPost.authorUsername).toBe('maya_music');
    expect(mayaPost.tags).toContain('#indie');
  });
});

test.describe('Example: Multi-Browser Testing', () => {
  test('should work on all configured browsers', async ({
    page,
    browserName,
  }) => {
    // This test runs on chromium, mobile-chrome, and mobile-safari
    console.log(`Testing on: ${browserName}`);

    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser(`browser_test_${browserName}`);

    // Setup session
    await authHelper.setupAuthenticatedSession(uniqueUser);

    // Navigate to home
    await page.goto('/home');

    // Verify page loads on all browsers
    await expect(page).toHaveURL(/\/(home|feed|profile)/);

    // Take browser-specific screenshot
    await page.screenshot({
      path: `test-results/example-${browserName}.png`,
    });
  });

  test('should handle responsive layouts', async ({ page, browserName }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser(`responsive_test_${browserName}`);

    await authHelper.setupAuthenticatedSession(uniqueUser);
    await page.goto('/home');

    // Get viewport size
    const viewport = page.viewportSize();
    console.log(
      `Viewport for ${browserName}: ${viewport?.width}x${viewport?.height}`
    );

    // Verify page is interactive
    await expect(page.locator('body')).toBeVisible();

    // Mobile-specific checks
    if (browserName.includes('mobile')) {
      // Verify mobile menu exists (adjust selector)
      await expect(
        page.locator('[data-testid="mobile-menu"], button[aria-label="Menu"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Example: API Integration', () => {
  test('should interact with backend API', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('api_test');

    // Register via API
    await authHelper.registerViaAPI(uniqueUser);

    // Login via API
    await authHelper.loginViaAPI({
      email: uniqueUser.email,
      password: uniqueUser.password,
    });

    // Get current user from API
    const currentUser = await authHelper.getCurrentUser();
    console.log('Current user:', currentUser);

    // Verify user data
    if (currentUser) {
      expect(currentUser.email).toBe(uniqueUser.email);
    }
  });

  test('should check API health', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/health');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.text();
    console.log('API health response:', body);
  });
});

test.describe('Example: Error Handling', () => {
  test('should handle network errors', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to navigate
    await page
      .goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 })
      .catch(() => {
        // Expected to fail
      });

    // Re-enable network
    await page.context().setOffline(false);

    // Should recover
    await page.goto('/');
    await expect(page).toHaveURL(/localhost/);
  });

  test('should handle 404 errors', async ({ page }) => {
    await page.goto('/nonexistent-page');

    // Should show 404 page or redirect (adjust based on your app)
    const url = page.url();
    console.log('404 navigation result:', url);

    // Verify error handling
    await expect(
      page.locator('text=/404|not found|page not found/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Example: Performance Monitoring', () => {
  test('should measure page load time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);

    // Assert reasonable load time
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
  });

  test('should measure authentication flow time', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('perf_test');

    const startTime = Date.now();

    await authHelper.setupAuthenticatedSession(uniqueUser);

    const authTime = Date.now() - startTime;

    console.log(`Authentication flow time: ${authTime}ms`);

    // Assert reasonable auth time
    expect(authTime).toBeLessThan(3000); // Should complete in under 3 seconds
  });
});

/**
 * NEXT STEPS:
 *
 * 1. Implement Critical Test Scenarios from TEST-SPECIFICATIONS.md:
 *    - Scenario 1: User Registration - Happy Path
 *    - Scenario 2: User Login - Validation Error Handling
 *    - Scenario 3: Post Creation with File Upload - Happy Path
 *    - Scenario 4: Storage Quota Limit Enforcement - Edge Case
 *    - Scenario 5: Feed Viewing with Custom Filters - Happy Path
 *    - Scenario 6: Social Following and Notifications - Happy Path
 *    - Scenario 7: Profile Customization - Happy Path
 *    - Scenario 8: Authentication Session Management - Security
 *    - Scenario 9: Direct Messaging - Happy Path
 *    - Scenario 10: Search and Discovery - Happy Path
 *
 * 2. Update selectors to match your actual UI implementation
 *
 * 3. Add API integration tests for backend endpoints
 *
 * 4. Implement test data seeding for consistent test environments
 *
 * 5. Add visual regression testing if needed
 *
 * 6. Configure CI/CD pipeline to run E2E tests
 */
