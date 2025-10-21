/**
 * Auth Guard Component - Phase 4.4
 *
 * Protects routes from unauthenticated access.
 * Redirects to login page if user is not authenticated.
 */

import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { ROUTES } from "@/lib/constants/routes";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication
 * Redirects to login if not authenticated, preserving the intended destination
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted location
    // so we can redirect back after login
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
