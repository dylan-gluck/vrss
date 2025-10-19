import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "../uiStore";

/**
 * UI Store Tests
 *
 * Tests the Zustand store that manages UI state including theme, sidebar,
 * bottom navigation, and modal state.
 */
describe("UI Store", () => {
  beforeEach(() => {
    // Reset store to default state before each test
    const { setTheme, setSidebarOpen, setBottomNavVisible, closeModal } = useUIStore.getState();
    setTheme("system");
    setSidebarOpen(true);
    setBottomNavVisible(true);
    closeModal();
  });

  afterEach(() => {
    // Clean up any DOM modifications
    document.documentElement.classList.remove("light", "dark");
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const state = useUIStore.getState();

      expect(state.theme).toBe("system");
      expect(state.sidebarOpen).toBe(true);
      expect(state.bottomNavVisible).toBe(true);
      expect(state.activeModal).toBe(null);
    });
  });

  describe("Theme Management", () => {
    it("should set theme to light", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("light");

      expect(useUIStore.getState().theme).toBe("light");
    });

    it("should set theme to dark", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("dark");

      expect(useUIStore.getState().theme).toBe("dark");
    });

    it("should set theme to system", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("system");

      expect(useUIStore.getState().theme).toBe("system");
    });

    it("should apply light theme class to document", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("light");

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should apply dark theme class to document", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("dark");

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });

    it("should apply system theme based on media query", () => {
      const { setTheme } = useUIStore.getState();

      // Mock matchMedia to return dark mode
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      setTheme("system");

      // Should apply dark class based on mocked matchMedia
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove previous theme class when switching themes", () => {
      const { setTheme } = useUIStore.getState();

      setTheme("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);

      setTheme("dark");
      expect(document.documentElement.classList.contains("light")).toBe(false);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Sidebar Management", () => {
    it("should toggle sidebar state", () => {
      const { toggleSidebar } = useUIStore.getState();

      // Initial state is true
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("should set sidebar open state directly", () => {
      const { setSidebarOpen } = useUIStore.getState();

      setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("Bottom Navigation Management", () => {
    it("should set bottom navigation visibility", () => {
      const { setBottomNavVisible } = useUIStore.getState();

      setBottomNavVisible(false);
      expect(useUIStore.getState().bottomNavVisible).toBe(false);

      setBottomNavVisible(true);
      expect(useUIStore.getState().bottomNavVisible).toBe(true);
    });
  });

  describe("Modal Management", () => {
    it("should open a modal", () => {
      const { openModal } = useUIStore.getState();

      openModal("test-modal");
      expect(useUIStore.getState().activeModal).toBe("test-modal");
    });

    it("should close active modal", () => {
      const { openModal, closeModal } = useUIStore.getState();

      openModal("test-modal");
      expect(useUIStore.getState().activeModal).toBe("test-modal");

      closeModal();
      expect(useUIStore.getState().activeModal).toBe(null);
    });

    it("should handle opening different modals", () => {
      const { openModal } = useUIStore.getState();

      openModal("modal-1");
      expect(useUIStore.getState().activeModal).toBe("modal-1");

      openModal("modal-2");
      expect(useUIStore.getState().activeModal).toBe("modal-2");
    });
  });

  describe("Store Integration", () => {
    it("should handle multiple state updates", () => {
      const { setTheme, setSidebarOpen, setBottomNavVisible, openModal } = useUIStore.getState();

      setTheme("dark");
      setSidebarOpen(false);
      setBottomNavVisible(false);
      openModal("settings");

      const state = useUIStore.getState();
      expect(state.theme).toBe("dark");
      expect(state.sidebarOpen).toBe(false);
      expect(state.bottomNavVisible).toBe(false);
      expect(state.activeModal).toBe("settings");
    });

    it("should maintain independent state updates", () => {
      const { setTheme, toggleSidebar } = useUIStore.getState();

      setTheme("light");
      toggleSidebar();

      const state = useUIStore.getState();
      expect(state.theme).toBe("light");
      expect(state.sidebarOpen).toBe(false);
      // Other states should remain at defaults
      expect(state.bottomNavVisible).toBe(true);
      expect(state.activeModal).toBe(null);
    });
  });

  describe("Theme Toggle Pattern", () => {
    it("should support light -> dark -> system -> light cycle", () => {
      const { setTheme } = useUIStore.getState();

      // Start with light
      setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");

      // Move to dark
      setTheme("dark");
      expect(useUIStore.getState().theme).toBe("dark");

      // Move to system
      setTheme("system");
      expect(useUIStore.getState().theme).toBe("system");

      // Back to light
      setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");
    });
  });
});
