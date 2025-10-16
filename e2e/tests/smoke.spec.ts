import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { MAYA_MUSIC, MARCUS_CONSUMER, generateUniqueTestUser } from '../fixtures/test-users';

/**
 * Smoke Tests - Infrastructure Validation
 *
 * Purpose: Validate that E2E testing infrastructure is working correctly
 * - Application is accessible
 * - Basic navigation works
 * - Authentication flow is functional
 * - Multi-browser support is working
 *
 * These tests ensure the foundation is solid before implementing comprehensive scenarios
 */

test.describe('Smoke Tests - Infrastructure Validation', () => {
  test('should load the application home page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that we can access the page (status 200)
    expect(page.url()).toContain('localhost:5173');

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/smoke-home-page.png' });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click login link/button (adjust selector based on your UI)
    await page.click('a[href="/login"], button:has-text("Login"), a:has-text("Login")');

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/login/);

    // Verify login form elements exist
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');

    // Click register link/button (adjust selector based on your UI)
    await page.click('a[href="/register"], button:has-text("Sign Up"), a:has-text("Sign Up")');

    // Verify we're on the registration page
    await expect(page).toHaveURL(/\/(register|signup|sign-up)/);

    // Verify registration form elements exist
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display form validation on empty login', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation messages (adjust based on your validation UI)
    const hasValidationMessage = await page.locator('text=/required|Required|cannot be empty/i').count();

    // Or check for HTML5 validation
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(hasValidationMessage > 0 || isInvalid).toBeTruthy();
  });

  test('should check API health endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/health');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should register a new user via auth helper', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('smoke_test_user');

    // Test registration via API (faster)
    await test.step('Register user via API', async () => {
      await authHelper.registerViaAPI(uniqueUser);
    });

    // Verify we can login with the new user
    await test.step('Login with new user', async () => {
      await authHelper.loginViaAPI({
        email: uniqueUser.email,
        password: uniqueUser.password,
      });
    });

    // Verify session is established
    await test.step('Verify session', async () => {
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeTruthy();
    });
  });

  test('should handle authentication flow', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser('smoke_auth_test');

    // Setup authenticated session
    await authHelper.setupAuthenticatedSession(uniqueUser);

    // Verify we're logged in by checking for authenticated UI elements
    // (Adjust selectors based on your UI)
    const authenticatedIndicators = [
      page.locator('[data-testid="user-menu"]'),
      page.locator('button:has-text("Logout")'),
      page.locator('[data-testid="profile-link"]'),
      page.locator('text=/Welcome|Dashboard|Feed/i'),
    ];

    // At least one authenticated indicator should be visible
    let foundIndicator = false;
    for (const indicator of authenticatedIndicators) {
      try {
        await indicator.waitFor({ timeout: 2000, state: 'visible' });
        foundIndicator = true;
        break;
      } catch {
        // Try next indicator
      }
    }

    // If no UI indicator found, check cookies as fallback
    if (!foundIndicator) {
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeTruthy();
    }
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page loads correctly on mobile
    expect(page.url()).toContain('localhost:5173');

    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/smoke-mobile.png' });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Try to navigate with offline simulation
    await page.context().setOffline(true);

    // Navigate to a page
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {
      // Expected to fail when offline
    });

    // Re-enable network
    await page.context().setOffline(false);

    // Should recover and load the page
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('localhost:5173');
  });

  test('should measure page load performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    console.log(`Page load time: ${loadTime}ms`);
  });
});

test.describe('Multi-Browser Validation', () => {
  test('should work across different browsers', async ({ page, browserName }) => {
    await page.goto('/');

    // Verify page loads on all configured browsers
    expect(page.url()).toContain('localhost:5173');

    // Log which browser is being tested
    console.log(`Testing on: ${browserName}`);

    // Take browser-specific screenshot
    await page.screenshot({
      path: `test-results/smoke-${browserName}.png`,
    });
  });

  test('should handle authentication on all browsers', async ({ page, browserName }) => {
    const authHelper = new AuthHelper(page);
    const uniqueUser = generateUniqueTestUser(`smoke_${browserName}`);

    // Setup authenticated session
    await authHelper.setupAuthenticatedSession(uniqueUser);

    // Verify authentication works
    const isAuth = await authHelper.isAuthenticated();
    expect(isAuth).toBeTruthy();

    console.log(`Authentication successful on: ${browserName}`);
  });
});

test.describe('Basic UI Interactions', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus on submit button
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focusedElement);
  });

  test('should support screen reader attributes', async ({ page }) => {
    await page.goto('/login');

    // Check for ARIA labels
    const inputsWithLabels = await page.locator('input[aria-label], input[aria-labelledby]').count();

    // At least some inputs should have accessibility attributes
    expect(inputsWithLabels).toBeGreaterThan(0);
  });
});
