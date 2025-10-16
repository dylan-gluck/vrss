# **Phase 6: Advanced Features** `[duration: 2-3 weeks]` `[priority: P2]`

**Goal:** Implement visual feed algorithm builder, search/discovery, and PWA offline capabilities.

## 6.1 Visual Feed Algorithm Builder `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/component-specifications.md` Section: "Feed Algorithm Builder"
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 5 Section: "Complex Components"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] AlgorithmBuilder render tests
    - [ ] Drag-drop block reordering tests
    - [ ] Block configuration tests
    - [ ] Algorithm preview tests (live feed updates)

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/FeedBuilder/AlgorithmBuilder.tsx`
    - [ ] Create `src/features/feed/components/FeedBuilder/FilterBlock.tsx` (8 block types)
    - [ ] Create `src/features/feed/components/FeedBuilder/BlockLibrary.tsx` (modal to add blocks)
    - [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable`
    - [ ] Implement drag-drop block reordering
    - [ ] Block types: filter-author, filter-type, filter-hashtag, filter-date, sort-popular, sort-recent, sort-random, limit
    - [ ] Visual data flow connectors between blocks
    - [ ] Live preview: Feed updates as algorithm changes
    - [ ] Save/load custom algorithms to feedStore

- [ ] **Validate**
    - [ ] User can add/remove blocks
    - [ ] Drag-drop reordering works
    - [ ] Block configuration UI functional
    - [ ] Preview shows algorithm results
    - [ ] Algorithm saves to backend
    - [ ] Test coverage: 80%+

**Success Criteria:** Visual feed builder functional, users can create custom algorithms

---

## 6.2 Search & Discovery `[duration: 2-3 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Search & Discovery"
    - [ ] Read PRD Section: "F5: Custom Discovery/Search Algorithm"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] SearchBar autocomplete tests
    - [ ] Search results filter tests
    - [ ] DiscoverFeed tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/search/components/SearchBar.tsx` (autocomplete, debounced)
    - [ ] Create `src/features/search/components/SearchResults.tsx` (tabbed: users, posts)
    - [ ] Create `src/features/search/components/DiscoverFeed.tsx`
    - [ ] Create `src/features/search/hooks/useSearch.ts` (debounced 300ms)
    - [ ] Create `src/features/search/hooks/useDiscoverFeed.ts`
    - [ ] Store recent searches in localStorage

- [ ] **Validate**
    - [ ] Search debounces at 300ms
    - [ ] Autocomplete suggests users
    - [ ] Results filter by type (users, posts)
    - [ ] Discover feed uses custom algorithm
    - [ ] Test coverage: 80%+

**Success Criteria:** Search and discover functional

---

## 6.3 PWA Offline Capabilities `[duration: 3-4 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "Offline-First Strategy"
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 6: "PWA Offline Capabilities"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] Service worker caching tests
    - [ ] Offline queue tests (add, process, retry)
    - [ ] IndexedDB storage tests
    - [ ] Online/offline indicator tests

- [ ] **Implement - Service Worker** `[activity: component-development]`
    - [ ] Configure Workbox strategies in `vite.config.ts`
    - [ ] NetworkFirst for API calls (24h cache, 10s network timeout)
    - [ ] CacheFirst for images (30d expiration, 100 entries)
    - [ ] CacheFirst for videos (7d expiration, 20 entries)
    - [ ] Precache critical app shell files

- [ ] **Implement - IndexedDB Storage** `[activity: component-development]`
    - [ ] Install `idb` library (type-safe IndexedDB)
    - [ ] Create `src/lib/utils/storage.ts`
    - [ ] Stores: `posts` (last 50 feed posts), `profiles` (viewed profiles), `drafts` (offline post drafts)
    - [ ] Implement TTL cleanup (30-day expiration)

- [ ] **Implement - Offline Queue** `[activity: component-development]`
    - [ ] Update `offlineStore.ts` with queue processing logic
    - [ ] Detect online/offline: `navigator.onLine` + `window.addEventListener('online')`
    - [ ] Queue failed mutations (CREATE_POST, SEND_MESSAGE, LIKE_POST, etc.)
    - [ ] Process queue on reconnect (exponential backoff, max 3 retries)
    - [ ] Show toast notifications for queue status

- [ ] **Implement - PWA Install Prompt** `[activity: component-development]`
    - [ ] Create `src/lib/hooks/usePWA.ts`
    - [ ] Detect `beforeinstallprompt` event
    - [ ] Show install banner (dismissible)
    - [ ] "Install App" button in settings
    - [ ] iOS Safari install instructions (different flow)

- [ ] **Validate**
    - [ ] App works offline (cached content)
    - [ ] Offline queue syncs when online
    - [ ] IndexedDB stores data correctly
    - [ ] Install prompt shows (Chrome/Edge)
    - [ ] PWA scores 100 on Lighthouse
    - [ ] Test coverage: 75%+

**Success Criteria:** Full offline-first PWA functional, installs on mobile

---
