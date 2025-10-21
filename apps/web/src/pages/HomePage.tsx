/**
 * Home Page - Phase 5.1
 *
 * Protected home page for authenticated users.
 * Displays the main feed with post creation and infinite scroll.
 */

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FeedView } from "@/features/feed/components/FeedView";
import type React from "react";

export const HomePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome back, {user?.username || user?.email}!
            </p>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            Sign out
          </Button>
        </div>

        <FeedView />
      </div>
    </AppShell>
  );
};
