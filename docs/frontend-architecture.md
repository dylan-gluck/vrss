# VRSS Frontend Architecture

**Version**: 1.0
**Date**: 2025-10-16
**Tech Stack**: React 18+ / TypeScript / Vite / Shadcn-ui / Tailwind CSS / PWA

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [State Management](#state-management)
4. [Component Architecture](#component-architecture)
5. [Routing Structure](#routing-structure)
6. [PWA Configuration](#pwa-configuration)
7. [Offline Strategy](#offline-strategy)
8. [Key Features Implementation](#key-features-implementation)
9. [Performance Optimization](#performance-optimization)
10. [Integration with RPC API](#integration-with-rpc-api)

---

## Architecture Overview

### Core Principles

1. **Mobile-First Design**: All components designed for mobile viewport first, progressively enhanced for larger screens
2. **Offline-First**: Service worker caching with background sync for critical operations
3. **Component Composition**: Shadcn-ui components as building blocks, wrapped in domain-specific components
4. **Colocation**: Features organized by domain with components, hooks, and utilities together
5. **Performance**: Code splitting, lazy loading, and optimized re-renders
6. **Type Safety**: Full TypeScript coverage with strict mode enabled

### Technology Decisions

```typescript
// Core Stack
- React 18.3+              // Concurrent features, Suspense
- TypeScript 5.5+          // Strict type safety
- Vite 5+                  // Fast build tool, native ESM
- Shadcn-ui                // Component library
- Tailwind CSS 3.4+        // Utility-first styling
- React Router 6.23+       // Client-side routing

// State Management
- Zustand 4.5+             // Lightweight global state
- TanStack Query 5+        // Server state management
- React Hook Form 7.5+     // Form state management

// PWA
- Vite PWA Plugin          // Service worker generation
- Workbox                  // Caching strategies

// Utilities
- Zod                      // Schema validation
- date-fns                 // Date manipulation
- clsx / tailwind-merge    // Conditional styling
```

---

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # App icons (various sizes)
│   └── fonts/                     # Custom fonts
│
├── src/
│   ├── app/                       # App initialization
│   │   ├── App.tsx               # Root component
│   │   ├── router.tsx            # Route configuration
│   │   └── providers.tsx         # Context providers wrapper
│   │
│   ├── features/                  # Feature modules (domain-driven)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useSession.ts
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── components/
│   │   │   │   ├── ProfileHeader.tsx
│   │   │   │   ├── ProfileSection.tsx
│   │   │   │   ├── ProfileStyleEditor/
│   │   │   │   │   ├── BackgroundPicker.tsx
│   │   │   │   │   ├── ColorPicker.tsx
│   │   │   │   │   ├── FontSelector.tsx
│   │   │   │   │   └── MusicSelector.tsx
│   │   │   │   ├── ProfileLayoutEditor/
│   │   │   │   │   ├── SectionManager.tsx
│   │   │   │   │   ├── DraggableSection.tsx
│   │   │   │   │   └── SectionTypeSelector.tsx
│   │   │   │   └── ProfileRenderer.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useProfile.ts
│   │   │   │   ├── useProfileStyles.ts
│   │   │   │   └── useProfileLayout.ts
│   │   │   ├── stores/
│   │   │   │   └── profileStore.ts
│   │   │   ├── api/
│   │   │   │   └── profileApi.ts
│   │   │   └── types/
│   │   │       └── profile.types.ts
│   │   │
│   │   ├── feed/
│   │   │   ├── components/
│   │   │   │   ├── FeedView.tsx
│   │   │   │   ├── FeedTabs.tsx
│   │   │   │   ├── FeedBuilder/
│   │   │   │   │   ├── AlgorithmBuilder.tsx
│   │   │   │   │   ├── FilterBlock.tsx
│   │   │   │   │   ├── BlockConnector.tsx
│   │   │   │   │   └── BlockLibrary.tsx
│   │   │   │   ├── PostCard/
│   │   │   │   │   ├── PostCard.tsx
│   │   │   │   │   ├── TextPost.tsx
│   │   │   │   │   ├── ImagePost.tsx
│   │   │   │   │   ├── VideoPost.tsx
│   │   │   │   │   ├── SongPost.tsx
│   │   │   │   │   └── GalleryPost.tsx
│   │   │   │   └── CreatePost/
│   │   │   │       ├── PostComposer.tsx
│   │   │   │       ├── MediaUpload.tsx
│   │   │   │       └── PostTypeSelector.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFeed.ts
│   │   │   │   ├── useFeedAlgorithm.ts
│   │   │   │   └── useInfiniteScroll.ts
│   │   │   ├── stores/
│   │   │   │   └── feedStore.ts
│   │   │   ├── api/
│   │   │   │   └── feedApi.ts
│   │   │   └── types/
│   │   │       └── feed.types.ts
│   │   │
│   │   ├── messages/
│   │   │   ├── components/
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageThread.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── MessageBubble.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMessages.ts
│   │   │   │   └── useMessagePolling.ts
│   │   │   ├── stores/
│   │   │   │   └── messageStore.ts
│   │   │   └── api/
│   │   │       └── messageApi.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   ├── NotificationItem.tsx
│   │   │   │   └── NotificationBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNotifications.ts
│   │   │   │   └── useNotificationPolling.ts
│   │   │   ├── stores/
│   │   │   │   └── notificationStore.ts
│   │   │   └── api/
│   │   │       └── notificationApi.ts
│   │   │
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   ├── DiscoverFeed.tsx
│   │   │   │   └── AlgorithmBuilder.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSearch.ts
│   │   │   │   └── useDiscoverAlgorithm.ts
│   │   │   └── api/
│   │   │       └── searchApi.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   ├── AccountSettings.tsx
│   │       │   ├── PrivacySettings.tsx
│   │       │   ├── StorageManager.tsx
│   │       │   └── DangerZone.tsx
│   │       ├── hooks/
│   │       │   └── useSettings.ts
│   │       └── api/
│   │           └── settingsApi.ts
│   │
│   ├── components/                # Shared UI components
│   │   ├── ui/                    # Shadcn-ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── NavBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileHeader.tsx
│   │   │
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── EmptyState.tsx
│   │       ├── InfiniteScroll.tsx
│   │       ├── VirtualList.tsx
│   │       └── OfflineIndicator.tsx
│   │
│   ├── lib/                       # Core utilities
│   │   ├── api/
│   │   │   ├── client.ts         # RPC client setup
│   │   │   ├── types.ts          # API types
│   │   │   └── endpoints.ts      # API endpoints
│   │   │
│   │   ├── store/
│   │   │   └── createStore.ts    # Zustand store factory
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useOnline.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── usePWA.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── cn.ts             # Tailwind merge utility
│   │   │   ├── formatting.ts     # Text/date formatting
│   │   │   ├── validation.ts     # Input validation
│   │   │   └── storage.ts        # IndexedDB wrapper
│   │   │
│   │   └── constants/
│   │       ├── routes.ts
│   │       ├── media.ts
│   │       └── config.ts
│   │
│   ├── pages/                     # Page components
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── EditProfilePage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── styles/
│   │   ├── globals.css           # Global styles, Tailwind imports
│   │   └── themes.css            # Theme variables
│   │
│   ├── types/
│   │   ├── global.d.ts
│   │   └── env.d.ts
│   │
│   ├── workers/
│   │   └── sw.ts                 # Service worker (if custom)
│   │
│   ├── main.tsx                   # App entry point
│   └── vite-env.d.ts
│
├── .env.example
├── .env.local
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

---

## State Management

### State Architecture

We use a **multi-layered state management** approach:

```typescript
// Layer 1: Server State (TanStack Query)
// - Fetching, caching, synchronizing server data
// - Automatic refetching, pagination, infinite scroll
// - Optimistic updates

// Layer 2: Global Client State (Zustand)
// - User session/auth
// - UI state (theme, sidebar open/closed)
// - Cross-feature state
// - Offline queue

// Layer 3: Feature State (Zustand slices)
// - Profile editing state
// - Feed builder state
// - Message drafts

// Layer 4: Local Component State (useState/useReducer)
// - Form inputs
// - UI interactions
// - Ephemeral state
```

### State Management Implementation

#### 1. Auth Store (Zustand)

```typescript
// src/features/auth/stores/authStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
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
      isLoading: false,

      setUser: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'vrss-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
```

#### 2. UI Store (Zustand)

```typescript
// src/lib/store/uiStore.ts

import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  bottomNavVisible: boolean;
  activeModal: string | null;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setBottomNavVisible: (visible: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'system',
  sidebarOpen: false,
  bottomNavVisible: true,
  activeModal: null,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setBottomNavVisible: (visible) => set({ bottomNavVisible: visible }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));
```

#### 3. Server State (TanStack Query)

```typescript
// src/features/feed/hooks/useFeed.ts

import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from '../api/feedApi';
import type { Post, FeedAlgorithm } from '../types/feed.types';

interface UseFeedOptions {
  algorithm?: FeedAlgorithm;
  enabled?: boolean;
}

export function useFeed({ algorithm, enabled = true }: UseFeedOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['feed', algorithm?.id],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.getFeed({
        algorithmId: algorithm?.id,
        cursor: pageParam
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Optimistic update example
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: feedApi.createPost,
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      // Snapshot previous value
      const previousFeed = queryClient.getQueryData(['feed']);

      // Optimistically update
      queryClient.setQueryData(['feed'], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any, index: number) =>
          index === 0
            ? { ...page, posts: [newPost, ...page.posts] }
            : page
        ),
      }));

      return { previousFeed };
    },
    onError: (err, newPost, context) => {
      // Rollback on error
      queryClient.setQueryData(['feed'], context?.previousFeed);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

#### 4. Offline Queue Store

```typescript
// src/lib/store/offlineStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueuedAction {
  id: string;
  type: 'CREATE_POST' | 'UPDATE_PROFILE' | 'SEND_MESSAGE';
  payload: any;
  timestamp: number;
  retries: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];

  // Actions
  setOnline: (online: boolean) => void;
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => void;
  removeFromQueue: (id: string) => void;
  processQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      queue: [],

      setOnline: (online) => {
        set({ isOnline: online });
        if (online) {
          get().processQueue();
        }
      },

      addToQueue: (action) => set((state) => ({
        queue: [...state.queue, {
          ...action,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          retries: 0,
        }],
      })),

      removeFromQueue: (id) => set((state) => ({
        queue: state.queue.filter(a => a.id !== id),
      })),

      processQueue: async () => {
        const { queue, removeFromQueue } = get();

        for (const action of queue) {
          try {
            // Process action based on type
            // await processAction(action);
            removeFromQueue(action.id);
          } catch (error) {
            console.error('Failed to process queued action:', error);
          }
        }
      },
    }),
    {
      name: 'vrss-offline',
    }
  )
);
```

---

## Component Architecture

### Component Design Principles

1. **Single Responsibility**: Each component does one thing well
2. **Composition Over Configuration**: Build complex UIs from simple components
3. **Controlled vs Uncontrolled**: Offer both variants where appropriate
4. **Accessibility First**: ARIA attributes, keyboard navigation, screen reader support
5. **Mobile-First Responsive**: Design for smallest screen, enhance upward

### Component Categories

#### 1. Primitive Components (Shadcn-ui)

```typescript
// src/components/ui/button.tsx
// Direct from shadcn-ui, minimal customization
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
```

#### 2. Domain Components

```typescript
// src/features/feed/components/PostCard/PostCard.tsx

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { TextPost } from './TextPost';
import { ImagePost } from './ImagePost';
import { VideoPost } from './VideoPost';
import { SongPost } from './SongPost';
import { GalleryPost } from './GalleryPost';
import type { Post } from '../../types/feed.types';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
}) => {
  const renderContent = () => {
    switch (post.type) {
      case 'text':
        return <TextPost content={post.content} />;
      case 'image':
        return <ImagePost images={post.media} caption={post.content} />;
      case 'video':
        return <VideoPost video={post.media[0]} caption={post.content} />;
      case 'song':
        return <SongPost song={post.media[0]} />;
      case 'gallery':
        return <GalleryPost images={post.media} caption={post.content} />;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author.avatarUrl} alt={post.author.username} />
          <AvatarFallback>{post.author.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{post.author.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {renderContent()}
      </CardContent>

      <CardFooter className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => onLike?.(post.id)}
          >
            <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-sm">{post.likesCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => onComment?.(post.id)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{post.commentsCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(post.id)}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBookmark?.(post.id)}
        >
          <Bookmark className={`h-5 w-5 ${post.isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </CardFooter>
    </Card>
  );
};
```

#### 3. Layout Components

```typescript
// src/components/layout/AppShell.tsx

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useUIStore } from '@/lib/store/uiStore';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const bottomNavVisible = useUIStore((state) => state.bottomNavVisible);

  // Hide bottom nav on certain routes
  const hideBottomNav = ['/messages/', '/settings/'].some(route =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />

      {/* Desktop Layout */}
      {isDesktop ? (
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-2xl mx-auto py-6">
              <Outlet />
            </div>
          </main>
        </div>
      ) : (
        /* Mobile Layout */
        <div className="flex flex-col h-screen">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto pb-16">
            <Outlet />
          </main>
          {!hideBottomNav && bottomNavVisible && <BottomNav />}
        </div>
      )}
    </div>
  );
};
```

#### 4. Feature Components (Profile Style Editor)

```typescript
// src/features/profile/components/ProfileStyleEditor/ProfileStyleEditor.tsx

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { BackgroundPicker } from './BackgroundPicker';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { MusicSelector } from './MusicSelector';
import { Button } from '@/components/ui/button';
import { useProfileStyles } from '../../hooks/useProfileStyles';
import type { ProfileStyles } from '../../types/profile.types';

interface ProfileStyleEditorProps {
  profileId: string;
  initialStyles: ProfileStyles;
  onSave: (styles: ProfileStyles) => void;
  onCancel: () => void;
}

export const ProfileStyleEditor: React.FC<ProfileStyleEditorProps> = ({
  profileId,
  initialStyles,
  onSave,
  onCancel,
}) => {
  const [styles, setStyles] = useState<ProfileStyles>(initialStyles);
  const { updateStyles, isUpdating } = useProfileStyles(profileId);

  const handleStyleChange = <K extends keyof ProfileStyles>(
    key: K,
    value: ProfileStyles[K]
  ) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateStyles(styles);
    onSave(styles);
  };

  return (
    <Card className="p-4">
      <Tabs defaultValue="background" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="fonts">Fonts</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
        </TabsList>

        <TabsContent value="background" className="mt-4">
          <BackgroundPicker
            value={styles.background}
            onChange={(bg) => handleStyleChange('background', bg)}
          />
        </TabsContent>

        <TabsContent value="colors" className="mt-4">
          <ColorPicker
            colors={styles.colors}
            onChange={(colors) => handleStyleChange('colors', colors)}
          />
        </TabsContent>

        <TabsContent value="fonts" className="mt-4">
          <FontSelector
            selectedFont={styles.font}
            onChange={(font) => handleStyleChange('font', font)}
          />
        </TabsContent>

        <TabsContent value="music" className="mt-4">
          <MusicSelector
            selectedMusic={styles.music}
            onChange={(music) => handleStyleChange('music', music)}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
};
```

#### 5. Visual Algorithm Builder

```typescript
// src/features/feed/components/FeedBuilder/AlgorithmBuilder.tsx

import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FilterBlock } from './FilterBlock';
import { BlockLibrary } from './BlockLibrary';
import { BlockConnector } from './BlockConnector';
import type { AlgorithmBlock, FeedAlgorithm } from '../../types/feed.types';

interface AlgorithmBuilderProps {
  algorithm?: FeedAlgorithm;
  onSave: (algorithm: FeedAlgorithm) => void;
}

export const AlgorithmBuilder: React.FC<AlgorithmBuilderProps> = ({
  algorithm,
  onSave,
}) => {
  const [blocks, setBlocks] = useState<AlgorithmBlock[]>(
    algorithm?.blocks || []
  );
  const [showLibrary, setShowLibrary] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);

      const newBlocks = [...blocks];
      const [removed] = newBlocks.splice(oldIndex, 1);
      newBlocks.splice(newIndex, 0, removed);

      setBlocks(newBlocks);
    }
  };

  const addBlock = (blockType: AlgorithmBlock['type']) => {
    const newBlock: AlgorithmBlock = {
      id: crypto.randomUUID(),
      type: blockType,
      config: {},
    };
    setBlocks([...blocks, newBlock]);
    setShowLibrary(false);
  };

  const updateBlock = (blockId: string, config: any) => {
    setBlocks(blocks.map(b =>
      b.id === blockId ? { ...b, config } : b
    ));
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleSave = () => {
    onSave({
      id: algorithm?.id || crypto.randomUUID(),
      name: algorithm?.name || 'Custom Feed',
      blocks,
      createdAt: algorithm?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Feed Algorithm Builder</h3>
        <p className="text-sm text-muted-foreground">
          Build your custom feed by adding and connecting filter blocks
        </p>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                <FilterBlock
                  block={block}
                  onUpdate={(config) => updateBlock(block.id, config)}
                  onRemove={() => removeBlock(block.id)}
                />
                {index < blocks.length - 1 && <BlockConnector />}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Add your first filter block to get started
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setShowLibrary(!showLibrary)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter
        </Button>

        <Button onClick={handleSave} disabled={blocks.length === 0}>
          Save Algorithm
        </Button>
      </div>

      {showLibrary && (
        <BlockLibrary
          onSelectBlock={addBlock}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </Card>
  );
};
```

---

## Routing Structure

### Route Configuration

```typescript
// src/app/router.tsx

import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Lazy load pages for code splitting
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage'));
const EditProfilePage = React.lazy(() => import('@/pages/EditProfilePage'));
const MessagesPage = React.lazy(() => import('@/pages/MessagesPage'));
const MessageThreadPage = React.lazy(() => import('@/pages/MessageThreadPage'));
const NotificationsPage = React.lazy(() => import('@/pages/NotificationsPage'));
const SearchPage = React.lazy(() => import('@/pages/SearchPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'profile/:username',
        element: <ProfilePage />,
      },
      {
        path: 'profile/:username/edit',
        element: <EditProfilePage />,
      },
      {
        path: 'messages',
        element: <MessagesPage />,
      },
      {
        path: 'messages/:threadId',
        element: <MessageThreadPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'discover',
        element: <SearchPage />, // Same component, different tab
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
```

### Route Constants

```typescript
// src/lib/constants/routes.ts

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: (username: string) => `/profile/${username}`,
  EDIT_PROFILE: (username: string) => `/profile/${username}/edit`,
  MESSAGES: '/messages',
  MESSAGE_THREAD: (threadId: string) => `/messages/${threadId}`,
  NOTIFICATIONS: '/notifications',
  SEARCH: '/search',
  DISCOVER: '/discover',
  SETTINGS: '/settings',
} as const;
```

---

## PWA Configuration

### Manifest Configuration

```json
// public/manifest.json

{
  "name": "VRSS Social Platform",
  "short_name": "VRSS",
  "description": "A social platform with customizable profiles and feeds",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1170x2532",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/profile.png",
      "sizes": "1170x2532",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["social", "entertainment"],
  "prefer_related_applications": false
}
```

### Vite PWA Configuration

```typescript
// vite.config.ts

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
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.vrss\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(mp4|webm)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'video-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
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

---

## Offline Strategy

### Offline Detection

```typescript
// src/lib/hooks/useOnline.ts

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/lib/store/offlineStore';

export function useOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const setOnlineStore = useOfflineStore((state) => state.setOnline);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOnlineStore(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOnlineStore(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStore]);

  return isOnline;
}
```

### Offline Indicator Component

```typescript
// src/components/common/OfflineIndicator.tsx

import React from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnline } from '@/lib/hooks/useOnline';
import { useOfflineStore } from '@/lib/store/offlineStore';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnline();
  const queueCount = useOfflineStore((state) => state.queue.length);

  if (isOnline) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none border-b">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You're offline. {queueCount > 0 && `${queueCount} action(s) queued.`}
      </AlertDescription>
    </Alert>
  );
};
```

### IndexedDB for Offline Storage

```typescript
// src/lib/utils/storage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface VRSSDb extends DBSchema {
  posts: {
    key: string;
    value: any;
    indexes: { 'by-created': string };
  };
  profiles: {
    key: string;
    value: any;
  };
  drafts: {
    key: string;
    value: any;
  };
}

let db: IDBPDatabase<VRSSDb> | null = null;

export async function initDB() {
  if (db) return db;

  db = await openDB<VRSSDb>('vrss-db', 1, {
    upgrade(db) {
      // Posts store
      const postStore = db.createObjectStore('posts', { keyPath: 'id' });
      postStore.createIndex('by-created', 'createdAt');

      // Profiles store
      db.createObjectStore('profiles', { keyPath: 'id' });

      // Drafts store
      db.createObjectStore('drafts', { keyPath: 'id' });
    },
  });

  return db;
}

export async function savePosts(posts: any[]) {
  const database = await initDB();
  const tx = database.transaction('posts', 'readwrite');

  await Promise.all([
    ...posts.map(post => tx.store.put(post)),
    tx.done,
  ]);
}

export async function getCachedPosts(limit = 50) {
  const database = await initDB();
  const index = database.transaction('posts').store.index('by-created');
  return index.getAll(null, limit);
}

export async function saveProfile(profile: any) {
  const database = await initDB();
  await database.put('profiles', profile);
}

export async function getCachedProfile(profileId: string) {
  const database = await initDB();
  return database.get('profiles', profileId);
}

export async function saveDraft(draft: any) {
  const database = await initDB();
  await database.put('drafts', draft);
}

export async function getDrafts() {
  const database = await initDB();
  return database.getAll('drafts');
}

export async function deleteDraft(draftId: string) {
  const database = await initDB();
  await database.delete('drafts', draftId);
}
```

---

## Key Features Implementation

### 1. Profile Customization

```typescript
// src/features/profile/types/profile.types.ts

export interface ProfileStyles {
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string; // hex, gradient string, or image URL
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  font: {
    family: string;
    headingSize: 'sm' | 'md' | 'lg' | 'xl';
    bodySize: 'sm' | 'md' | 'lg';
  };
  music?: {
    url: string;
    title: string;
    autoplay: boolean;
  };
}

export interface ProfileSection {
  id: string;
  type: 'feed' | 'gallery' | 'links' | 'text' | 'image' | 'video' | 'friends';
  title?: string;
  config: Record<string, any>;
  order: number;
  visible: boolean;
}

export interface ProfileLayout {
  sections: ProfileSection[];
  columnsDesktop: 1 | 2;
  columnsMobile: 1;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  styles: ProfileStyles;
  layout: ProfileLayout;
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
  updatedAt: string;
}
```

### 2. Feed Algorithm Types

```typescript
// src/features/feed/types/feed.types.ts

export type BlockType =
  | 'filter-author'
  | 'filter-type'
  | 'filter-hashtag'
  | 'filter-date'
  | 'sort-popular'
  | 'sort-recent'
  | 'sort-random'
  | 'limit';

export interface AlgorithmBlock {
  id: string;
  type: BlockType;
  config: Record<string, any>;
}

export interface FeedAlgorithm {
  id: string;
  name: string;
  blocks: AlgorithmBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  type: 'text' | 'image' | 'video' | 'song' | 'gallery';
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  media: Media[];
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  duration?: number;
}
```

### 3. Media Upload Component

```typescript
// src/features/feed/components/CreatePost/MediaUpload.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

interface MediaUploadProps {
  type: 'image' | 'video' | 'audio';
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  onUpload: (files: File[]) => Promise<void>;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  type,
  multiple = false,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUpload,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const accept = {
    image: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    video: { 'video/*': ['.mp4', '.webm', '.mov'] },
    audio: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] },
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Validate file size
    const oversizedFiles = acceptedFiles.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: `Max file size is ${maxSize / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }

    // Create previews
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);

    // Upload
    setUploading(true);
    try {
      await onUpload(acceptedFiles);
      toast({
        title: 'Upload successful',
        description: `${acceptedFiles.length} file(s) uploaded`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive',
      });
      // Remove failed previews
      newPreviews.forEach(URL.revokeObjectURL);
      setPreviews(prev => prev.filter(p => !newPreviews.includes(p)));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [maxSize, onUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept[type],
    multiple,
    maxFiles,
    disabled: uploading,
  });

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getIcon = () => {
    switch (type) {
      case 'image': return <ImageIcon className="h-8 w-8" />;
      case 'video': return <Video className="h-8 w-8" />;
      case 'audio': return <Music className="h-8 w-8" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {getIcon()}
          <p className="text-sm font-medium">
            {isDragActive
              ? `Drop ${type} here`
              : `Drag & drop ${type} or click to browse`}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxSize / (1024 * 1024)}MB per file
          </p>
        </div>
      </Card>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-muted-foreground">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              {type === 'image' ? (
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                  {getIcon()}
                </div>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => removePreview(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4. Real-time Updates (Polling)

```typescript
// src/features/notifications/hooks/useNotificationPolling.ts

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useOnline } from '@/lib/hooks/useOnline';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotificationPolling() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnline = useOnline();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.getNotifications,
    enabled: isAuthenticated && isOnline,
    staleTime: POLL_INTERVAL,
  });

  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isAuthenticated, isOnline, queryClient]);

  return { notifications };
}
```

---

## Performance Optimization

### 1. Code Splitting

```typescript
// src/app/router.tsx (already implemented above)

// Lazy load all page components
const HomePage = React.lazy(() => import('@/pages/HomePage'));
// ... etc

// Preload on hover for better UX
import { Link } from 'react-router-dom';

const preloadComponent = (component: () => Promise<any>) => {
  component();
};

<Link
  to="/profile"
  onMouseEnter={() => preloadComponent(() => import('@/pages/ProfilePage'))}
>
  Profile
</Link>
```

### 2. Image Optimization

```typescript
// src/components/common/OptimizedImage.tsx

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate srcset for responsive images
  const srcSet = `
    ${src}?w=320 320w,
    ${src}?w=640 640w,
    ${src}?w=1024 1024w,
    ${src}?w=1920 1920w
  `;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {error ? (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">Failed to load</span>
        </div>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}
    </div>
  );
};
```

### 3. Virtual Scrolling for Feeds

```typescript
// src/components/common/VirtualList.tsx

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 400,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 3,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  // Detect when user scrolls near bottom
  React.useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (!virtualItems.length) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= items.length - endReachedThreshold &&
      onEndReached
    ) {
      onEndReached();
    }
  }, [virtualizer.getVirtualItems(), items.length, onEndReached, endReachedThreshold]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Memoization Strategy

```typescript
// src/features/feed/components/FeedView.tsx

import React, { useMemo } from 'react';
import { PostCard } from './PostCard/PostCard';
import { VirtualList } from '@/components/common/VirtualList';
import { useFeed } from '../hooks/useFeed';
import type { Post } from '../types/feed.types';

// Memoize expensive post card rendering
const MemoizedPostCard = React.memo(
  PostCard,
  (prev, next) => {
    // Custom comparison - only re-render if these change
    return (
      prev.post.id === next.post.id &&
      prev.post.likesCount === next.post.likesCount &&
      prev.post.commentsCount === next.post.commentsCount &&
      prev.post.isLiked === next.post.isLiked &&
      prev.post.isBookmarked === next.post.isBookmarked
    );
  }
);

export const FeedView: React.FC = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();

  // Flatten paginated data
  const posts = useMemo(
    () => data?.pages.flatMap(page => page.posts) ?? [],
    [data]
  );

  // Memoize render function
  const renderPost = useMemo(
    () => (post: Post) => <MemoizedPostCard post={post} />,
    []
  );

  return (
    <VirtualList
      items={posts}
      renderItem={renderPost}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      estimateSize={500}
    />
  );
};
```

---

## Integration with RPC API

### RPC Client Setup

```typescript
// src/lib/api/client.ts

import { useAuthStore } from '@/features/auth/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.vrss.app';

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
        ...(token && { 'Authorization': `Bearer ${token}` }),
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

  async batch<T = any>(calls: Array<{ method: string; params?: any }>): Promise<T[]> {
    const token = useAuthStore.getState().token;

    const requests: RPCRequest[] = calls.map(call => ({
      method: call.method,
      params: call.params,
      id: crypto.randomUUID(),
    }));

    const response = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(requests),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RPCResponse<T>[] = await response.json();

    return data.map(item => {
      if (item.error) {
        throw new Error(item.error.message);
      }
      return item.result as T;
    });
  }
}

export const rpcClient = new RPCClient(API_BASE_URL);
```

### API Methods

```typescript
// src/features/feed/api/feedApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Post, FeedAlgorithm } from '../types/feed.types';

export const feedApi = {
  async getFeed(params: { algorithmId?: string; cursor?: number; limit?: number }) {
    return rpcClient.call<{ posts: Post[]; nextCursor: number | null }>(
      'feed.get',
      params
    );
  },

  async createPost(post: Partial<Post>) {
    return rpcClient.call<Post>('post.create', { post });
  },

  async updatePost(postId: string, updates: Partial<Post>) {
    return rpcClient.call<Post>('post.update', { postId, updates });
  },

  async deletePost(postId: string) {
    return rpcClient.call<void>('post.delete', { postId });
  },

  async likePost(postId: string) {
    return rpcClient.call<void>('post.like', { postId });
  },

  async unlikePost(postId: string) {
    return rpcClient.call<void>('post.unlike', { postId });
  },

  async bookmarkPost(postId: string) {
    return rpcClient.call<void>('post.bookmark', { postId });
  },

  async unbookmarkPost(postId: string) {
    return rpcClient.call<void>('post.unbookmark', { postId });
  },

  async getAlgorithms() {
    return rpcClient.call<FeedAlgorithm[]>('feed.algorithms.list');
  },

  async createAlgorithm(algorithm: Omit<FeedAlgorithm, 'id' | 'createdAt' | 'updatedAt'>) {
    return rpcClient.call<FeedAlgorithm>('feed.algorithm.create', { algorithm });
  },

  async updateAlgorithm(algorithmId: string, algorithm: Partial<FeedAlgorithm>) {
    return rpcClient.call<FeedAlgorithm>('feed.algorithm.update', { algorithmId, algorithm });
  },

  async deleteAlgorithm(algorithmId: string) {
    return rpcClient.call<void>('feed.algorithm.delete', { algorithmId });
  },
};
```

```typescript
// src/features/profile/api/profileApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Profile, ProfileStyles, ProfileLayout } from '../types/profile.types';

export const profileApi = {
  async getProfile(username: string) {
    return rpcClient.call<Profile>('profile.get', { username });
  },

  async updateProfile(profileId: string, updates: Partial<Profile>) {
    return rpcClient.call<Profile>('profile.update', { profileId, updates });
  },

  async updateStyles(profileId: string, styles: ProfileStyles) {
    return rpcClient.call<Profile>('profile.styles.update', { profileId, styles });
  },

  async updateLayout(profileId: string, layout: ProfileLayout) {
    return rpcClient.call<Profile>('profile.layout.update', { profileId, layout });
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    const data = await response.json();
    return data.url;
  },
};
```

---

## Accessibility Features

### 1. Keyboard Navigation

```typescript
// src/lib/hooks/useKeyboardNavigation.ts

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onUp,
  onDown,
  onLeft,
  onRight,
  onEnter,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        onDown?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onLeft?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        onRight?.();
        break;
      case 'Enter':
        onEnter?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
    }
  }, [enabled, onUp, onDown, onLeft, onRight, onEnter, onEscape]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

### 2. Screen Reader Announcements

```typescript
// src/lib/hooks/useAnnouncement.ts

import { useEffect, useState } from 'react';

export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!announcement) return;

    const timer = setTimeout(() => {
      setAnnouncement('');
    }, 1000);

    return () => clearTimeout(timer);
  }, [announcement]);

  return {
    announce: setAnnouncement,
    AnnouncementRegion: () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    ),
  };
}
```

### 3. Focus Management

```typescript
// src/lib/hooks/useFocusTrap.ts

import { useEffect, useRef } from 'react';

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [active]);

  return ref;
}
```

---

## Build Configuration

### Package.json

```json
{
  "name": "vrss-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\""
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.0",
    "zustand": "^4.5.2",
    "@tanstack/react-query": "^5.32.0",
    "react-hook-form": "^7.51.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@tanstack/react-virtual": "^3.5.0",
    "react-dropzone": "^14.2.3",
    "zod": "^3.23.6",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.378.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.10",
    "vite-plugin-pwa": "^0.20.0",
    "typescript": "^5.4.5",
    "tailwindcss": "^3.4.3",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5",
    "workbox-window": "^7.1.0"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js

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
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

---

## Summary

This frontend architecture provides:

1. **Scalable Structure**: Feature-based organization with clear separation of concerns
2. **Type Safety**: Full TypeScript coverage with strict mode
3. **State Management**: Multi-layered approach with Zustand for global state and TanStack Query for server state
4. **PWA Support**: Offline-first with service worker caching and background sync
5. **Performance**: Code splitting, lazy loading, virtualization, and memoization
6. **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation and screen reader support
7. **Mobile-First**: Responsive design with touch-optimized interactions
8. **Developer Experience**: Type-safe API client, reusable hooks, and composition patterns

The architecture supports all MVP requirements including profile customization, visual feed builder, offline functionality, and real-time updates through polling.

Next steps would include:
- Setting up the initial project with Vite
- Installing Shadcn-ui components
- Implementing core layouts and routing
- Building feature modules incrementally
- Setting up PWA configuration
- Implementing offline storage
- Creating the visual algorithm builder
- Adding profile customization UI
