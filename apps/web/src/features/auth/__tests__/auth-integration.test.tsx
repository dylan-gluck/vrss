/**
 * Auth Integration Tests - Phase 4.4
 *
 * End-to-end integration tests for authentication flows.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "../../../pages/HomePage";
import { LoginPage } from "../../../pages/LoginPage";
import { RegisterPage } from "../../../pages/RegisterPage";
import { VerifyEmailPage } from "../../../pages/VerifyEmailPage";
import * as authApi from "../api/authApi";
import { AuthGuard } from "../components/AuthGuard";
import { useAuthStore } from "../stores/authStore";

// Mock the auth API
vi.mock("../api/authApi");

// Create wrapper with Router and QueryClient
function createWrapper(initialRoute = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(
      MemoryRouter,
      { initialEntries: [initialRoute] },
      createElement(QueryClientProvider, { client: queryClient }, children)
    );
}

const TestApp = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route
      path="/"
      element={
        <AuthGuard>
          <HomePage />
        </AuthGuard>
      }
    />
  </Routes>
);

describe("Auth Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe("Login Flow", () => {
    it("should complete full login flow and redirect to home", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        emailVerified: true,
      };

      vi.mocked(authApi.authApi.login).mockResolvedValue({
        user: mockUser,
        token: "token-123",
      });

      const user = userEvent.setup();

      render(<TestApp />, { wrapper: createWrapper("/login") });

      // Fill in login form
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Wait for redirect to home
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Verify auth store was updated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.email).toBe("test@example.com");
    });

    it("should show error on login failure", async () => {
      vi.mocked(authApi.authApi.login).mockRejectedValue(new Error("Invalid credentials"));

      const user = userEvent.setup();

      render(<TestApp />, { wrapper: createWrapper("/login") });

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      // Should stay on login page and show error
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Auth store should not be updated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe("Registration Flow", () => {
    it("should complete registration with verified email and redirect to home", async () => {
      const mockUser = {
        id: "1",
        username: "newuser",
        email: "new@example.com",
        displayName: "New User",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        emailVerified: true,
      };

      vi.mocked(authApi.authApi.register).mockResolvedValue({
        user: mockUser,
        token: "token-456",
      });

      const user = userEvent.setup();

      render(<TestApp />, { wrapper: createWrapper("/register") });

      // Fill in registration form
      const usernameInput = screen.getByLabelText("Username");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText(/^Password$/);
      const confirmPasswordInput = screen.getByLabelText("Confirm Password");
      const submitButton = screen.getByRole("button", { name: /create account/i });

      await user.type(usernameInput, "newuser");
      await user.type(emailInput, "new@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(submitButton);

      // Should redirect to home
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });
    });

    it("should redirect to email verification if email not verified", async () => {
      const mockUser = {
        id: "1",
        username: "newuser",
        email: "new@example.com",
        displayName: "New User",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      vi.mocked(authApi.authApi.register).mockResolvedValue({
        user: mockUser,
        token: "token-456",
      });

      const user = userEvent.setup();

      render(<TestApp />, { wrapper: createWrapper("/register") });

      const usernameInput = screen.getByLabelText("Username");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText(/^Password$/);
      const confirmPasswordInput = screen.getByLabelText("Confirm Password");
      const submitButton = screen.getByRole("button", { name: /create account/i });

      await user.type(usernameInput, "newuser");
      await user.type(emailInput, "new@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(submitButton);

      // Should redirect to verify email page
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe("Logout Flow", () => {
    it("should logout user and redirect to login", async () => {
      // Set up authenticated state
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

      vi.mocked(authApi.authApi.logout).mockResolvedValue();

      const user = userEvent.setup();

      render(<TestApp />, { wrapper: createWrapper("/") });

      // Should show home page
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

      // Click logout button
      const logoutButton = screen.getByRole("button", { name: /sign out/i });
      await user.click(logoutButton);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText("Welcome back")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
      });

      // Auth store should be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();
    });
  });

  describe("Protected Route Access", () => {
    it("should redirect unauthenticated user to login when accessing protected route", () => {
      render(<TestApp />, { wrapper: createWrapper("/") });

      // Should redirect to login
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should allow authenticated user to access protected route", () => {
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

      render(<TestApp />, { wrapper: createWrapper("/") });

      // Should show home page
      expect(screen.getByText(/welcome back, testuser/i)).toBeInTheDocument();
    });
  });
});
