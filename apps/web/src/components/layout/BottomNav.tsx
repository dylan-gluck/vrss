import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import { Bell, Home, Settings, User } from "lucide-react";

export function BottomNav() {
  const { bottomNavVisible } = useUIStore();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  if (!bottomNavVisible) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border",
        "md:hidden" // Hide on desktop
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="icon"
            className="flex-col h-14 w-14 gap-1"
            asChild
          >
            <a href={item.href}>
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </a>
          </Button>
        ))}
      </div>
    </nav>
  );
}
