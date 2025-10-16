# VRSS Frontend Architecture Diagrams

**Version**: 1.0
**Date**: 2025-10-16

Visual diagrams to help understand the VRSS frontend architecture.

---

## Table of Contents

1. [Application Architecture](#application-architecture)
2. [State Management Flow](#state-management-flow)
3. [Component Hierarchy](#component-hierarchy)
4. [Data Flow](#data-flow)
5. [File Upload Flow](#file-upload-flow)
6. [Offline Strategy](#offline-strategy)
7. [Navigation Structure](#navigation-structure)

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VRSS PWA Frontend                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Browser Layer                             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐     │  │
│  │  │  IndexedDB  │  │ LocalStorage │  │  Service Worker  │     │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      React Layer                               │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐     │  │
│  │  │  App Providers (Query Client, Toaster, Error)        │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐     │  │
│  │  │  Router (React Router)                               │     │  │
│  │  │    ├─ Auth Routes (Login, Register)                  │     │  │
│  │  │    └─ Protected Routes (Home, Profile, Messages...)  │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐     │  │
│  │  │  Layout Components                                    │     │  │
│  │  │    ├─ Mobile: Header + Content + Bottom Nav          │     │  │
│  │  │    └─ Desktop: Sidebar + Content                     │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐     │  │
│  │  │  Feature Modules                                      │     │  │
│  │  │    ├─ Auth (Login, Register, Auth Guard)             │     │  │
│  │  │    ├─ Feed (Posts, Algorithm Builder)                │     │  │
│  │  │    ├─ Profile (Display, Editor, Customization)       │     │  │
│  │  │    ├─ Messages (Threads, Chat)                        │     │  │
│  │  │    ├─ Notifications (List, Badge)                     │     │  │
│  │  │    ├─ Search (Users, Posts, Hashtags)                │     │  │
│  │  │    └─ Settings (Account, Privacy, Storage)           │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    State Management                            │  │
│  │                                                                 │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐     │  │
│  │  │  TanStack      │  │    Zustand     │  │   React      │     │  │
│  │  │  Query         │  │  Global State  │  │ Local State  │     │  │
│  │  │  (Server)      │  │  (Client)      │  │  (Component) │     │  │
│  │  └────────────────┘  └────────────────┘  └──────────────┘     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      API Layer                                 │  │
│  │                                                                 │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │  RPC Client                                            │   │  │
│  │  │    ├─ Error Handling                                   │   │  │
│  │  │    ├─ Auth Token Management                            │   │  │
│  │  │    └─ Request Batching                                 │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │  Feature APIs                                          │   │  │
│  │  │    ├─ feedApi     (posts, algorithms)                  │   │  │
│  │  │    ├─ profileApi  (user profiles, styles)              │   │  │
│  │  │    ├─ messageApi  (threads, messages)                  │   │  │
│  │  │    ├─ notifApi    (notifications)                      │   │  │
│  │  │    └─ uploadApi   (S3 file uploads)                    │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────┬───────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         Backend API                                   │
│                      /api/rpc endpoint                                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      State Management Layers                         │
└─────────────────────────────────────────────────────────────────────┘

Layer 1: Server State (TanStack Query)
┌─────────────────────────────────────────────────────────────────────┐
│  Query Client                                                        │
│  ├─ Cache posts, profiles, notifications                            │
│  ├─ Automatic refetching & invalidation                             │
│  ├─ Pagination & infinite scroll                                    │
│  └─ Optimistic updates                                              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ API Calls
                                   ▼
                            ┌──────────────┐
                            │  RPC Client  │
                            └──────────────┘
                                   │
                                   ▼
                            Backend API /api/rpc


Layer 2: Global Client State (Zustand)
┌─────────────────────────────────────────────────────────────────────┐
│  Auth Store                                                          │
│  ├─ user: User | null                                                │
│  ├─ token: string | null                                             │
│  ├─ isAuthenticated: boolean                                         │
│  └─ Persisted to localStorage                                        │
├─────────────────────────────────────────────────────────────────────┤
│  UI Store                                                            │
│  ├─ theme: 'light' | 'dark' | 'system'                               │
│  ├─ sidebarOpen: boolean                                             │
│  ├─ activeModal: string | null                                       │
│  └─ Not persisted                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Offline Store                                                       │
│  ├─ isOnline: boolean                                                │
│  ├─ queue: QueuedAction[]                                            │
│  └─ Persisted to localStorage                                        │
└─────────────────────────────────────────────────────────────────────┘


Layer 3: Feature State (Zustand slices per feature)
┌─────────────────────────────────────────────────────────────────────┐
│  Profile Editor Store                                                │
│  ├─ editingProfile: Profile                                          │
│  ├─ unsavedChanges: boolean                                          │
│  └─ previewMode: boolean                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Feed Builder Store                                                  │
│  ├─ currentAlgorithm: FeedAlgorithm                                  │
│  ├─ blocks: AlgorithmBlock[]                                         │
│  └─ isDirty: boolean                                                 │
└─────────────────────────────────────────────────────────────────────┘


Layer 4: Local Component State (useState/useReducer)
┌─────────────────────────────────────────────────────────────────────┐
│  Component State                                                     │
│  ├─ Form inputs (text, checkboxes, etc.)                            │
│  ├─ UI interactions (open/closed, hover, focus)                     │
│  ├─ Temporary data (search query, draft content)                    │
│  └─ Ephemeral state (animation states, modals)                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App
├─ Providers
│  ├─ QueryClientProvider (TanStack Query)
│  ├─ Toaster (Toast notifications)
│  └─ ReactQueryDevtools
│
└─ Router
   │
   ├─ Auth Routes (Public)
   │  ├─ /login      → LoginPage
   │  │                 └─ LoginForm
   │  └─ /register   → RegisterPage
   │                    └─ RegisterForm
   │
   └─ Protected Routes (Authenticated)
      │
      └─ AppShell (Layout wrapper)
         │
         ├─ OfflineIndicator
         │
         ├─ Desktop Layout (≥768px)
         │  ├─ Sidebar
         │  │  ├─ Logo & Branding
         │  │  ├─ Navigation Links
         │  │  ├─ User Info
         │  │  └─ Logout Button
         │  │
         │  └─ Main Content Area
         │     └─ Outlet (Current page)
         │
         └─ Mobile Layout (<768px)
            ├─ MobileHeader
            │  ├─ Back Button
            │  ├─ Page Title
            │  └─ Actions (Search, Menu)
            │
            ├─ Main Content Area
            │  └─ Outlet (Current page)
            │
            └─ BottomNav
               ├─ Home
               ├─ Search
               ├─ Create Post
               ├─ Messages (with badge)
               └─ Profile


Page Components (rendered in Outlet)
│
├─ HomePage
│  ├─ FeedTabs
│  │  ├─ Tab: For You
│  │  ├─ Tab: Following
│  │  └─ Tab: Custom Feeds
│  │
│  ├─ FeedView
│  │  └─ VirtualList
│  │     └─ PostCard (repeated)
│  │        ├─ PostHeader (Avatar, Username, Time)
│  │        ├─ PostContent
│  │        │  ├─ TextPost
│  │        │  ├─ ImagePost
│  │        │  ├─ VideoPost
│  │        │  ├─ SongPost
│  │        │  └─ GalleryPost
│  │        └─ PostFooter (Like, Comment, Share, Bookmark)
│  │
│  └─ CreatePostButton (FAB)
│
├─ ProfilePage
│  ├─ ProfileHeader
│  │  ├─ Background (styled)
│  │  ├─ Avatar
│  │  ├─ User Info
│  │  └─ Actions (Follow, Edit, Settings)
│  │
│  ├─ ProfileSections (dynamic)
│  │  ├─ FeedSection
│  │  ├─ GallerySection
│  │  ├─ LinksSection
│  │  └─ ... (configurable)
│  │
│  └─ BackgroundMusicPlayer (if enabled)
│
├─ EditProfilePage
│  ├─ ProfileStyleEditor
│  │  ├─ BackgroundPicker
│  │  ├─ ColorPicker
│  │  ├─ FontSelector
│  │  └─ MusicSelector
│  │
│  ├─ SectionManager
│  │  └─ DraggableSection (repeated)
│  │     ├─ Drag Handle
│  │     ├─ Section Config
│  │     └─ Delete Button
│  │
│  └─ ProfilePreview (live preview)
│
├─ MessagesPage
│  ├─ ThreadList
│  │  └─ ThreadItem (repeated)
│  │     ├─ Avatar
│  │     ├─ Name
│  │     ├─ Last Message Preview
│  │     └─ Unread Badge
│  │
│  └─ MessageThread (selected)
│     ├─ MessageList
│     │  └─ MessageBubble (repeated)
│     └─ MessageInput
│
├─ NotificationsPage
│  └─ NotificationList
│     └─ NotificationItem (repeated)
│        ├─ Icon (type-based)
│        ├─ Content
│        └─ Timestamp
│
├─ SearchPage
│  ├─ SearchBar (with filters)
│  ├─ Tabs
│  │  ├─ All
│  │  ├─ Users
│  │  ├─ Posts
│  │  └─ Hashtags
│  │
│  └─ SearchResults
│     ├─ UserResults
│     ├─ PostResults
│     └─ HashtagResults
│
└─ SettingsPage
   ├─ AccountSettings
   ├─ PrivacySettings
   ├─ StorageManager
   └─ DangerZone
```

---

## Data Flow

### User Action → UI Update

```
┌─────────────┐
│    User     │
│   Action    │
└──────┬──────┘
       │ (e.g., Like Post)
       ▼
┌─────────────────────────────┐
│   Component Event Handler   │
│   onClick={() => like()}    │
└──────────────┬──────────────┘
               │
               ▼
┌───────────────────────────────────┐
│  useLikePost Hook (TanStack)      │
│  - onMutate: Optimistic update    │
│  - mutationFn: API call           │
│  - onError: Rollback              │
│  - onSettled: Refetch             │
└───────────────┬───────────────────┘
                │
                ├─► Optimistic Update (instant)
                │   ├─ Update cache
                │   └─ Re-render UI
                │
                ▼
┌───────────────────────────────────┐
│      RPC Client API Call          │
│  feedApi.likePost(postId)         │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│      POST /api/rpc                │
│  method: "post.like"              │
│  params: { postId: "123" }        │
└───────────────┬───────────────────┘
                │
                ▼
        ┌───────────────┐
        │    Backend    │
        │   Processes   │
        └───────┬───────┘
                │
                ├─► Success
                │   ├─ Invalidate queries
                │   └─ Refetch latest data
                │
                └─► Error
                    ├─ Rollback optimistic update
                    └─ Show error toast
```

### Feed Loading Flow

```
┌─────────────────┐
│  User navigates │
│   to HomePage   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│  useFeed() hook called   │
│  with algorithmId        │
└──────────┬───────────────┘
           │
           ├─► Check cache (TanStack Query)
           │   └─ If fresh → Return cached data
           │
           ▼
┌──────────────────────────────┐
│  Fetch from API              │
│  feedApi.getFeed()           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  RPC Call: "feed.get"        │
│  params: {                   │
│    algorithmId: "xyz",       │
│    cursor: 0,                │
│    limit: 20                 │
│  }                           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Backend responds            │
│  {                           │
│    posts: [...],             │
│    nextCursor: 20,           │
│    hasMore: true             │
│  }                           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Update Query Cache          │
│  Store in TanStack Query     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Component Re-renders        │
│  Display posts in UI         │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  User scrolls to bottom      │
│  onEndReached triggered      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  fetchNextPage() called      │
│  cursor: 20                  │
└──────────────────────────────┘
           │
           └─► Repeat fetch cycle with new cursor
```

---

## File Upload Flow

```
┌─────────────────────────┐
│   User selects file     │
│   in MediaUpload        │
└───────────┬─────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Phase 1: Request Upload Signature │
│                                     │
│  uploadApi.getUploadSignature()    │
│    ↓                                │
│  POST /api/rpc                      │
│  method: "upload.getSignature"     │
│  params: {                          │
│    fileName: "photo.jpg",          │
│    fileSize: 2048000,              │
│    mimeType: "image/jpeg",         │
│    type: "post"                    │
│  }                                  │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Backend Response                   │
│  {                                  │
│    uploadId: "uuid-123",           │
│    uploadUrl: "https://s3...",     │
│    fields: {                        │
│      key: "uploads/uuid-123.jpg",  │
│      policy: "...",                │
│      signature: "..."              │
│    },                               │
│    expiresAt: "2024-..."           │
│  }                                  │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Phase 2: Upload to S3              │
│                                     │
│  uploadApi.uploadToS3()             │
│    ↓                                │
│  POST https://s3.amazonaws.com/...  │
│  FormData:                          │
│    - fields from signature          │
│    - file: <actual file>            │
│                                     │
│  Track progress with XHR            │
│    ↓                                │
│  onProgress(percent) → Update UI    │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  S3 Response: 204 No Content        │
│  File successfully uploaded         │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Phase 3: Confirm Upload            │
│                                     │
│  uploadApi.confirmUpload()          │
│    ↓                                │
│  POST /api/rpc                      │
│  method: "upload.confirm"          │
│  params: {                          │
│    uploadId: "uuid-123"            │
│  }                                  │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Backend Response                   │
│  {                                  │
│    id: "file-456",                 │
│    url: "https://cdn.../...",      │
│    thumbnailUrl: "https://...",    │
│    width: 1920,                    │
│    height: 1080,                   │
│    size: 2048000,                  │
│    mimeType: "image/jpeg"          │
│  }                                  │
└───────────┬────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  Use uploaded file in post          │
│  Store file.id in post.mediaIds     │
└─────────────────────────────────────┘
```

---

## Offline Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    Offline-First Architecture                 │
└──────────────────────────────────────────────────────────────┘

Online State:
┌─────────────┐
│   Browser   │
│   (Online)  │
└──────┬──────┘
       │
       ├─► User Action (e.g., Create Post)
       │   └─► API Call → Success → Update UI
       │
       ├─► Fetch Data
       │   ├─► Network First
       │   └─► Cache Response
       │
       └─► Background Polling
           ├─► Notifications (30s)
           └─► Messages (10s)


Offline State:
┌─────────────┐
│   Browser   │
│  (Offline)  │
└──────┬──────┘
       │
       ├─► User Action (e.g., Create Post)
       │   ├─► Show "Offline" indicator
       │   ├─► Save to Offline Queue
       │   │   └─► Persisted to localStorage
       │   └─► Optimistic UI update
       │
       ├─► Fetch Data
       │   ├─► Check Service Worker Cache
       │   ├─► Check IndexedDB
       │   └─► Return cached data
       │
       └─► Stop polling
           └─► Save battery


Reconnection:
┌─────────────┐
│   Browser   │
│ (Reconnect) │
└──────┬──────┘
       │
       ├─► Detect online event
       │   └─► Update isOnline state
       │
       ├─► Process Offline Queue
       │   ├─► For each queued action:
       │   │   ├─► Retry API call
       │   │   ├─► Success → Remove from queue
       │   │   └─► Failure → Keep in queue, retry later
       │   └─► Clear successful items
       │
       ├─► Invalidate stale queries
       │   └─► Refetch fresh data
       │
       └─► Resume polling
           ├─► Notifications
           └─► Messages


Service Worker Cache Strategy:
┌─────────────────────────────────────┐
│  Request                            │
└──────┬──────────────────────────────┘
       │
       ├─► Static Assets (JS, CSS, fonts)
       │   Strategy: Cache First
       │   └─► Check cache → If miss, fetch & cache
       │
       ├─► API Calls (/api/rpc)
       │   Strategy: Network First
       │   ├─► Try network (timeout: 10s)
       │   └─► If fail, check cache
       │
       ├─► Images
       │   Strategy: Cache First
       │   └─► Cache for 30 days
       │
       └─► Videos
           Strategy: Cache First
           └─► Cache for 7 days


IndexedDB Storage:
┌─────────────────────────────────────┐
│  vrss-db                            │
├─────────────────────────────────────┤
│  posts                              │
│    - Recent 50 posts                │
│    - Indexed by createdAt           │
├─────────────────────────────────────┤
│  profiles                           │
│    - Visited profiles               │
│    - Keep for 1 hour                │
├─────────────────────────────────────┤
│  drafts                             │
│    - Unsent posts                   │
│    - Keep until sent                │
└─────────────────────────────────────┘
```

---

## Navigation Structure

### Mobile Navigation

```
┌──────────────────────────────────────────────┐
│             Mobile Header                     │
│  [←] VRSS                  [🔍] [⋮]          │
└──────────────────────────────────────────────┘

             Main Content Area
             (Swipeable pages)

┌──────────────────────────────────────────────┐
│             Bottom Navigation                 │
│                                               │
│   🏠      🔍      ➕      💬(3)    👤        │
│  Home   Search   New   Messages   Me         │
│                                               │
└──────────────────────────────────────────────┘
```

### Desktop Navigation

```
┌──────────────┬──────────────────────────────────────┐
│              │                                      │
│   Sidebar    │         Main Content                 │
│              │                                      │
│  ┌────────┐  │  ┌──────────────────────────────┐   │
│  │ Avatar │  │  │                              │   │
│  └────────┘  │  │    Current Page              │   │
│  @username   │  │    (Home, Profile, etc.)     │   │
│              │  │                              │   │
│  🏠 Home     │  │                              │   │
│  🔍 Search   │  │                              │   │
│  💬 Messages │  │                              │   │
│  🔔 Notifs   │  │                              │   │
│  👤 Profile  │  │                              │   │
│  ⚙️ Settings │  │                              │   │
│              │  │                              │   │
│  [Logout]    │  └──────────────────────────────┘   │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Route Tree

```
/
├─ /login
├─ /register
│
└─ / (Protected)
   ├─ / (Home)
   │  └─ Feed view with tabs
   │
   ├─ /profile/:username
   │  ├─ View profile
   │  └─ /edit (Edit own profile)
   │
   ├─ /messages
   │  ├─ Thread list
   │  └─ /:threadId (Message thread)
   │
   ├─ /notifications
   │  └─ Notification list
   │
   ├─ /search
   │  └─ Search results
   │
   ├─ /discover
   │  └─ Discovery feed
   │
   └─ /settings
      ├─ Account settings
      ├─ Privacy settings
      └─ Storage management
```

---

## Summary

These diagrams illustrate:

1. **Application Architecture**: Overall structure from browser to backend
2. **State Management**: Multi-layered state approach
3. **Component Hierarchy**: Component tree and relationships
4. **Data Flow**: How data moves through the application
5. **File Upload**: Three-phase upload process
6. **Offline Strategy**: Caching and sync mechanisms
7. **Navigation**: Mobile and desktop navigation patterns

Use these diagrams as a reference when implementing features or understanding the system architecture.
