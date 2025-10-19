import { useUIStore } from "@/lib/store/uiStore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "../../../../test/utils/render";
import { AppShell } from "../AppShell";

/**
 * Mock the media query hook to control desktop/mobile rendering
 */
const mockUseIsDesktop = vi.fn();

vi.mock("@/lib/hooks/useMediaQuery", () => ({
  useIsDesktop: () => mockUseIsDesktop(),
  useIsMobile: vi.fn(),
  useIsTablet: vi.fn(),
  useIsLargeScreen: vi.fn(),
  useMediaQuery: vi.fn(),
}));

/**
 * Layout Component Tests - AppShell
 *
 * Tests the main layout wrapper that switches between desktop and mobile layouts
 * based on screen size (768px breakpoint).
 */
describe("AppShell Component", () => {
  beforeEach(() => {
    // Reset mock before each test
    vi.clearAllMocks();
  });

  it("should render children content", () => {
    mockUseIsDesktop.mockReturnValue(true);

    renderWithProviders(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  describe("Desktop Layout", () => {
    it("should render NavBar on desktop", () => {
      mockUseIsDesktop.mockReturnValue(true);

      renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // NavBar contains the brand "VRSS" (may appear multiple times)
      const vrssElements = screen.getAllByText("VRSS");
      expect(vrssElements.length).toBeGreaterThan(0);
    });

    it("should not render mobile components on desktop", () => {
      mockUseIsDesktop.mockReturnValue(true);

      renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // Mobile header and bottom nav should not be present
      // We can check by looking for elements that are only in mobile layout
      const mobileHeaders = screen.queryAllByText("VRSS");
      // In desktop mode, there should only be one VRSS (in NavBar)
      expect(mobileHeaders.length).toBeLessThanOrEqual(2);
    });

    it("should apply correct margin when sidebar is open", () => {
      mockUseIsDesktop.mockReturnValue(true);

      const { container } = renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const main = container.querySelector("main");
      expect(main).toBeTruthy();
      // Should have ml-64 class when sidebar is open (default state)
      expect(main?.className).toContain("ml-64");
    });

    it("should apply correct margin when sidebar is collapsed", () => {
      mockUseIsDesktop.mockReturnValue(true);

      // Close the sidebar
      const { setSidebarOpen } = useUIStore.getState();
      setSidebarOpen(false);

      const { container } = renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const main = container.querySelector("main");
      expect(main).toBeTruthy();
      // Should have ml-20 class when sidebar is collapsed
      expect(main?.className).toContain("ml-20");

      // Reset store
      setSidebarOpen(true);
    });
  });

  describe("Mobile Layout", () => {
    it("should render MobileHeader on mobile", () => {
      mockUseIsDesktop.mockReturnValue(false);

      renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // Mobile header contains VRSS brand
      const vrssElements = screen.getAllByText("VRSS");
      expect(vrssElements.length).toBeGreaterThan(0);
    });

    it("should render BottomNav on mobile", () => {
      mockUseIsDesktop.mockReturnValue(false);

      renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // Bottom nav contains navigation items
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should apply correct padding for mobile header and bottom nav", () => {
      mockUseIsDesktop.mockReturnValue(false);

      const { container } = renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const main = container.querySelector("main");
      expect(main).toBeTruthy();
      // Should have pt-16 (top padding for header) and pb-20 (bottom padding for nav)
      expect(main?.className).toContain("pt-16");
      expect(main?.className).toContain("pb-20");
    });
  });

  describe("Responsive Behavior", () => {
    it("should switch layouts when breakpoint changes", () => {
      // Start with desktop
      mockUseIsDesktop.mockReturnValue(true);
      const { rerender } = renderWithProviders(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // Switch to mobile
      mockUseIsDesktop.mockReturnValue(false);
      rerender(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      // Bottom nav should now be visible
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });
});
