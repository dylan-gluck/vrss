/**
 * LoginForm Component Tests - Phase 4.4
 *
 * Tests for the login form component including validation and submission.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/LoginForm";
import * as authHooks from "../hooks/useAuth";

// Mock useAuth hook
vi.mock("../hooks/useAuth");

// Create wrapper with Router and QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(
      MemoryRouter,
      {},
      createElement(QueryClientProvider, { client: queryClient }, children)
    );
}

describe("LoginForm", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth hook
    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
      isLoggingOut: false,
      loginError: null,
      registerError: null,
      isAuthenticated: false,
      user: null,
    });
  });

  it("should render login form", () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should validate email format", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText("Email");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("should validate password minimum length", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "short");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("should submit valid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("should show loading state during login", () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      isLoggingIn: true,
      isRegistering: false,
      isLoggingOut: false,
      loginError: null,
      registerError: null,
      isAuthenticated: false,
      user: null,
    });

    render(<LoginForm />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole("button", { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it("should display login error message", () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
      isLoggingOut: false,
      loginError: new Error("Invalid credentials"),
      registerError: null,
      isAuthenticated: false,
      user: null,
    });

    render(<LoginForm />, { wrapper: createWrapper() });

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("should have link to register page", () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    const registerLink = screen.getByText("Sign up");
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("should have link to forgot password page", () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    const forgotPasswordLink = screen.getByText("Forgot password?");
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute("href", "/forgot-password");
  });
});
