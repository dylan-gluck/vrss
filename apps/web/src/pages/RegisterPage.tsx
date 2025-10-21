/**
 * Register Page - Phase 4.4
 *
 * Public page wrapper for RegisterForm component.
 * Provides centered layout for authentication.
 */

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import type React from "react";

export const RegisterPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <RegisterForm />
    </div>
  );
};
