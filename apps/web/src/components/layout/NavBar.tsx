import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import { Bell, Home, Moon, Settings, Sun, User } from "lucide-react";

export function NavBar() {
  const { theme, setTheme, sidebarOpen } = useUIStore();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex h-full flex-col p-4">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            {sidebarOpen ? "VRSS" : "V"}
          </div>
          {sidebarOpen && <span className="ml-3 text-lg font-semibold">VRSS</span>}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn("w-full justify-start", !sidebarOpen && "justify-center px-2")}
              asChild
            >
              <a href={item.href}>
                <item.icon className="h-5 w-5" />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </a>
            </Button>
          ))}
        </nav>

        <Separator className="my-4" />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={cn("w-full", !sidebarOpen && "justify-center")}
          title={`Current theme: ${theme}`}
        >
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {sidebarOpen && <span className="ml-3 capitalize">{theme} mode</span>}
        </Button>
      </div>
    </aside>
  );
}
