import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { NavBar } from "./NavBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {isDesktop ? (
        // Desktop Layout
        <>
          <NavBar />
          <main
            className={cn(
              "min-h-screen transition-all duration-300",
              sidebarOpen ? "ml-64" : "ml-20"
            )}
          >
            <div className="container mx-auto p-6">{children}</div>
          </main>
        </>
      ) : (
        // Mobile Layout
        <>
          <MobileHeader />
          <main className="min-h-screen pt-16 pb-20">
            <div className="container mx-auto p-4">{children}</div>
          </main>
          <BottomNav />
        </>
      )}
    </div>
  );
}
