# VRSS Frontend Implementation Guide

**Version**: 1.0
**Date**: 2025-10-16

This guide provides step-by-step instructions for implementing the VRSS frontend.

---

## Table of Contents

1. [Phase 1: Project Setup](#phase-1-project-setup)
2. [Phase 2: Core Infrastructure](#phase-2-core-infrastructure)
3. [Phase 3: Authentication](#phase-3-authentication)
4. [Phase 4: Feed System](#phase-4-feed-system)
5. [Phase 5: Profile System](#phase-5-profile-system)
6. [Phase 6: PWA Features](#phase-6-pwa-features)
7. [Phase 7: Polish & Optimization](#phase-7-polish--optimization)

---

## Phase 1: Project Setup

### Step 1.1: Initialize Vite Project

```bash
# Create new Vite project with React + TypeScript
npm create vite@latest vrss-frontend -- --template react-ts

cd vrss-frontend

# Install dependencies
npm install
```

### Step 1.2: Install Core Dependencies

```bash
# React ecosystem
npm install react-router-dom zustand @tanstack/react-query react-hook-form

# Shadcn-ui prerequisites
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Shadcn-ui dependencies
npm install @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select \
  @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch \
  @radix-ui/react-tabs @radix-ui/react-toast class-variance-authority \
  clsx tailwind-merge lucide-react

# Additional features
npm install @dnd-kit/core @dnd-kit/sortable @tanstack/react-virtual \
  react-dropzone zod date-fns idb

# PWA
npm install -D vite-plugin-pwa workbox-window

# Development tools
npm install -D @types/react @types/react-dom eslint prettier
```

### Step 1.3: Configure TypeScript

```bash
# Update tsconfig.json with path aliases
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 1.4: Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'VRSS Social Platform',
        short_name: 'VRSS',
        description: 'A social platform with customizable profiles and feeds',
        theme_color: '#000000',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.vrss\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 1.5: Configure Tailwind CSS

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### Step 1.6: Setup Global Styles

Create `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Step 1.7: Initialize Shadcn-ui

```bash
# Initialize shadcn-ui (this creates components.json)
npx shadcn-ui@latest init

# When prompted, select:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate
# - Global CSS: src/styles/globals.css
# - CSS variables: Yes
# - Tailwind config: tailwind.config.js
# - Components: src/components
# - Utils: src/lib/utils
# - React Server Components: No
# - Import alias: @/*
```

### Step 1.8: Install Initial Shadcn Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
```

### Step 1.9: Create Project Structure

```bash
# Create directory structure
mkdir -p src/{app,features,components/{layout,common},lib/{api,store,hooks,utils,constants},pages,styles,types,workers}

# Auth feature
mkdir -p src/features/auth/{components,hooks,stores,api,types}

# Profile feature
mkdir -p src/features/profile/{components,hooks,stores,api,types}

# Feed feature
mkdir -p src/features/feed/{components,hooks,stores,api,types}

# Messages feature
mkdir -p src/features/messages/{components,hooks,stores,api}

# Notifications feature
mkdir -p src/features/notifications/{components,hooks,stores,api}

# Search feature
mkdir -p src/features/search/{components,hooks,api}

# Settings feature
mkdir -p src/features/settings/{components,hooks,api}
```

### Step 1.10: Setup Environment Variables

Create `.env.example`:

```bash
VITE_API_URL=https://api.vrss.app
VITE_APP_NAME=VRSS
VITE_MAX_UPLOAD_SIZE=52428800
VITE_ENABLE_PWA=true
```

Create `.env.local`:

```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=VRSS
VITE_MAX_UPLOAD_SIZE=52428800
VITE_ENABLE_PWA=true
```

---

## Phase 2: Core Infrastructure

### Step 2.1: Create Utility Functions

Create `src/lib/utils/cn.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `src/lib/utils/formatting.ts`:

```typescript
import { formatDistanceToNow, format } from 'date-fns';

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date, formatStr = 'PPP'): string {
  return format(new Date(date), formatStr);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
```

### Step 2.2: Create Custom Hooks

Create `src/lib/hooks/useMediaQuery.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
```

Create `src/lib/hooks/useDebounce.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

Create `src/lib/hooks/useLocalStorage.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
```

### Step 2.3: Setup RPC Client

Create `src/lib/api/client.ts`:

```typescript
import { useAuthStore } from '@/features/auth/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RPCRequest {
  method: string;
  params?: any;
  id?: string;
}

interface RPCResponse<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string;
}

class RPCClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async call<T = any>(method: string, params?: any): Promise<T> {
    const token = useAuthStore.getState().token;

    const request: RPCRequest = {
      method,
      params,
      id: crypto.randomUUID(),
    };

    const response = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RPCResponse<T> = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result as T;
  }
}

export const rpcClient = new RPCClient(API_BASE_URL);
```

### Step 2.4: Setup TanStack Query

Create `src/lib/api/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Step 2.5: Create App Providers

Create `src/app/providers.tsx`:

```typescript
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/lib/api/queryClient';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
```

### Step 2.6: Create Error Boundary

Create `src/components/common/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Phase 3: Authentication

### Step 3.1: Create Auth Types

Create `src/features/auth/types/auth.types.ts`:

```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
```

### Step 3.2: Create Auth Store

Create `src/features/auth/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  setUser: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'vrss-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### Step 3.3: Create Auth API

Create `src/features/auth/api/authApi.ts`:

```typescript
import { rpcClient } from '@/lib/api/client';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth.types';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return rpcClient.call('auth.login', credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return rpcClient.call('auth.register', data);
  },

  async logout(): Promise<void> {
    return rpcClient.call('auth.logout');
  },

  async getCurrentUser(): Promise<User> {
    return rpcClient.call('auth.me');
  },

  async refreshToken(): Promise<{ token: string }> {
    return rpcClient.call('auth.refresh');
  },
};
```

### Step 3.4: Create Auth Hook

Create `src/features/auth/hooks/useAuth.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import { ROUTES } from '@/lib/constants/routes';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, logout: logoutStore, isAuthenticated } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user, data.token);
      navigate(ROUTES.HOME);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setUser(data.user, data.token);
      navigate(ROUTES.HOME);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
      navigate(ROUTES.LOGIN);
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isAuthenticated,
  };
}
```

### Step 3.5: Create Login Form

Create `src/features/auth/components/LoginForm.tsx`:

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login, isLoggingIn } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your VRSS account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
```

### Step 3.6: Create Auth Guard

Create `src/features/auth/components/AuthGuard.tsx`:

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ROUTES } from '@/lib/constants/routes';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};
```

---

## Phase 4: Feed System

### Implementation Priority

1. Feed types and API
2. Post display components
3. Feed view with infinite scroll
4. Create post functionality
5. Feed algorithm builder (last)

### Quick Start Template

Create `src/features/feed/components/FeedView.tsx`:

```typescript
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from '../api/feedApi';
import { PostCard } from './PostCard/PostCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const FeedView: React.FC = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => feedApi.getFeed({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          variant="outline"
          className="w-full"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
};
```

---

## Phase 5: Profile System

### Implementation Priority

1. Profile types and API
2. Profile display component
3. Profile style editor
4. Profile section manager
5. Profile layout customization

---

## Phase 6: PWA Features

### Step 6.1: Create Offline Indicator

Create `src/components/common/OfflineIndicator.tsx`:

```typescript
import React from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnline } from '@/lib/hooks/useOnline';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>You're offline</AlertDescription>
    </Alert>
  );
};
```

### Step 6.2: Create PWA Install Prompt

Create `src/lib/hooks/usePWA.ts`:

```typescript
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isInstallable,
    installPWA,
  };
}
```

---

## Phase 7: Polish & Optimization

### Checklist

- [ ] Add loading skeletons for all async content
- [ ] Implement error handling with toast notifications
- [ ] Add optimistic updates for user actions
- [ ] Optimize images with lazy loading
- [ ] Add keyboard shortcuts
- [ ] Implement focus management
- [ ] Test with screen readers
- [ ] Run Lighthouse audit
- [ ] Test offline functionality
- [ ] Add PWA install prompt
- [ ] Optimize bundle size
- [ ] Add analytics (optional)

---

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

---

## Testing Strategy

### Unit Tests (Optional for MVP)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### E2E Tests (Post-MVP)

```bash
npm install -D @playwright/test
```

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Docker (Manual)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Next Steps

1. Complete Phase 1 setup
2. Build authentication flow
3. Implement basic feed view
4. Add profile display
5. Build profile editor
6. Add feed algorithm builder
7. Implement PWA features
8. Polish and optimize
9. Deploy to staging
10. User testing
11. Deploy to production

Good luck with the implementation!
