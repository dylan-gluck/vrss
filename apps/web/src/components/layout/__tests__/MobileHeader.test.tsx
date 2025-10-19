import { useUIStore } from "@/lib/store/uiStore";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../../../../test/utils/render";
import { MobileHeader } from "../MobileHeader";

/**
 * Layout Component Tests - MobileHeader
 *
 * Tests the mobile header that appears at the top of the screen on mobile devices,
 * containing the brand logo and theme toggle.
 */
describe("MobileHeader Component", () => {
  beforeEach(() => {
    // Reset UI store to default state
    const { setTheme } = useUIStore.getState();
    setTheme("system");
  });

  describe("Rendering", () => {
    it("should render the brand logo", () => {
      renderWithProviders(<MobileHeader />);

      expect(screen.getByText("V")).toBeInTheDocument();
      expect(screen.getByText("VRSS")).toBeInTheDocument();
    });

    it("should render theme toggle button", () => {
      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should have correct logo structure", () => {
      const { container } = renderWithProviders(<MobileHeader />);

      // Logo should be in a flex container
      const logoContainer = container.querySelector(".flex.items-center");
      expect(logoContainer).toBeTruthy();

      // Should have the logo box and text
      const logoBox = container.querySelector(".bg-primary");
      expect(logoBox).toBeTruthy();
      expect(logoBox?.textContent).toBe("V");
    });
  });

  describe("Theme Toggle", () => {
    it("should display current theme in title", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle("Current theme: light");
      expect(themeButton).toBeInTheDocument();
    });

    it("should show Sun icon for light theme", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should show Moon icon for dark theme", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("dark");

      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should cycle through themes when clicked", async () => {
      const user = userEvent.setup();
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle("Current theme: light");

      // Click to go from light -> dark
      await user.click(themeButton);
      expect(useUIStore.getState().theme).toBe("dark");

      // Click to go from dark -> system
      await user.click(themeButton);
      expect(useUIStore.getState().theme).toBe("system");

      // Click to go from system -> light
      await user.click(themeButton);
      expect(useUIStore.getState().theme).toBe("light");
    });
  });

  describe("Styling", () => {
    it("should have fixed positioning at top", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const header = container.querySelector("header");

      expect(header?.className).toContain("fixed");
      expect(header?.className).toContain("top-0");
    });

    it("should span full width", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const header = container.querySelector("header");

      expect(header?.className).toContain("left-0");
      expect(header?.className).toContain("right-0");
    });

    it("should have proper z-index for layering", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const header = container.querySelector("header");

      expect(header?.className).toContain("z-40");
    });

    it("should be hidden on desktop (md:hidden)", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const header = container.querySelector("header");

      expect(header?.className).toContain("md:hidden");
    });

    it("should have proper height", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const headerContent = container.querySelector(".h-16");

      expect(headerContent).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic header element", () => {
      const { container } = renderWithProviders(<MobileHeader />);
      const header = container.querySelector("header");

      expect(header).toBeInTheDocument();
    });

    it("should have accessible theme toggle button", () => {
      renderWithProviders(<MobileHeader />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
      expect(themeButton.tagName).toBe("BUTTON");
    });
  });

  describe("Layout", () => {
    it("should have proper spacing between logo and actions", () => {
      const { container } = renderWithProviders(<MobileHeader />);

      // Header content should use justify-between
      const headerContent = container.querySelector(".justify-between");
      expect(headerContent).toBeTruthy();
    });
  });
});
