import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithProviders, screen } from "../test/utils/render";

/**
 * Tests for the main App component
 */
describe("App Component", () => {
  it("should render the app title", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("VRSS Social Platform")).toBeInTheDocument();
  });

  it("should render the welcome message", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Welcome to VRSS - Your customizable social network")).toBeInTheDocument();
  });

  it("should show development mode status", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Status: Development Mode")).toBeInTheDocument();
  });

  it("should have proper styling applied", () => {
    renderWithProviders(<App />);
    const heading = screen.getByText("VRSS Social Platform");
    expect(heading.tagName).toBe("H1");
  });

  it("should render without crashing", () => {
    const { container } = renderWithProviders(<App />);
    expect(container).toBeTruthy();
  });
});
