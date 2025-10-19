import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function App() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">VRSS Social Platform</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to VRSS - Your customizable social network
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>PWA Ready</CardTitle>
              <CardDescription>Progressive Web App capabilities enabled</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Installable</Badge>
              <Badge variant="secondary" className="ml-2">
                Offline Support
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsive Design</CardTitle>
              <CardDescription>Adapts to mobile and desktop</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Layout automatically switches at 768px breakpoint
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme System</CardTitle>
              <CardDescription>Light, dark, and system themes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Toggle Theme
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Development Status</CardTitle>
            <CardDescription>Phase 4.1: PWA Setup & Core UI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>Complete</Badge>
              <span className="text-sm">Tailwind CSS configured</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>Complete</Badge>
              <span className="text-sm">Shadcn-ui components installed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>Complete</Badge>
              <span className="text-sm">PWA manifest and service worker</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>Complete</Badge>
              <span className="text-sm">Responsive layout components</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default App;
