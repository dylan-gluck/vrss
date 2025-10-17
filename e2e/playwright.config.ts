import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for VRSS
 *
 * Multi-browser testing: Chromium, Mobile Chrome, Mobile Safari
 * Supports parallel execution, screenshots/videos on failure
 */
export default defineConfig({
  testDir: "./tests",

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Test timeouts
  timeout: 30 * 1000, // 30s test timeout
  expect: {
    timeout: 5 * 1000, // 5s expect timeout
  },

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  // Global test settings
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || "http://localhost:5173",

    // API endpoint
    extraHTTPHeaders: {
      // Add custom headers if needed
    },

    // Collect trace on first retry
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Navigation timeout
    navigationTimeout: 10 * 1000,

    // Action timeout
    actionTimeout: 10 * 1000,
  },

  // Multi-browser projects
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },

    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"],
      },
    },
  ],

  // Web server configuration
  webServer: [
    {
      command: "cd ../apps/web && bun run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "cd ../apps/api && bun run dev",
      url: "http://localhost:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
