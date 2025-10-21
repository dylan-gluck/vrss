/**
 * Login Page - Phase 4.4
 *
 * Public page wrapper for LoginForm component.
 * Provides centered layout for authentication.
 */

import type React from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <LoginForm />
    </div>
  );
};
