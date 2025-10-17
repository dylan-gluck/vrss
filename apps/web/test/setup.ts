import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
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

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      // Mock implementation - no-op for testing
    },
    removeListener: () => {
      // Mock implementation - no-op for testing
    },
    addEventListener: () => {
      // Mock implementation - no-op for testing
    },
    removeEventListener: () => {
      // Mock implementation - no-op for testing
    },
    dispatchEvent: () => {
      // Mock implementation - no-op for testing
    },
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {
    // Mock implementation - no-op for testing
  }
  observe() {
    // Mock implementation - no-op for testing
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    // Mock implementation - no-op for testing
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {
    // Mock implementation - no-op for testing
  }
  observe() {
    // Mock implementation - no-op for testing
  }
  unobserve() {
    // Mock implementation - no-op for testing
  }
} as any;

// Mock crypto.randomUUID
if (!global.crypto) {
  (global as any).crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}
