# Testing Documentation - VRSS Social Platform Feature

**Feature-Specific Testing Strategy and Acceptance Criteria**

This document defines the testing strategy for the VRSS social platform feature. For overall testing infrastructure and patterns, see [../../TESTING.md](../../TESTING.md).

---

## Table of Contents

- [Testing Overview](#testing-overview)
- [Current Test Coverage](#current-test-coverage)
- [Phase-Specific Acceptance Criteria](#phase-specific-acceptance-criteria)
- [Feature Test Scenarios](#feature-test-scenarios)
- [Performance Testing](#performance-testing)
- [Cross-References](#cross-references)

---

## Testing Overview

### Test Philosophy

The VRSS social platform follows a comprehensive testing strategy:

1. **Test-Driven Development (TDD):** Tests written before implementation
2. **Arrange-Act-Assert (AAA):** Consistent test structure
3. **Isolation:** Each test cleans up after itself
4. **Realistic Data:** Builder pattern for flexible test data
5. **Coverage Over Quantity:** Focus on critical paths and edge cases

### Test Distribution

| Layer | Tool | Count | Status | Coverage |
|-------|------|-------|--------|----------|
| **Backend Unit** | Bun Test | 595 | ✅ Passing | Phase 1-4 complete |
| **Frontend Unit** | Vitest | 333 | ✅ Passing | Phase 1-4 complete |
| **E2E** | Playwright | Variable | ⚠️ Disabled in CI | Functional locally |

**Total:** 928+ tests passing

**Reference:** [../../TESTING.md](../../TESTING.md) for complete testing infrastructure documentation.

---

## Current Test Coverage

### Phase 1: Foundation & Infrastructure ✅

**Status:** Complete - All tests passing

**Coverage:**
- Database migrations (28 models, 3 triggers)
- Prisma schema validation
- Docker environment setup
- Monorepo build system (Turbo)

**Test Files:**
- `apps/api/test/setup.ts` - Database connection and environment detection
- `apps/api/test/helpers/database.ts` - Cleanup utilities

### Phase 2: Authentication & Session Management ✅

**Status:** Complete - All tests passing

**Coverage:**
- User registration with Better-auth
- Username-based login (NOT email)
- Session management (7-day cookies, sliding window)
- Password validation (12+ chars, complexity)
- Email verification (implemented, disabled for MVP)
- Session expiration and refresh
- Logout and session cleanup

**Test Files:**
- `apps/api/test/auth/registration.test.ts` (45 tests)
- `apps/api/test/auth/login.test.ts` (38 tests)
- `apps/api/test/auth/logout.test.ts` (12 tests)
- `apps/api/test/auth/email-verification.test.ts` (22 tests)
- `apps/api/test/auth/better-auth-setup.test.ts` (18 tests)
- `apps/web/test/features/auth/LoginForm.test.tsx` (24 tests)
- `apps/web/test/features/auth/RegisterForm.test.tsx` (31 tests)

**Key Test Scenarios:**
- ✅ Register with unique username
- ✅ Username uniqueness validation (case-insensitive)
- ✅ Password strength requirements
- ✅ Login with username (not email)
- ✅ Invalid credentials rejection
- ✅ Suspended account rejection
- ✅ Session token creation and validation
- ✅ Session expiration handling
- ✅ Email verification token flow (disabled)

### Phase 3: Backend API Implementation ✅

**Status:** Complete - All tests passing

**Coverage:**
- RPC architecture (10 routers, ~60 procedures)
- Zod validation for all inputs
- Error codes (1000-1999 range)
- Cursor-based pagination
- Type transformations (BigInt ↔ String)
- Post type mapping (API ↔ Database)

**Test Files:**
- `apps/api/test/rpc/user.test.ts` (52 tests)
- `apps/api/test/rpc/post.test.ts` (74 tests)
- `apps/api/test/rpc/social.test.ts` (48 tests)
- `apps/api/test/rpc/feed.test.ts` (41 tests)
- `apps/api/test/rpc/media.test.ts` (36 tests)
- `apps/api/test/rpc/message.test.ts` (39 tests)
- `apps/api/test/rpc/notification.test.ts` (28 tests)
- `apps/api/test/rpc/discovery.test.ts` (32 tests)
- `apps/api/test/rpc/settings.test.ts` (44 tests)

**Key Test Scenarios:**
- ✅ All RPC procedures tested
- ✅ Input validation with Zod
- ✅ Authorization checks (owner-only, participant-only)
- ✅ Visibility-based access control
- ✅ Pagination (nextCursor, hasMore)
- ✅ Error handling with correct codes
- ✅ Database triggers (friendship, counters, storage)

### Phase 4: Frontend Foundation ✅

**Status:** Complete - All tests passing

**Coverage:**
- React components (Auth UI)
- TanStack Query integration
- Zustand state management (auth, ui, offline stores)
- React Hook Form + Zod validation
- MSW API mocking
- Offline queue with retry logic

**Test Files:**
- `apps/web/test/features/auth/LoginForm.test.tsx` (24 tests)
- `apps/web/test/features/auth/RegisterForm.test.tsx` (31 tests)
- `apps/web/test/features/auth/PasswordStrength.test.tsx` (18 tests)
- `apps/web/test/features/auth/AuthGuard.test.tsx` (14 tests)
- `apps/web/test/lib/store/authStore.test.ts` (22 tests)
- `apps/web/test/lib/store/uiStore.test.ts` (16 tests)
- `apps/web/test/lib/store/offlineStore.test.ts` (28 tests)
- `apps/web/test/lib/api/client.test.ts` (19 tests)

**Key Test Scenarios:**
- ✅ Login form validation and submission
- ✅ Register form validation and submission
- ✅ Password strength indicator
- ✅ Auth guard redirect logic
- ✅ Auth state persistence (localStorage)
- ✅ Offline queue (QueuedAction pattern)
- ✅ API client with MSW mocking
- ✅ Optimistic updates

---

## Phase-Specific Acceptance Criteria

### Phase 5.1: Core Features - Posts & Feeds 🚧

**Status:** In Progress - Backend complete, frontend UI pending

**Must Pass Before Completion:**

#### Post Creation Tests
- [ ] Frontend: Create text post with validation
- [ ] Frontend: Create image post with upload flow
- [ ] Frontend: Create video post with upload flow
- [ ] Frontend: Create song post with upload flow
- [ ] Frontend: Post type selection UI
- [ ] Frontend: Storage quota display and warning
- [ ] Frontend: Upload blocked when quota exceeded
- [ ] Frontend: Upload progress indicator
- [ ] Backend: Already tested ✅ (post.create, media.initiateUpload, media.completeUpload)

#### Feed Display Tests
- [ ] Frontend: Display default "Following" feed
- [ ] Frontend: Post list with pagination (infinite scroll)
- [ ] Frontend: Single post view with comments
- [ ] Frontend: Empty feed state
- [ ] Frontend: Loading states
- [ ] Frontend: Error handling
- [ ] Backend: Already tested ✅ (feed.get with pagination)

#### Post Editing/Deletion Tests
- [ ] Frontend: Edit post content
- [ ] Frontend: Delete post with confirmation
- [ ] Frontend: Soft delete preserves data
- [ ] Frontend: Deleted posts hidden from feeds
- [ ] Backend: Already tested ✅ (post.update, post.delete)

### Phase 5.2: Social Features - Follows, Likes, Comments ⏳

**Status:** Pending - Backend complete, frontend UI pending

**Must Pass Before Completion:**

#### Follow/Unfollow Tests
- [ ] Frontend: Follow button with loading state
- [ ] Frontend: Unfollow button with confirmation
- [ ] Frontend: Follower/following counts update
- [ ] Frontend: Friendship badge (mutual follows)
- [ ] Frontend: Optimistic UI updates
- [ ] Backend: Already tested ✅ (social.follow, social.unfollow, friendship trigger)

#### Like/Unlike Tests
- [ ] Frontend: Like button with optimistic update
- [ ] Frontend: Unlike button
- [ ] Frontend: Like count updates in real-time
- [ ] Frontend: Like state persists across navigation
- [ ] Backend: Already tested ✅ (post.like, post.unlike, counter triggers)

#### Comment Tests
- [ ] Frontend: Create top-level comment
- [ ] Frontend: Create nested reply
- [ ] Frontend: Comment list with pagination
- [ ] Frontend: Nested comment tree rendering
- [ ] Frontend: Comment count updates
- [ ] Frontend: Delete own comment
- [ ] Backend: Already tested ✅ (post.comment, post.getComments, counter triggers)

#### Discovery Feed Tests
- [ ] Frontend: Display discovery feed (2-degree network)
- [ ] Frontend: User search with results
- [ ] Frontend: Post search with results
- [ ] Frontend: Empty search results state
- [ ] Backend: Already tested ✅ (discovery.getDiscoverFeed, discovery.searchUsers, discovery.searchPosts)

### Phase 5.3: Advanced Features - Custom Feeds, Profile Customization ⏳

**Status:** Pending - Backend complete, frontend UI pending

**Must Pass Before Completion:**

#### Custom Feed Builder Tests
- [ ] Frontend: Visual algorithm builder UI (Apple Shortcuts-style)
- [ ] Frontend: Add filter blocks (post type, author, tag, date range, engagement)
- [ ] Frontend: Logical operators (AND, OR, NOT)
- [ ] Frontend: Live feed preview
- [ ] Frontend: Save custom feed
- [ ] Frontend: Switch between feeds
- [ ] Frontend: Edit existing feed
- [ ] Frontend: Delete feed with confirmation
- [ ] Backend: Already tested ✅ (feed.create, feed.update, feed.delete)

#### Profile Customization Tests
- [ ] Frontend: Background image/color selector
- [ ] Frontend: Font and color picker
- [ ] Frontend: Music selector (background music)
- [ ] Frontend: Add/remove/reorder profile sections
- [ ] Frontend: Section type selection (feed, gallery, links, text, image, video, etc.)
- [ ] Frontend: Section visibility toggle
- [ ] Frontend: Mobile responsive rendering
- [ ] Frontend: Performance guardrails (image size, load time)
- [ ] Backend: Already tested ✅ (user.updateStyle, user.updateSections, user.getSections)

#### Messaging Tests
- [ ] Frontend: Inbox view with conversations
- [ ] Frontend: Message thread UI
- [ ] Frontend: Send message
- [ ] Frontend: Read status indicators
- [ ] Frontend: Message pagination
- [ ] Frontend: Delete conversation with confirmation
- [ ] Backend: Already tested ✅ (message.sendMessage, message.getConversations, message.getMessages, message.markAsRead, message.deleteConversation)

#### Notifications Tests
- [ ] Frontend: Notification center UI
- [ ] Frontend: Unread badge count
- [ ] Frontend: Mark as read (single and bulk)
- [ ] Frontend: Delete notification
- [ ] Frontend: Notification item click (navigate to post/comment/user)
- [ ] Backend: Auto-create notifications on actions (like, comment, follow)
- [ ] Backend: Already tested ✅ (notification.getNotifications, notification.markAsRead, notification.deleteNotification)

#### Settings Tests
- [ ] Frontend: Account settings page
- [ ] Frontend: Update username
- [ ] Frontend: Update email (resets emailVerified)
- [ ] Frontend: Change password
- [ ] Frontend: Privacy settings (profile visibility)
- [ ] Frontend: Storage usage display with progress bar
- [ ] Frontend: Delete account flow with confirmation
- [ ] Frontend: Export data (GDPR)
- [ ] Backend: Already tested ✅ (settings.getAccountSettings, settings.updateAccount, settings.updatePrivacy, settings.deleteAccount, settings.exportData)

---

## Feature Test Scenarios

### User Registration and Login

**Scenario 1: New User Registration**
```
Given I am on the registration page
When I enter username "testuser", email "test@example.com", password "TestPassword123!"
And I submit the registration form
Then my account is created
And I receive a success message
And I am NOT automatically logged in (email verification disabled but future-ready)
```

**Scenario 2: Username Login**
```
Given I have a registered account with username "testuser"
When I enter username "testuser" and password "TestPassword123!"
And I submit the login form
Then I am logged in
And I receive a session cookie (7-day expiry)
And I am redirected to the home page
```

**Scenario 3: Invalid Credentials**
```
Given I have a registered account with username "testuser"
When I enter username "testuser" and password "WrongPassword123!"
And I submit the login form
Then I see an error "Invalid username or password"
And I am NOT logged in
```

**Scenario 4: Case-Insensitive Username Login**
```
Given I registered with username "TestUser"
When I login with username "testuser" (lowercase)
And I enter the correct password
Then I am successfully logged in
```

### Creating Posts

**Scenario 1: Create Text Post**
```
Given I am logged in
When I create a text post with content "Hello world!"
And I set visibility to "public"
And I submit the post
Then the post is created with type "text_short"
And I see the post in my feed
And the post has 0 likes, 0 comments, 0 reposts
```

**Scenario 2: Create Image Post with Upload**
```
Given I am logged in
When I select post type "image"
And I upload an image file (5MB)
And I add caption "Check out this photo"
And I submit the post
Then the image is uploaded to S3 with presigned URL
And my storage usage increases by 5MB
And the post is created with type "image"
And I see the post with image in my feed
```

**Scenario 3: Upload Blocked by Storage Quota**
```
Given I am logged in
And I have used 48MB of my 50MB free quota
When I attempt to upload a 5MB image
Then I see an error "Storage quota exceeded"
And the upload is blocked
And I see a prompt to upgrade storage
```

**Scenario 4: Create Post with Multiple Media (Gallery)**
```
Given I am logged in
When I upload 3 images (2MB, 3MB, 4MB)
And I create a post with these images
Then a gallery post is created with type "image_gallery"
And the images are displayed in order (displayOrder)
And my storage usage increases by 9MB
```

### Liking and Commenting on Posts

**Scenario 1: Like a Post**
```
Given I am logged in
And there is a public post by another user
When I click the like button
Then the post is liked
And the like count increases by 1 (database trigger)
And the UI updates optimistically
```

**Scenario 2: Unlike a Post**
```
Given I have liked a post
When I click the unlike button
Then the like is removed
And the like count decreases by 1 (database trigger)
And the UI updates optimistically
```

**Scenario 3: Create Top-Level Comment**
```
Given I am viewing a post
When I write a comment "Great post!"
And I submit the comment
Then the comment is created
And the post's comment count increases by 1 (database trigger)
And I see my comment at the top of the comment list
```

**Scenario 4: Create Nested Reply**
```
Given there is a comment on a post
When I click "Reply" on the comment
And I write "Thanks for the comment!"
And I submit the reply
Then a nested comment is created (parentCommentId set)
And the parent comment's reply count increases by 1
And I see my reply indented under the parent comment
```

### Following Users and Creating Friendships

**Scenario 1: Follow a User**
```
Given I am logged in
And there is another user "alice"
When I click "Follow" on alice's profile
Then a UserFollow record is created (follower: me, following: alice)
And alice's follower count increases
And my following count increases
```

**Scenario 2: Mutual Follow Creates Friendship**
```
Given I follow user "alice"
When alice follows me back
Then a Friendship record is automatically created (database trigger)
And we both see "Friends" badge on each other's profiles
And we appear in each other's friends list
```

**Scenario 3: Unfollow Removes Friendship**
```
Given I am friends with "alice" (mutual follow)
When I unfollow alice
Then the UserFollow record is deleted
And the Friendship record is deleted
And alice is removed from my friends list
And I am removed from alice's friends list
```

### Custom Feeds and Discovery

**Scenario 1: View Default "Following" Feed**
```
Given I am logged in
And I follow users "alice", "bob", "charlie"
When I view my home feed
Then I see posts from alice, bob, and charlie
And posts are ordered by createdAt DESC (chronological)
And I can paginate through posts with cursor-based pagination
```

**Scenario 2: Create Custom Feed with Filters**
```
Given I am logged in
When I create a new feed "Music Only"
And I add a filter: post type = "song"
And I add a filter: from followed accounts
And I save the feed
Then the feed is created with my algorithm config
And I can switch to the "Music Only" feed
And I see only song posts from followed accounts
```

**Scenario 3: Discover New Content (2-Degree Network)**
```
Given I am logged in
And my friends have friends I don't follow
When I view the discovery feed
Then I see public posts from friends-of-friends
And posts are sorted by engagement (likesCount DESC) + recency
And I can find new users to follow
```

**Scenario 4: Search for Users**
```
Given there are users "alice", "Alice123", "bob"
When I search for "alice"
Then I see users "alice" and "Alice123" (case-insensitive)
And I see their display names, bios, and avatars
And I can click to view their profiles
```

**Scenario 5: Search for Posts**
```
Given there are posts containing "typescript" in content
When I search for "typescript"
Then I see all public posts mentioning typescript
And results are sorted by engagement + recency
And I can click to view individual posts
```

### Direct Messaging

**Scenario 1: Send First Message to User**
```
Given I am logged in
When I send a message "Hi!" to user "alice"
Then a Conversation is created with participants [me, alice] (ordered IDs)
And a Message is created in the conversation
And I see the message in my inbox
And alice sees the message in her inbox
And I am in readBy array (sender auto-marked as read)
```

**Scenario 2: Continue Conversation**
```
Given I have a conversation with "alice"
When alice sends me a message "Hello!"
Then the message is added to the conversation
And the conversation's lastMessageAt is updated
And the conversation moves to the top of my inbox
And I see an unread badge
```

**Scenario 3: Mark Message as Read**
```
Given alice sent me a message
And I have not read it yet
When I open the conversation
And I mark the message as read
Then my userId is added to the message's readBy array
And the unread count decreases
And alice can see "Read" status
```

### Notifications

**Scenario 1: Receive Notification on New Follower**
```
Given I am logged in
When user "alice" follows me
Then a notification is created (type: follow, actor: alice)
And I see an unread badge on the notification icon
And the notification says "alice followed you"
And I can click to view alice's profile
```

**Scenario 2: Receive Notification on Post Like**
```
Given I created a post
When user "bob" likes my post
Then a notification is created (type: like, actor: bob, postId: my post)
And I see "bob liked your post"
And I can click to view the post
```

**Scenario 3: Receive Notification on Comment**
```
Given I created a post
When user "charlie" comments "Nice post!"
Then a notification is created (type: comment, actor: charlie, postId: my post, commentId: charlie's comment)
And I see "charlie commented on your post"
And I can click to view the post with comments
```

**Scenario 4: Mark Notifications as Read**
```
Given I have 5 unread notifications
When I view the notification center
And I click "Mark all as read"
Then all 5 notifications are marked as read
And the unread badge disappears
```

### Account Settings and Management

**Scenario 1: Change Username**
```
Given I am logged in with username "testuser"
When I navigate to account settings
And I change my username to "newusername"
And I save the changes
Then my username is updated (case-insensitive unique check)
And I can login with "newusername"
And my old username "testuser" becomes available
```

**Scenario 2: Change Password**
```
Given I am logged in
When I navigate to account settings
And I enter current password "OldPassword123!"
And I enter new password "NewPassword456!"
And I save the changes
Then my password is updated in Account.password (bcrypt hash)
And I can login with the new password
And the old password no longer works
```

**Scenario 3: View Storage Usage**
```
Given I have uploaded 35MB of media
When I navigate to account settings
Then I see "35MB / 50MB used (70%)"
And I see a progress bar showing 70% full
And I see a breakdown (images: 20MB, videos: 15MB, audio: 0MB)
```

**Scenario 4: Delete Account**
```
Given I am logged in
When I navigate to account settings
And I click "Delete Account"
And I enter my password for confirmation
And I confirm deletion
Then my User.status is set to "deleted"
And my User.deletedAt is set to current timestamp
And my username remains reserved
And my data is preserved for 30-day recovery period
And I am logged out
```

**Scenario 5: Export Data (GDPR)**
```
Given I am logged in
When I navigate to account settings
And I click "Export My Data"
Then I receive a JSON file containing:
- My user profile
- All my posts and comments
- All my interactions (likes, follows)
- All my friendships
- All my messages
- My privacy settings
And the export is GDPR-compliant
```

---

## Performance Testing

### Load Testing Criteria

**Post Feed Performance:**
- Target: Load 20 posts in <500ms
- Pagination: Next page in <300ms
- Metric: p95 latency

**User Search Performance:**
- Target: Search results in <200ms
- Metric: p95 latency
- Case-insensitive LIKE query optimized with index

**Custom Feed Execution Performance:**
- Target: Feed with <5 filters executes in <1s
- Target: Feed with 5-10 filters executes in <2s
- Warning: Feeds with >10 filters may be slow
- Metric: p95 latency

**Discovery Feed Performance:**
- Target: 2-degree network query in <800ms
- Uses CTE (Common Table Expression) for efficiency
- Metric: p95 latency

**Media Upload Performance:**
- Target: Presigned URL generation in <100ms
- Target: S3 upload completion check in <200ms
- Metric: p95 latency

### Stress Testing Scenarios

**Scenario 1: Concurrent Post Creation**
```
Given 100 users are online
When they all create posts simultaneously
Then all posts are created successfully
And storage quotas are updated correctly (FOR UPDATE lock)
And no race conditions occur
```

**Scenario 2: High Engagement on Popular Post**
```
Given a post has 10,000 likes
When 100 users like/unlike simultaneously
Then the likesCount is updated correctly by triggers
And no lost updates occur
```

**Scenario 3: Feed Algorithm Complexity**
```
Given a user creates a feed with 10 filters
When the feed is executed with 1,000 matching posts
Then the feed loads within 2 seconds
And pagination works correctly
```

---

## Cross-References

**Overall Testing Infrastructure:** [../../TESTING.md](../../TESTING.md)
**API Documentation:** [../../API.md](../../API.md) - RPC procedures and error codes
**Data Model:** [DATA_MODEL.md](./DATA_MODEL.md) - Feature-specific models
**Data Model (Complete):** [../../DATA_MODEL.md](../../DATA_MODEL.md) - All 28 models, triggers, indexes
**Authentication:** [../../AUTHENTICATION.md](../../AUTHENTICATION.md) - Auth flows and security
**Product Requirements:** [PRD.md](./PRD.md) - Feature specifications and acceptance criteria

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Phase Status:** Phase 4 Complete, Phase 5.1 In Progress
**Test Status:** 928 tests passing (595 backend, 333 frontend)
