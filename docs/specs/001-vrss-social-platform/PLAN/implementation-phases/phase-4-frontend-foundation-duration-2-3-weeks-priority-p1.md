# **Phase 4: Frontend Foundation** `[duration: 2-3 weeks]` `[priority: P1]`

**Goal:** Build React PWA with core UI, state management, routing, and authentication.

## 4.1 PWA Setup & Core UI `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` (PWA design, service worker strategy)
    - [ ] Read `docs/frontend-architecture.md` Phase 1 & 2
    - [ ] Read SDD Section: "Frontend PWA" directory structure

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] PWA manifest validation test
    - [ ] Service worker registration test
    - [ ] Layout component render tests
    - [ ] Theme switching test

- [ ] **Implement - PWA Foundation** `[activity: component-development]`
    - [ ] Initialize Vite + React + TypeScript project
    - [ ] Install vite-plugin-pwa and configure
    - [ ] Create `public/manifest.json` (PWA metadata, icons)
    - [ ] Configure service worker (Workbox strategies)
    - [ ] Set up environment variables (`.env.local`, `.env.production`)

- [ ] **Implement - Shadcn-ui & Tailwind** `[activity: component-development]`
    - [ ] Run `npx shadcn-ui@latest init`
    - [ ] Install core components:
      ```bash
      # Core components (already listed)
      npx shadcn-ui@latest add button card input label dialog toast avatar badge

      # Additional components needed
      npx shadcn-ui@latest add select checkbox radio-group switch
      npx shadcn-ui@latest add popover tooltip separator scroll-area
      npx shadcn-ui@latest add sheet skeleton progress tabs
      npx shadcn-ui@latest add dropdown-menu alert alert-dialog
      npx shadcn-ui@latest add form textarea slider toggle
      ```
    - [ ] Configure Tailwind CSS (`tailwind.config.js`)
    - [ ] Create `src/styles/globals.css` (CSS variables for light/dark themes)

- [ ] **Implement - Layout Components** `[activity: component-development]`
    - [ ] Create `src/components/layout/AppShell.tsx` (main wrapper)
    - [ ] Create `src/components/layout/NavBar.tsx` (desktop sidebar)
    - [ ] Create `src/components/layout/BottomNav.tsx` (mobile bottom nav)
    - [ ] Create `src/components/layout/MobileHeader.tsx`
    - [ ] Implement responsive breakpoints (640px, 768px, 1024px)

- [ ] **Validate**
    - [ ] PWA installs on Chrome/Edge
    - [ ] Service worker caches API responses
    - [ ] Layout switches mobile/desktop at 768px
    - [ ] Theme toggle works (light/dark)
    - [ ] Test coverage: 80%+

**Success Criteria:** React PWA running, responsive layout, service worker caching

---

## 4.2 State Management Setup `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "State Management Layers"
    - [ ] Read `docs/frontend-data-models.md` (Zustand stores, TanStack Query patterns)

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] AuthStore persistence test (localStorage)
    - [ ] OfflineStore queue test (add, process, retry)
    - [ ] TanStack Query cache test (stale time, refetch)

- [ ] **Implement - TanStack Query** `[activity: component-development]`
    - [ ] Install `@tanstack/react-query`
    - [ ] Create `src/lib/queryClient.ts` (configure stale time, gc time)
    - [ ] Wrap app with `QueryClientProvider` in `src/main.tsx`

- [ ] **Implement - Zustand Stores** `[activity: component-development]`
    - [ ] Install `zustand`
    - [ ] Create `src/stores/authStore.ts` (user, token, isAuthenticated, persist to localStorage)
    - [ ] Create `src/stores/uiStore.ts` (theme, sidebarOpen, activeModal, notifications)
    - [ ] Create `src/stores/offlineStore.ts` (isOnline, queue, addToQueue, processQueue)

- [ ] **Validate**
    - [ ] AuthStore persists across page refresh
    - [ ] OfflineStore queues actions when offline
    - [ ] TanStack Query caches API responses
    - [ ] Test coverage: 85%+

**Success Criteria:** State management configured, stores functional

---

## 4.3 RPC Client & API Integration `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "API Client Layer"
    - [ ] Read `packages/api-contracts/src/` (type contracts for all procedures)

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] RPC client request test (POST /api/rpc)
    - [ ] Auth token attachment test (Bearer header)
    - [ ] Error handling test (401, 403, 500)
    - [ ] Offline queue test (add mutation to queue when offline)

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/lib/api/client.ts` (RPC client with fetch wrapper)
    - [ ] Implement request builder (serialize procedure + input)
    - [ ] Implement response parser (deserialize data, throw on error)
    - [ ] Attach auth token from AuthStore (Bearer header or cookie)
    - [ ] Create TanStack Query hooks in `src/lib/api/hooks/`
    - [ ] Generate hooks for each procedure (useLogin, useCreatePost, useFeed, etc.)
    - [ ] Integrate offline queue (catch network errors, add to OfflineStore)

- [ ] **Validate**
    - [ ] RPC client calls backend successfully
    - [ ] Auth token attached to requests
    - [ ] Errors handled correctly (toast notifications)
    - [ ] Offline queue captures failed mutations
    - [ ] Test coverage: 90%+

**Success Criteria:** Type-safe RPC client functional, API calls work, offline queue ready

---

## 4.4 Authentication UI `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Authentication Module"
    - [ ] Read PRD Section: "F1: User Authentication and Registration"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] LoginForm component tests (render, validation, submit)
    - [ ] RegisterForm component tests (password strength, duplicate username)
    - [ ] Auth flow integration tests (login → redirect, logout → redirect)
    - [ ] Email verification UI tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/auth/components/LoginForm.tsx`
    - [ ] Create `src/features/auth/components/RegisterForm.tsx`
    - [ ] Create `src/features/auth/components/AuthGuard.tsx` (route protection)
    - [ ] Create `src/features/auth/hooks/useAuth.ts` (login, register, logout mutations)
    - [ ] Create `src/pages/auth/LoginPage.tsx`
    - [ ] Create `src/pages/auth/RegisterPage.tsx`
    - [ ] Install React Hook Form for form handling
    - [ ] Add Zod validation (email, password strength, username format)
    - [ ] Implement password strength indicator
    - [ ] Handle email verification flow (show "check your email" message)

- [ ] **Validate**
    - [ ] User can register and receive verification email
    - [ ] User can login after email verification
    - [ ] Protected routes redirect to login
    - [ ] Logout clears session and redirects
    - [ ] Test coverage: 90%+

**Success Criteria:** Complete auth UI functional, users can register/login/logout

---
