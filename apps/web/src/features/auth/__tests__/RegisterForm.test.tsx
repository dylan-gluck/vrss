/**
 * RegisterForm Component Tests - Phase 4.4
 *
 * Tests for the registration form component including password strength validation.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "../components/RegisterForm";
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

describe("RegisterForm", () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: vi.fn(),
      register: mockRegister,
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

  it("should render register form", () => {
    render(<RegisterForm />, { wrapper: createWrapper() });

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/)).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("should validate username minimum length", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const usernameInput = screen.getByLabelText("Username");
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(usernameInput, "ab");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Username must be at least 3 characters")).toBeInTheDocument();
    });
  });

  it("should validate username format", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const usernameInput = screen.getByLabelText("Username");
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(usernameInput, "invalid-username!");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Username can only contain letters, numbers, and underscores")
      ).toBeInTheDocument();
    });
  });

  it("should validate email format", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText("Email");
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("should validate password requirements", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText(/^Password$/);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Test missing uppercase
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one uppercase letter")
      ).toBeInTheDocument();
    });
  });

  it("should validate password confirmation match", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText(/^Password$/);
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "DifferentPassword123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it("should show password strength indicator", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText(/^Password$/);

    await user.type(passwordInput, "Weak1");

    // Password strength component should be visible
    await waitFor(() => {
      expect(screen.getByText("Password strength")).toBeInTheDocument();
    });
  });

  it("should submit valid registration data", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const usernameInput = screen.getByLabelText("Username");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText(/^Password$/);
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(usernameInput, "testuser");
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      });
    });
  });

  it("should show loading state during registration", () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      isLoggingIn: false,
      isRegistering: true,
      isLoggingOut: false,
      loginError: null,
      registerError: null,
      isAuthenticated: false,
      user: null,
    });

    render(<RegisterForm />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole("button", { name: /creating account/i });
    expect(submitButton).toBeDisabled();
  });

  it("should display registration error message", () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
      isLoggingOut: false,
      loginError: null,
      registerError: new Error("Username already taken"),
      isAuthenticated: false,
      user: null,
    });

    render(<RegisterForm />, { wrapper: createWrapper() });

    expect(screen.getByText("Username already taken")).toBeInTheDocument();
  });

  it("should have link to login page", () => {
    render(<RegisterForm />, { wrapper: createWrapper() });

    const loginLink = screen.getByText("Sign in");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
