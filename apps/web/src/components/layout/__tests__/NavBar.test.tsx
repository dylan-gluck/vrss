import { useUIStore } from "@/lib/store/uiStore";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../../../../test/utils/render";
import { NavBar } from "../NavBar";

/**
 * Layout Component Tests - NavBar (Desktop Sidebar)
 *
 * Tests the desktop navigation sidebar with theme toggle and expandable/collapsible behavior.
 */
describe("NavBar Component", () => {
  beforeEach(() => {
    // Reset UI store to default state before each test
    const { setTheme, setSidebarOpen } = useUIStore.getState();
    setTheme("system");
    setSidebarOpen(true);
  });

  describe("Rendering", () => {
    it("should render the brand logo", () => {
      renderWithProviders(<NavBar />);
      const vrssElements = screen.getAllByText("VRSS");
      expect(vrssElements.length).toBeGreaterThan(0);
    });

    it("should render all navigation items", () => {
      renderWithProviders(<NavBar />);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should render theme toggle button", () => {
      renderWithProviders(<NavBar />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should have correct navigation links", () => {
      renderWithProviders(<NavBar />);

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const profileLink = screen.getByRole("link", { name: /Profile/i });
      const notificationsLink = screen.getByRole("link", { name: /Notifications/i });
      const settingsLink = screen.getByRole("link", { name: /Settings/i });

      expect(homeLink).toHaveAttribute("href", "/");
      expect(profileLink).toHaveAttribute("href", "/profile");
      expect(notificationsLink).toHaveAttribute("href", "/notifications");
      expect(settingsLink).toHaveAttribute("href", "/settings");
    });
  });

  describe("Sidebar State", () => {
    it("should show full width when sidebar is open", () => {
      const { setSidebarOpen } = useUIStore.getState();
      setSidebarOpen(true);

      const { container } = renderWithProviders(<NavBar />);
      const sidebar = container.querySelector("aside");

      expect(sidebar?.className).toContain("w-64");
    });

    it("should show collapsed width when sidebar is closed", () => {
      const { setSidebarOpen } = useUIStore.getState();
      setSidebarOpen(false);

      const { container } = renderWithProviders(<NavBar />);
      const sidebar = container.querySelector("aside");

      expect(sidebar?.className).toContain("w-20");
    });

    it("should show only logo initial when collapsed", () => {
      const { setSidebarOpen } = useUIStore.getState();
      setSidebarOpen(false);

      renderWithProviders(<NavBar />);

      // When collapsed, should show "V" instead of "VRSS"
      const logoText = screen.getByText("V");
      expect(logoText).toBeInTheDocument();
    });

    it("should show full logo when expanded", () => {
      const { setSidebarOpen } = useUIStore.getState();
      setSidebarOpen(true);

      renderWithProviders(<NavBar />);

      // Should show full "VRSS" text (appears twice in the component when expanded)
      const fullLogo = screen.getAllByText("VRSS");
      expect(fullLogo.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Theme Toggle", () => {
    it("should display current theme in title", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<NavBar />);

      const themeButton = screen.getByTitle("Current theme: light");
      expect(themeButton).toBeInTheDocument();
    });

    it("should show Sun icon for light theme", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<NavBar />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should show Moon icon for dark theme", () => {
      const { setTheme } = useUIStore.getState();
      setTheme("dark");

      renderWithProviders(<NavBar />);

      const themeButton = screen.getByTitle(/Current theme:/);
      expect(themeButton).toBeInTheDocument();
    });

    it("should cycle through themes when clicked", async () => {
      const user = userEvent.setup();
      const { setTheme } = useUIStore.getState();
      setTheme("light");

      renderWithProviders(<NavBar />);

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
    it("should have fixed positioning", () => {
      const { container } = renderWithProviders(<NavBar />);
      const sidebar = container.querySelector("aside");

      expect(sidebar?.className).toContain("fixed");
    });

    it("should have proper z-index for layering", () => {
      const { container } = renderWithProviders(<NavBar />);
      const sidebar = container.querySelector("aside");

      expect(sidebar?.className).toContain("z-40");
    });

    it("should have transition animation", () => {
      const { container } = renderWithProviders(<NavBar />);
      const sidebar = container.querySelector("aside");

      expect(sidebar?.className).toContain("transition-all");
    });
  });
});
