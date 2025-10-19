import { useUIStore } from "@/lib/store/uiStore";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../../../../test/utils/render";
import { BottomNav } from "../BottomNav";

/**
 * Layout Component Tests - BottomNav (Mobile Bottom Navigation)
 *
 * Tests the mobile bottom navigation bar that appears at the bottom of the screen
 * on mobile devices.
 */
describe("BottomNav Component", () => {
  beforeEach(() => {
    // Reset UI store to default state
    const { setBottomNavVisible } = useUIStore.getState();
    setBottomNavVisible(true);
  });

  describe("Rendering", () => {
    it("should render all navigation items", () => {
      renderWithProviders(<BottomNav />);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should have correct navigation links", () => {
      renderWithProviders(<BottomNav />);

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const notificationsLink = screen.getByRole("link", { name: /Notifications/i });
      const profileLink = screen.getByRole("link", { name: /Profile/i });
      const settingsLink = screen.getByRole("link", { name: /Settings/i });

      expect(homeLink).toHaveAttribute("href", "/");
      expect(notificationsLink).toHaveAttribute("href", "/notifications");
      expect(profileLink).toHaveAttribute("href", "/profile");
      expect(settingsLink).toHaveAttribute("href", "/settings");
    });

    it("should render navigation items with icons and labels", () => {
      const { container } = renderWithProviders(<BottomNav />);

      // Check for navigation item structure
      const navItems = container.querySelectorAll("a");
      expect(navItems.length).toBe(4);

      // Each item should have both icon and label
      for (const item of navItems) {
        const label = item.querySelector(".text-xs");
        expect(label).toBeTruthy();
      }
    });
  });

  describe("Visibility State", () => {
    it("should be visible when bottomNavVisible is true", () => {
      const { setBottomNavVisible } = useUIStore.getState();
      setBottomNavVisible(true);

      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav).toBeInTheDocument();
    });

    it("should not render when bottomNavVisible is false", () => {
      const { setBottomNavVisible } = useUIStore.getState();
      setBottomNavVisible(false);

      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have fixed positioning at bottom", () => {
      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav?.className).toContain("fixed");
      expect(nav?.className).toContain("bottom-0");
    });

    it("should span full width", () => {
      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav?.className).toContain("left-0");
      expect(nav?.className).toContain("right-0");
    });

    it("should have proper z-index for layering", () => {
      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav?.className).toContain("z-40");
    });

    it("should be hidden on desktop (md:hidden)", () => {
      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav?.className).toContain("md:hidden");
    });
  });

  describe("Accessibility", () => {
    it("should use semantic nav element", () => {
      const { container } = renderWithProviders(<BottomNav />);
      const nav = container.querySelector("nav");

      expect(nav).toBeInTheDocument();
    });

    it("should have accessible button elements", () => {
      renderWithProviders(<BottomNav />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBe(4);
    });
  });
});
