import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import { Moon, Sun } from "lucide-react";

export function MobileHeader() {
  const { theme, setTheme } = useUIStore();

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
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 bg-card border-b border-border",
        "md:hidden" // Hide on desktop
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            V
          </div>
          <span className="ml-3 text-lg font-semibold">VRSS</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Current theme: ${theme}`}
          >
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
