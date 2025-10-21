/**
 * Auth Guard Component - Better-auth Integration
 *
 * Protects routes from unauthenticated access.
 * Redirects to login page if user is not authenticated.
 */

import { ROUTES } from "@/lib/constants/routes";
import { useSession } from "@/lib/auth/client";
import type React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication
 * Redirects to login if not authenticated, preserving the intended destination
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  // Show nothing while session is loading
  if (isPending) {
    return null;
  }

  if (!session?.user) {
    // Redirect to login, but save the attempted location
    // so we can redirect back after login
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
