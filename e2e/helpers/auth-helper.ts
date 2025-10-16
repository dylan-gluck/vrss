import { Page, expect } from '@playwright/test';

/**
 * Authentication Helper for E2E Tests
 *
 * Provides utilities for user registration, login, and session management
 * Uses Better-auth endpoints from the backend API
 */

export interface UserCredentials {
  username: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthHelper {
  constructor(
    private page: Page,
    private baseURL: string = 'http://localhost:5173',
    private apiURL: string = 'http://localhost:3000'
  ) {}

  /**
   * Register a new user account
   * @param credentials User registration data
   * @returns Promise that resolves when registration is complete
   */
  async register(credentials: UserCredentials): Promise<void> {
    await this.page.goto(`${this.baseURL}/register`);

    // Fill registration form
    await this.page.fill('input[name="username"]', credentials.username);
    await this.page.fill('input[name="email"]', credentials.email);
    await this.page.fill('input[name="password"]', credentials.password);
    await this.page.fill('input[name="confirmPassword"]', credentials.password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for successful registration (redirect or success message)
    await expect(this.page).toHaveURL(/\/(profile|home|customize)/, {
      timeout: 10000,
    });
  }

  /**
   * Register a new user via API (faster for test setup)
   * @param credentials User registration data
   * @returns Promise that resolves when registration is complete
   */
  async registerViaAPI(credentials: UserCredentials): Promise<void> {
    const response = await this.page.request.post(
      `${this.apiURL}/api/auth/sign-up`,
      {
        data: {
          email: credentials.email,
          password: credentials.password,
          name: credentials.username,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
  }

  /**
   * Login with email and password
   * @param credentials Login credentials
   * @returns Promise that resolves when login is complete
   */
  async login(credentials: LoginCredentials): Promise<void> {
    await this.page.goto(`${this.baseURL}/login`);

    // Fill login form
    await this.page.fill('input[name="email"]', credentials.email);
    await this.page.fill('input[name="password"]', credentials.password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for successful login (redirect to home)
    await expect(this.page).toHaveURL(/\/(home|profile|feed)/, {
      timeout: 10000,
    });
  }

  /**
   * Login via API (faster for test setup)
   * @param credentials Login credentials
   * @returns Promise that resolves when login is complete
   */
  async loginViaAPI(credentials: LoginCredentials): Promise<void> {
    const response = await this.page.request.post(
      `${this.apiURL}/api/auth/sign-in`,
      {
        data: {
          email: credentials.email,
          password: credentials.password,
        },
      }
    );

    expect(response.ok()).toBeTruthy();

    // Store cookies from API response
    const cookies = response.headers()['set-cookie'];
    if (cookies) {
      await this.page.context().addCookies(
        this.parseCookies(cookies, this.apiURL)
      );
    }
  }

  /**
   * Logout the current user
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    // Navigate to home page first if not already there
    await this.page.goto(`${this.baseURL}/home`);

    // Click logout button (adjust selector based on your UI)
    await this.page.click('[data-testid="logout-button"]');

    // Wait for redirect to login page
    await expect(this.page).toHaveURL(/\/login/, { timeout: 5000 });
  }

  /**
   * Check if user is authenticated
   * @returns Promise that resolves to true if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.page.context().cookies();
    return cookies.some(
      (cookie) =>
        cookie.name.includes('session') || cookie.name.includes('auth')
    );
  }

  /**
   * Clear all session data and cookies
   * @returns Promise that resolves when session is cleared
   */
  async clearSession(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Setup authenticated session (register + login)
   * @param credentials User credentials
   * @returns Promise that resolves when session is ready
   */
  async setupAuthenticatedSession(
    credentials: UserCredentials
  ): Promise<void> {
    try {
      // Try to register user (may fail if already exists)
      await this.registerViaAPI(credentials);
    } catch (error) {
      // User might already exist, continue to login
      console.log('User may already exist, attempting login...');
    }

    // Login via API for faster test setup
    await this.loginViaAPI({
      email: credentials.email,
      password: credentials.password,
    });

    // Navigate to home page to establish session
    await this.page.goto(`${this.baseURL}/home`);
  }

  /**
   * Wait for session to be established
   * @param timeout Maximum time to wait (ms)
   * @returns Promise that resolves when session is active
   */
  async waitForSession(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        return (
          document.cookie.includes('session') ||
          document.cookie.includes('auth') ||
          localStorage.getItem('auth-token') !== null
        );
      },
      { timeout }
    );
  }

  /**
   * Get current user data from session
   * @returns Promise that resolves to user data
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.page.request.get(
      `${this.apiURL}/api/auth/session`
    );

    if (!response.ok()) {
      return null;
    }

    return response.json();
  }

  /**
   * Parse cookies from Set-Cookie header
   * @param cookieHeader Set-Cookie header value
   * @param domain Cookie domain
   * @returns Array of cookie objects
   */
  private parseCookies(cookieHeader: string, domain: string): any[] {
    const cookies: any[] = [];
    const cookieStrings = cookieHeader.split(',');

    for (const cookieString of cookieStrings) {
      const parts = cookieString.split(';')[0].split('=');
      if (parts.length === 2) {
        cookies.push({
          name: parts[0].trim(),
          value: parts[1].trim(),
          domain: new URL(domain).hostname,
          path: '/',
        });
      }
    }

    return cookies;
  }
}

/**
 * Create an authenticated page with a logged-in user
 * Useful for test setup
 */
export async function createAuthenticatedPage(
  page: Page,
  credentials: UserCredentials
): Promise<void> {
  const authHelper = new AuthHelper(page);
  await authHelper.setupAuthenticatedSession(credentials);
}
