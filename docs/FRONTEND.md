# Frontend Documentation

Comprehensive guide to the VRSS frontend architecture, built with React, Vite, and modern PWA capabilities.

## Table of Contents

- [Overview](#overview)
- [React Architecture](#react-architecture)
- [Directory Structure](#directory-structure)
- [State Management](#state-management)
- [Data Fetching](#data-fetching)
- [Routing](#routing)
- [Component Library](#component-library)
- [Form Handling](#form-handling)
- [PWA Features](#pwa-features)
- [Responsive Design](#responsive-design)

---

## Overview

The VRSS frontend is a **Progressive Web App** built with React, Vite, and TypeScript. It emphasizes offline-first capabilities, responsive design, and type safety.

### Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast HMR, optimized builds)
- **State Management**: Zustand (lightweight, performant)
- **Data Fetching**: TanStack Query (caching, optimistic updates)
- **Routing**: React Router 6 (protected routes, navigation)
- **UI Components**: shadcn-ui (accessible, customizable)
- **Styling**: Tailwind CSS (utility-first)
- **Forms**: React Hook Form + Zod (validation)
- **PWA**: Vite PWA Plugin + Workbox (offline support)

### Key Features

✅ **Progressive Web App** - Install to home screen, offline support
✅ **Offline Queue** - Mutations retry when back online (up to 3 attempts)
✅ **Optimistic Updates** - Instant UI feedback before server response
✅ **Type Safety** - End-to-end TypeScript with strict mode
✅ **Responsive Design** - Desktop and mobile layouts
✅ **Authentication** - Session-based with localStorage persistence
✅ **Theme Support** - Light, dark, and system themes

---

## React Architecture

### Feature-Based Organization

The frontend follows a **feature-based** structure, grouping related components, hooks, and utilities:

```
apps/web/src/
├── features/          # Feature modules
│   └── auth/          # Authentication feature
│       ├── components/  # Auth-specific components
│       ├── hooks/       # Auth-specific hooks
│       └── stores/      # Auth-specific stores (if any)
├── components/        # Shared components
├── pages/             # Route pages
├── lib/               # Shared utilities
│   ├── api/           # RPC client
│   ├── store/         # Global Zustand stores
│   ├── hooks/         # Shared hooks
│   ├── constants/     # Constants and routes
│   └── utils/         # Utility functions
├── styles/            # Global styles
└── App.tsx            # Root component
```

### Design Principles

1. **Colocation**: Related code lives together
2. **Separation of Concerns**: UI, logic, and state are distinct
3. **Reusability**: Shared components extracted to `/components`
4. **Type Safety**: All components and hooks fully typed
5. **Testability**: Each feature has co-located tests

---

## Directory Structure

### Apps/Web File Tree

```
apps/web/
├── public/
│   ├── icons/           # PWA icons (72x72 to 512x512)
│   └── manifest.json    # PWA manifest
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── AuthGuard.tsx      # Protected route wrapper
│   │       │   ├── LoginForm.tsx      # Login form
│   │       │   ├── RegisterForm.tsx   # Registration form
│   │       │   ├── PasswordStrength.tsx  # Password indicator
│   │       │   └── EmailVerification.tsx # Email verify UI
│   │       └── stores/
│   │           └── authStore.ts       # (Deprecated - moved to lib/store)
│   ├── components/      # Shared UI components
│   │   ├── ui/          # shadcn-ui components (Button, Card, etc.)
│   │   └── layout/      # Layout components (Header, Footer)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── HomePage.tsx
│   │   └── VerifyEmailPage.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts       # RPC client
│   │   ├── store/
│   │   │   ├── authStore.ts    # Auth state (3 stores)
│   │   │   ├── uiStore.ts      # UI state
│   │   │   └── offlineStore.ts # Offline queue
│   │   ├── hooks/
│   │   │   └── useMediaQuery.ts  # Responsive breakpoints
│   │   ├── constants/
│   │   │   └── routes.ts       # Route constants
│   │   ├── utils/
│   │   │   └── cn.ts           # Class name utility
│   │   └── queryClient.ts      # TanStack Query config
│   ├── styles/
│   │   └── globals.css         # Tailwind directives
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── test/
│   ├── mocks/
│   │   ├── handlers.ts         # MSW handlers
│   │   ├── server.ts           # MSW server
│   │   └── data.ts             # Mock data
│   └── setup.ts                # Test setup (MSW, mocks)
├── vite.config.ts              # Vite + PWA config
└── package.json
```

---

## State Management

### Zustand Stores

The app uses **three Zustand stores** for global state:

#### 1. Auth Store (`authStore.ts`)

Manages authentication state with localStorage persistence:

```typescript
// Pseudocode - actual implementation in authStore.ts
interface AuthState {
  user: User | null           // Current user data
  token: string | null        // Session token
  isAuthenticated: boolean    // Auth flag
  isLoading: boolean          // Loading state

  // Actions
  setUser(user, token): void     // Login
  logout(): void                 // Logout
  updateUser(updates): void      // Update user data
}

// Persistence configuration
persist(authStore, {
  name: "vrss-auth",
  storage: localStorage,
  partialize: (state) => ({
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated
  })
})
```

**Usage**:
```typescript
// Pseudocode - component usage
const { user, isAuthenticated, logout } = useAuthStore()

if (!isAuthenticated) return <Navigate to="/login" />
```

**Persisted to localStorage**: ✅ Yes (user, token, isAuthenticated)

#### 2. UI Store (`uiStore.ts`)

Manages UI state (theme, sidebar, modals):

```typescript
// Pseudocode - UI state interface
interface UIState {
  theme: "light" | "dark" | "system"
  sidebarOpen: boolean
  bottomNavVisible: boolean
  activeModal: string | null

  // Actions
  setTheme(theme): void
  toggleSidebar(): void
  setSidebarOpen(open): void
  setBottomNavVisible(visible): void
  openModal(modalId): void
  closeModal(): void
}
```

**Features**:
- **Theme Management**: Applies theme to `<html>` element
- **System Theme Detection**: Respects `prefers-color-scheme`
- **Sidebar State**: Desktop sidebar toggle
- **Bottom Nav**: Mobile bottom navigation visibility
- **Modal State**: Global modal management

**Persisted to localStorage**: ❌ No (resets on refresh)

#### 3. Offline Store (`offlineStore.ts`)

Manages offline queue and network status:

```typescript
// Pseudocode - offline state interface
interface OfflineState {
  isOnline: boolean
  queue: QueuedAction[]

  // Actions
  setOnline(online): void
  addToQueue(action): void
  removeFromQueue(id): void
  processQueue(): Promise<void>
}

interface QueuedAction {
  id: string                    // UUID
  type: "RPC_CALL" | ...        // Action type
  payload: any                  // Action data
  timestamp: number             // Created timestamp
  retries: number               // Retry count (max 3)
}
```

**Features**:
- **Network Detection**: Listens to `online`/`offline` events
- **Mutation Queue**: Stores failed mutations for retry
- **Auto-Retry**: Processes queue when back online
- **Max Retries**: 3 attempts, then remove from queue

**Persisted to localStorage**: ✅ Yes (queue persists across sessions)

---

## Data Fetching

### TanStack Query

All API communication uses **TanStack Query** (React Query) for:

- **Caching**: Automatic caching with stale-time
- **Refetching**: Refetch on window focus, reconnect
- **Retries**: Automatic retry on failure
- **Optimistic Updates**: Instant UI updates
- **Infinite Scroll**: Cursor-based pagination

### Configuration

Query client configured in `/apps/web/src/lib/queryClient.ts`:

```typescript
// Pseudocode - query client config
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 minutes,         // Data fresh for 5 min
      gcTime: 30 minutes,            // Cache for 30 min (formerly cacheTime)
      retry: 3,                      // Retry failed queries 3x
      refetchOnWindowFocus: true     // Refetch on tab focus
    }
  }
})
```

### Query Hooks Pattern

Custom hooks encapsulate query logic:

```typescript
// Pseudocode - example query hook
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => rpcClient.call('user.get', { userId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId
  })
}

// Usage
const { data: user, isLoading, error } = useUser(userId)
```

### Mutation Hooks Pattern

Mutations handle data updates with optimistic UI:

```typescript
// Pseudocode - example mutation hook
function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId) => rpcClient.call('post.like', { postId }),

    // Optimistic update
    onMutate: async (postId) => {
      await queryClient.cancelQueries(['post', postId])

      const previousPost = queryClient.getQueryData(['post', postId])

      queryClient.setQueryData(['post', postId], (old) => ({
        ...old,
        isLiked: true,
        likesCount: old.likesCount + 1
      }))

      return { previousPost }
    },

    // Rollback on error
    onError: (err, postId, context) => {
      queryClient.setQueryData(['post', postId], context.previousPost)
    },

    // Refetch on success
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries(['post', postId])
    }
  })
}
```

### Infinite Scroll Pattern

Cursor-based pagination for feeds:

```typescript
// Pseudocode - infinite query hook
function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) =>
      rpcClient.call('feed.get', { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0
  })
}

// Usage
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useFeed()

// Render pages
data.pages.map(page =>
  page.posts.map(post => <Post key={post.id} {...post} />)
)
```

---

## Routing

### React Router

The app uses **React Router 6** for client-side routing.

### Route Structure

```typescript
// Pseudocode - route configuration in App.tsx
<Routes>
  {/* Public routes */}
  <Route path={ROUTES.LOGIN} element={<LoginPage />} />
  <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
  <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

  {/* Protected routes */}
  <Route path={ROUTES.HOME} element={
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  } />
</Routes>
```

### Route Constants

Centralized in `/apps/web/src/lib/constants/routes.ts`:

```typescript
// Pseudocode - route constants
export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  HOME: "/home",
  PROFILE: "/profile/:username"
} as const
```

### AuthGuard Component

Protected routes wrapped with `AuthGuard`:

```typescript
// Pseudocode - AuthGuard implementation
function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!isAuthenticated) {
    // Preserve intended destination
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
```

**Features**:
- **Loading State**: Shows spinner during auth check
- **Redirect**: Redirects to login if not authenticated
- **Location Preservation**: Saves intended URL for post-login redirect

---

## Component Library

### shadcn-ui

The app uses **shadcn-ui**, a collection of accessible, customizable components.

### Component Patterns

Components are copied into the codebase (not npm package):

```
apps/web/src/components/ui/
├── button.tsx          # Button variants
├── card.tsx            # Card with compound components
├── input.tsx           # Form input
├── form.tsx            # Form context
├── label.tsx           # Form label
├── dialog.tsx          # Modal dialog
├── dropdown-menu.tsx   # Dropdown
└── ...                 # Other components
```

### Example: Button Component

```typescript
// Pseudocode - button variants
const buttonVariants = cva("base-button-classes", {
  variants: {
    variant: {
      default: "bg-primary text-white",
      destructive: "bg-red-500 text-white",
      outline: "border border-primary",
      ghost: "hover:bg-accent"
    },
    size: {
      default: "h-10 px-4",
      sm: "h-9 px-3",
      lg: "h-11 px-8"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
})

// Usage
<Button variant="outline" size="lg">Click me</Button>
```

### Compound Components

Card uses compound component pattern:

```typescript
// Pseudocode - card compound components
function Card({ children, className, ...props }) {
  return <div className={cn("card-base", className)} {...props}>{children}</div>
}

Card.Header = ({ children, className, ...props }) => (
  <div className={cn("card-header", className)} {...props}>{children}</div>
)

Card.Content = ({ children, className, ...props }) => (
  <div className={cn("card-content", className)} {...props}>{children}</div>
)

// Usage
<Card>
  <Card.Header>
    <h2>Title</h2>
  </Card.Header>
  <Card.Content>
    <p>Content</p>
  </Card.Content>
</Card>
```

### cn Utility

Class name utility using `clsx` + `tailwind-merge`:

```typescript
// Pseudocode - cn utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage - merges and deduplicates classes
<div className={cn("p-4", "bg-white", className)} />
```

---

## Form Handling

### React Hook Form + Zod

Forms use **React Hook Form** for state management and **Zod** for validation.

### Form Pattern

```typescript
// Pseudocode - form implementation
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// 1. Define Zod schema
const loginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(12)
})

type LoginFormData = z.infer<typeof loginSchema>

// 2. Setup form with resolver
function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  })

  // 3. Handle submission
  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  // 4. Render form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Login</Button>
      </form>
    </Form>
  )
}
```

### Field-Level Validation

Zod provides real-time validation:

```typescript
// Pseudocode - field validation
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[!@#$%^&*]/, "Must contain special character")

// Errors show immediately on blur or submit
```

### Password Strength Indicator

Real-time password strength feedback:

```typescript
// Pseudocode - PasswordStrength component
function PasswordStrength({ password }) {
  const strength = calculateStrength(password)

  return (
    <div className="strength-indicator">
      <div className={`strength-bar strength-${strength}`} />
      <span>{strengthLabel(strength)}</span>
      <ul className="requirements">
        <li className={hasMinLength ? "met" : "unmet"}>12+ characters</li>
        <li className={hasUppercase ? "met" : "unmet"}>Uppercase letter</li>
        <li className={hasLowercase ? "met" : "unmet"}>Lowercase letter</li>
        <li className={hasNumber ? "met" : "unmet"}>Number</li>
        <li className={hasSpecial ? "met" : "unmet"}>Special character</li>
      </ul>
    </div>
  )
}
```

---

## PWA Features

### Service Worker

Configured via **Vite PWA Plugin** with Workbox:

```typescript
// Pseudocode - vite.config.ts PWA config
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\..*\/api\/.*/,
        handler: "NetworkFirst",          // API: Network first, fallback to cache
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }
        }
      },
      {
        urlPattern: /\.(?:jpg|jpeg|png|gif|webp)$/,
        handler: "CacheFirst",            // Images: Cache first
        options: {
          cacheName: "image-cache",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }
        }
      },
      {
        urlPattern: /\.(?:mp4|webm)$/,
        handler: "CacheFirst",            // Videos: Cache first
        options: {
          cacheName: "video-cache",
          expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 }
        }
      }
    ]
  }
})
```

**Caching Strategies**:
- **NetworkFirst**: API requests (fresh data preferred, fallback to cache)
- **CacheFirst**: Images, videos (serve from cache, update in background)

### Offline Queue

Failed mutations queue for retry when back online:

```typescript
// Pseudocode - offline queue usage
const offlineStore = useOfflineStore()

function createPostMutation() {
  return useMutation({
    mutationFn: (data) => rpcClient.call('post.create', data),

    onError: (error) => {
      if (!navigator.onLine) {
        // Add to offline queue
        offlineStore.addToQueue({
          type: "RPC_CALL",
          payload: {
            procedure: 'post.create',
            input: data
          }
        })
        toast.info("Post saved. Will upload when online.")
      }
    }
  })
}

// When network returns:
// 1. offlineStore.setOnline(true) called automatically
// 2. offlineStore.processQueue() runs automatically
// 3. Each queued action retried (max 3 attempts)
// 4. Success: removed from queue
// 5. Failure after 3 attempts: removed from queue, logged
```

### App Manifest

PWA manifest in `/apps/web/public/manifest.json`:

```json
{
  "name": "VRSS Social Platform",
  "short_name": "VRSS",
  "description": "A social platform with customizable profiles and feeds",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Features**:
- **Standalone Mode**: Runs like native app (no browser chrome)
- **Theme Color**: Matches OS status bar
- **Icons**: Multiple sizes for different devices

---

## Responsive Design

### Breakpoints

The app uses **Tailwind breakpoints**:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small phones |
| `md` | 768px | Tablets (primary mobile/desktop split) |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

**Primary Breakpoint**: `md` (768px) - Mobile vs Desktop

### useMediaQuery Hook

Custom hook for responsive behavior:

```typescript
// Pseudocode - useMediaQuery hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e) => setMatches(e.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)')

return isMobile ? <MobileLayout /> : <DesktopLayout />
```

### Desktop Layout

Desktop layout (`>= 768px`):

```
┌─────────────────────────────────────┐
│ NavBar (sidebar)  │   Main Content  │
│                   │                 │
│ - Home            │   <Page>        │
│ - Profile         │                 │
│ - Notifications   │                 │
│ - Settings        │                 │
└─────────────────────────────────────┘
```

**Features**:
- Sidebar navigation (toggleable)
- Wide content area
- Horizontal spacing for readability

### Mobile Layout

Mobile layout (`< 768px`):

```
┌─────────────────┐
│  MobileHeader   │
├─────────────────┤
│                 │
│  Main Content   │
│  <Page>         │
│                 │
├─────────────────┤
│   BottomNav     │
└─────────────────┘
```

**Features**:
- Top header (compact)
- Bottom navigation (thumb-friendly)
- Full-width content
- Touch-optimized buttons

### AppShell Component

Adaptive layout wrapper:

```typescript
// Pseudocode - AppShell component
function AppShell({ children }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { sidebarOpen } = useUIStore()

  if (isMobile) {
    return (
      <>
        <MobileHeader />
        <main>{children}</main>
        <BottomNav />
      </>
    )
  }

  return (
    <div className="desktop-layout">
      {sidebarOpen && <NavBar />}
      <main>{children}</main>
    </div>
  )
}
```

---

## Summary

The VRSS frontend provides:

✅ **Modern Stack** - React 18, Vite, TypeScript, Tailwind
✅ **State Management** - 3 Zustand stores (auth, ui, offline)
✅ **Data Fetching** - TanStack Query with caching and optimistic updates
✅ **Routing** - React Router with protected routes
✅ **Component Library** - shadcn-ui (accessible, customizable)
✅ **Form Handling** - React Hook Form + Zod validation
✅ **PWA Support** - Offline queue, service worker, installable
✅ **Responsive Design** - Mobile and desktop layouts
✅ **Type Safety** - End-to-end TypeScript with strict mode

**Test Coverage**: 333 frontend tests (Vitest + React Testing Library)

For questions or issues, refer to the test suites in `/apps/web/test` or component examples in `/apps/web/src/features`.

**Cross-References**:
- **Authentication**: See `/docs/AUTHENTICATION.md` for auth flows
- **API Integration**: See `/docs/API.md` for RPC procedures
- **Testing**: See `/docs/TESTING.md` for frontend test patterns
- **Data Model**: See `/docs/DATA_MODEL.md` for type definitions
