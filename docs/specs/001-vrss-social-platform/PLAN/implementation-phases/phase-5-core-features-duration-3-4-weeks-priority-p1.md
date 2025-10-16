# **Phase 5: Core Features** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement feed system, profile display/editing, messaging, and notifications.

## 5.1 Feed System `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Feed System"
    - [ ] Read `docs/component-specifications.md` Section: "Feed Components"
    - [ ] Read PRD Section: "F4: Custom Feed Builder"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] FeedView infinite scroll tests
    - [ ] PostCard render tests (all post types: text, image, video, song)
    - [ ] CreatePost component tests
    - [ ] Like/bookmark optimistic update tests

- [ ] **Implement - Feed Display** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/FeedView.tsx` (infinite scroll with TanStack Query)
    - [ ] Create `src/features/feed/components/PostCard/` (container + type-specific renderers)
    - [ ] Install `@tanstack/react-virtual` for virtual scrolling (>100 posts)
    - [ ] Implement optimistic updates for like/bookmark (TanStack Query mutations)
    - [ ] Create `src/features/feed/hooks/useFeed.ts` (infinite query)
    - [ ] Create `src/features/feed/hooks/useLikePost.ts` (optimistic mutation)

- [ ] **Implement - Post Creation** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/CreatePost/PostComposer.tsx`
    - [ ] Create `src/features/feed/components/CreatePost/MediaUpload.tsx` (drag-drop)
    - [ ] Implement post type selector (text, image, video, song)
    - [ ] Install `react-dropzone` for file upload
    - [ ] Implement two-phase upload: initiate → upload to S3 → complete
    - [ ] Show upload progress bar
    - [ ] Queue failed posts in OfflineStore

- [ ] **Validate**
    - [ ] Feed loads with pagination
    - [ ] Infinite scroll works smoothly
    - [ ] User can create posts (all types)
    - [ ] Like/bookmark updates instantly (optimistic)
    - [ ] Virtual scrolling performs well (1000+ posts)
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can view feed, create posts, like/bookmark with optimistic UI

---

## 5.2 Profile Display & Editing `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/component-specifications.md` Section: "Profile Editor Components"
    - [ ] Read PRD Section: "F2: Customizable User Profiles"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] ProfileView render tests (custom styles, sections)
    - [ ] ProfileStyleEditor tests (background, colors, fonts)
    - [ ] SectionManager tests (add, remove, reorder)
    - [ ] Profile visibility tests

- [ ] **Implement - Profile Display** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileView.tsx`
    - [ ] Create `src/features/profile/components/ProfileHeader.tsx` (avatar, bio, stats)
    - [ ] Create `src/features/profile/components/ProfileSection.tsx` (render different section types)
    - [ ] Render custom styles (background, colors, fonts) from JSONB
    - [ ] Implement background music player (if configured)

- [ ] **Implement - Profile Style Editor** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileStyleEditor/`
    - [ ] Create `BackgroundPicker.tsx` (color, gradient, image upload)
    - [ ] Create `ColorPicker.tsx` (color harmony, contrast checker for WCAG AA)
    - [ ] Create `FontSelector.tsx` (font family, sizes)
    - [ ] Create `MusicSelector.tsx` (background music URL, autoplay)
    - [ ] Real-time preview of style changes

- [ ] **Implement - Section Manager** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileLayoutEditor/`
    - [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable` for drag-drop
    - [ ] Create `SectionManager.tsx` (list sections, add/remove/reorder)
    - [ ] Implement drag-drop reordering
    - [ ] Section types: feed, gallery, links, text, image, video, friends

- [ ] **Validate**
    - [ ] Profile loads with custom styles
    - [ ] User can edit styles (background, colors, fonts)
    - [ ] Contrast checker validates accessibility
    - [ ] User can add/remove/reorder sections
    - [ ] Drag-drop works smoothly
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can view and fully customize profiles

---

## 5.3 Messaging `[duration: 3-4 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Messaging"
    - [ ] Read PRD Section: "F7: Direct Messaging"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] MessageList render tests
    - [ ] MessageThread tests (infinite scroll, real-time updates)
    - [ ] MessageInput tests (send, drafts)
    - [ ] Typing indicator tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/messages/components/MessageList.tsx` (inbox view)
    - [ ] Create `src/features/messages/components/MessageThread.tsx` (conversation)
    - [ ] Create `src/features/messages/components/MessageInput.tsx` (compose)
    - [ ] Create `src/features/messages/hooks/useThreads.ts` (polling 30s)
    - [ ] Create `src/features/messages/hooks/useMessages.ts` (infinite messages, polling 10s)
    - [ ] Create `src/features/messages/hooks/useSendMessage.ts` (optimistic mutation)
    - [ ] Store message drafts in messageStore (Zustand)
    - [ ] Implement typing indicators

- [ ] **Validate**
    - [ ] Messages load with pagination
    - [ ] Real-time updates via polling
    - [ ] Typing indicators work
    - [ ] Message drafts persist
    - [ ] Optimistic message sending
    - [ ] Test coverage: 80%+

**Success Criteria:** Users can send/receive messages with real-time updates

---

## 5.4 Notifications `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Notifications"
    - [ ] Read PRD Section: "F8: Notifications"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] NotificationList render tests
    - [ ] Unread count badge tests
    - [ ] Mark as read tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/notifications/components/NotificationList.tsx`
    - [ ] Create `src/features/notifications/components/NotificationItem.tsx`
    - [ ] Create `src/features/notifications/components/NotificationBadge.tsx` (unread count)
    - [ ] Create `src/features/notifications/hooks/useNotifications.ts` (polling 30s)
    - [ ] Create `src/features/notifications/hooks/useUnreadCount.ts`
    - [ ] Implement navigation to target (post, profile, etc.) on click

- [ ] **Validate**
    - [ ] Notifications poll every 30s
    - [ ] Unread count badge displays correctly
    - [ ] Click marks as read and navigates
    - [ ] Test coverage: 80%+

**Success Criteria:** Users receive notifications for likes, comments, follows

---
