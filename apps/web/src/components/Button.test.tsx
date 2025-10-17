import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { renderWithProviders, screen } from "../../test/utils/render";
import userEvent from "@testing-library/user-event";

describe("Button Component", () => {
  describe("Rendering", () => {
    it("should render button with children", () => {
      renderWithProviders(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("should render with primary variant by default", () => {
      renderWithProviders(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-blue-600");
    });

    it("should render with secondary variant", () => {
      renderWithProviders(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-gray-200");
    });

    it("should render with danger variant", () => {
      renderWithProviders(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-red-600");
    });

    it("should render with small size", () => {
      renderWithProviders(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-3 py-1.5");
    });

    it("should render with medium size by default", () => {
      renderWithProviders(<Button>Medium</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-4 py-2");
    });

    it("should render with large size", () => {
      renderWithProviders(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-6 py-3");
    });
  });

  describe("States", () => {
    it("should be disabled when disabled prop is true", () => {
      renderWithProviders(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.className).toContain("opacity-50");
    });

    it("should show loading state", () => {
      renderWithProviders(<Button loading>Loading</Button>);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should be disabled when loading", () => {
      renderWithProviders(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should not show children when loading", () => {
      renderWithProviders(<Button loading>Click me</Button>);
      expect(screen.queryByText("Click me")).not.toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(
        <Button onClick={handleClick} loading>
          Loading
        </Button>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Customization", () => {
    it("should accept custom className", () => {
      renderWithProviders(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
    });

    it("should forward HTML button attributes", () => {
      renderWithProviders(
        <Button type="submit" data-testid="submit-button">
          Submit
        </Button>
      );

      const button = screen.getByTestId("submit-button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("should support aria-label", () => {
      renderWithProviders(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have button role", () => {
      renderWithProviders(<Button>Accessible</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      renderWithProviders(<Button>Tab to me</Button>);
      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should announce disabled state", () => {
      renderWithProviders(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("disabled");
    });
  });
});
