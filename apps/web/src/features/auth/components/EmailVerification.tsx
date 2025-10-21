/**
 * Email Verification Component - Phase 4.4
 *
 * Display message when user needs to verify their email.
 * Shows after registration if email verification is required.
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import type React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export const EmailVerification: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label="Email icon"
            >
              <title>Email</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Next steps:</p>
            <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Open the email we sent you</li>
              <li>Click the verification link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Didn't receive the email? Check your spam folder or{" "}
              <button type="button" className="text-primary hover:underline">
                resend verification email
              </button>
              .
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Link to={ROUTES.LOGIN} className="w-full">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
