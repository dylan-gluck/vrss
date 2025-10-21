/**
 * Password Strength Component - Phase 4.4
 *
 * Visual indicator for password strength validation.
 * Shows progress bar and requirement checklist.
 */

import type React from "react";
import type { PasswordStrength as PasswordStrengthType } from "../types/auth.types";

interface PasswordStrengthProps {
  password: string;
}

/**
 * Calculate password strength based on requirements
 */
function calculatePasswordStrength(password: string): PasswordStrengthType {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const checks = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar];
  const score = checks.filter(Boolean).length as 0 | 1 | 2 | 3 | 4;

  return {
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}

/**
 * Get color class based on strength score
 */
function getStrengthColor(score: number): string {
  if (score === 0) return "bg-gray-200";
  if (score <= 2) return "bg-red-500";
  if (score === 3) return "bg-yellow-500";
  if (score === 4) return "bg-green-500";
  return "bg-green-600";
}

/**
 * Get strength label based on score
 */
function getStrengthLabel(score: number): string {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak";
  if (score === 3) return "Good";
  if (score === 4) return "Strong";
  return "Very Strong";
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const strengthColor = getStrengthColor(strength.score);
  const strengthLabel = getStrengthLabel(strength.score);
  const strengthPercent = (strength.score / 5) * 100;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className="font-medium">{strengthLabel}</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${strengthColor} transition-all duration-300`}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1 text-xs">
        <RequirementItem met={strength.hasMinLength} text="At least 8 characters" />
        <RequirementItem met={strength.hasUppercase} text="One uppercase letter" />
        <RequirementItem met={strength.hasLowercase} text="One lowercase letter" />
        <RequirementItem met={strength.hasNumber} text="One number" />
        <RequirementItem met={strength.hasSpecialChar} text="One special character" />
      </div>
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => (
  <div className="flex items-center gap-2">
    <div
      className={`h-4 w-4 rounded-full flex items-center justify-center ${
        met ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      {met && (
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Requirement met">
          <title>Requirement met</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className={met ? "text-foreground" : "text-muted-foreground"}>{text}</span>
  </div>
);
