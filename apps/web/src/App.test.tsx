/**
 * App Component Tests - Phase 4.4
 *
 * Tests for the main routing and navigation.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../test/utils/render";
import App from "./App";
import { useAuthStore } from "./lib/store/authStore";

describe("App Component", () => {
  beforeEach(() => {
    // Reset auth store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("should redirect to login when not authenticated", () => {
    renderWithProviders(<App />);
    // Should show login page
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("should show home page when authenticated", () => {
    // Set authenticated state
    useAuthStore.setState({
      user: {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: null,
      },
      token: "token-123",
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithProviders(<App />);

    // Should show home page content
    expect(screen.getByText("VRSS Social Platform")).toBeInTheDocument();
    expect(screen.getByText(/welcome back, testuser/i)).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = renderWithProviders(<App />);
    expect(container).toBeTruthy();
  });
});
