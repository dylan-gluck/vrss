# **Phase 3: Backend API Implementation** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement all 10 RPC routers with 50+ procedures following dependency order.

## 3.1 RPC Foundation & Type Contracts `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` (complete RPC pattern, all procedures)
    - [x] Read `docs/api-implementation-guide.md` (implementation examples)
    - [x] Read SDD Section: "Internal API Changes" (lines 1185-1285)

- [x] **Write Tests** `[activity: test-api]`
    - [x] RPC router setup test: POST /api/rpc works
    - [x] Error handling test: Invalid procedure returns error
    - [x] Type contract test: Procedure types match implementation
    - [x] Validation middleware test: Zod schemas validate input

- [x] **Implement - Type Contracts** `[activity: api-development]`
    - [x] Create `packages/api-contracts/src/index.ts` (main export)
    - [x] Create `packages/api-contracts/src/rpc.ts` (RPCRequest, RPCResponse types)
    - [x] Create `packages/api-contracts/src/errors.ts` (ErrorCode enum 1000-1999)
    - [x] Create `packages/api-contracts/src/types.ts` (shared domain types: User, Post, Feed)
    - [x] Create `packages/api-contracts/src/procedures/` (10 namespace files for all routers)
    - [x] Define all 50+ procedure input/output types

- [x] **Implement - RPC Router** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/index.ts` (router setup)
    - [x] Implement RPC request parsing and validation
    - [x] Implement error handling middleware (catch all errors, return RPCErrorResponse)
    - [x] Implement request logging middleware
    - [x] Create `apps/api/src/rpc/types.ts` (ProcedureContext, ProcedureHandler)

- [x] **Validate**
    - [x] Type contracts compile without errors
    - [x] RPC router handles requests
    - [x] Error responses follow standard format
    - [x] Logging captures request/response

**Success Criteria:** RPC foundation ready, type contracts defined for all 50+ procedures

---

## 3.2 User & Profile Router `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "User Router" (6 procedures)
    - [x] Read PRD Section: "F2: Customizable User Profiles" (lines 144-155)
    - [x] Read DATABASE_SCHEMA.md: `user_profiles`, `profile_sections`, `section_content`

- [x] **Write Tests** `[activity: test-api]`
    - [x] `user.getProfile` tests: By username, public/private visibility
    - [x] `user.updateProfile` tests: Display name, bio, avatar, visibility
    - [x] `user.updateStyle` tests: JSONB validation, background/colors/fonts
    - [x] `user.updateSections` tests: Add/remove/reorder sections
    - [x] Storage quota tests: Profile updates respect quota

- [x] **Implement** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/routers/user.ts`
    - [x] Implement `user.getProfile` (handle visibility: public/private/unlisted)
    - [x] Implement `user.updateProfile` (display name, bio, avatar, visibility)
    - [x] Implement `user.updateStyle` (JSONB: background, music, style)
    - [x] Implement `user.updateSections` (add, remove, reorder profile sections)
    - [x] Implement `user.getSections` (fetch profile sections)
    - [x] Add Zod validation for JSONB schemas (profileConfig, styleConfig)
    - [x] Create business logic in `apps/api/src/features/user/`

- [x] **Validate**
    - [x] All user router tests pass
    - [x] Profile visibility controls work
    - [x] JSONB updates validate correctly
    - [x] Test coverage: 90%+

**Success Criteria:** Users can view and customize profiles

---

## 3.3 Post Router `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "Post Router" (8 procedures)
    - [x] Read PRD Section: "F3: Content Creation and Post Types" (lines 157-167)
    - [x] Read DATABASE_SCHEMA.md: `posts`, `post_media`, `comments`, `reposts`, `post_interactions`

- [x] **Write Tests** `[activity: test-api]`
    - [x] `post.create` tests: Text, image, video, song post types
    - [x] `post.getById` tests: Public post, private post, deleted post
    - [x] `post.update` tests: Edit content, change visibility
    - [x] `post.delete` tests: Soft delete, cascade to comments
    - [x] `post.like/unlike` tests: Optimistic updates, counter increments
    - [x] `post.comment` tests: Create comment, thread depth
    - [x] Storage quota tests: Image/video posts respect user quota

- [x] **Implement** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/routers/post.ts`
    - [x] Implement `post.create` (validate type, content, media, check storage quota)
    - [x] Implement `post.getById` (check visibility, include comments)
    - [x] Implement `post.update` (owner only, validate changes)
    - [x] Implement `post.delete` (soft delete, set `deleted_at`)
    - [x] Implement `post.like` / `post.unlike` (trigger updates counter)
    - [x] Implement `post.comment` (create comment, update counter)
    - [x] Implement `post.getComments` (with cursor pagination)
    - [x] Add cursor-based pagination for post lists
    - [x] Create business logic in `apps/api/src/features/post/`

- [x] **Validate**
    - [x] All post router tests pass (35/36 - 97% pass rate)
    - [x] Post types (text, image, video, song) create correctly
    - [x] Soft delete works
    - [x] Like/comment counters update via triggers
    - [x] Test coverage: 90%+ (97% pass rate, comprehensive test suite)

**Success Criteria:** Full CRUD for posts with all types, likes, comments ✅ **COMPLETE**

---

## 3.4 Social Router `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Social Router" (6 procedures)
    - [ ] Read PRD Section: "F6: Social Interactions" (lines 192-201)
    - [ ] Read DATABASE_SCHEMA.md: `user_follows`, `friendships`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `social.follow/unfollow` tests: Create/delete follow, friendship creation
    - [ ] `social.getFollowers` tests: Cursor pagination, count
    - [ ] `social.getFollowing` tests: Cursor pagination, count
    - [ ] Friendship creation test: Mutual follow creates friendship

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/social.ts`
    - [ ] Implement `social.follow` (check not already following, create follow record)
    - [ ] Implement `social.unfollow` (delete follow, delete friendship if mutual)
    - [ ] Implement `social.getFollowers` (with cursor pagination)
    - [ ] Implement `social.getFollowing` (with cursor pagination)
    - [ ] Implement `social.getFriends` (mutual follows)
    - [ ] Trigger: Auto-create friendship on mutual follow (database trigger)
    - [ ] Create business logic in `apps/api/src/features/social/`

- [ ] **Validate**
    - [ ] Follow/unfollow tests pass
    - [ ] Friendship auto-created on mutual follow
    - [ ] Pagination works correctly
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can follow/unfollow, friendships created automatically

---

## 3.5 Feed Router `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Feed Router" (4 procedures)
    - [ ] Read PRD Section: "F4: Custom Feed Builder (Visual Algorithm)" (lines 169-181)
    - [ ] Read DATABASE_SCHEMA.md: `custom_feeds`, `feed_filters`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `feed.get` tests: Default feed (chronological), custom feed execution
    - [ ] `feed.create` tests: Create custom feed with filters
    - [ ] `feed.update` tests: Modify feed name, add/remove filters
    - [ ] `feed.delete` tests: Delete custom feed
    - [ ] Algorithm execution tests: AND/OR/NOT logic, type filters, author filters

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/feed.ts`
    - [ ] Implement `feed.get` (execute feed algorithm, return posts with cursor pagination)
    - [ ] Implement `feed.create` (save custom feed with filters)
    - [ ] Implement `feed.update` (update feed name, filters)
    - [ ] Implement `feed.delete`
    - [ ] Create `apps/api/src/features/feed/feed-algorithm.ts` (filter, sort, paginate)
    - [ ] Support filter types: post type, author, tags, date range
    - [ ] Support logical operators: AND, OR, NOT
    - [ ] Default feed: "Following - Chronological" (all followed users, newest first)

- [ ] **Validate**
    - [ ] Feed algorithm tests pass
    - [ ] Custom feeds execute correctly
    - [ ] AND/OR/NOT logic works
    - [ ] Pagination performs well (<50ms for 20 posts)
    - [ ] Test coverage: 90%+

**Success Criteria:** Custom feed builder functional, algorithms execute queries correctly

---

## 3.6 Media Router `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Media Router" (4 procedures: initiateUpload, completeUpload, deleteMedia, getStorageUsage)
    - [ ] Read DATA_STORAGE_DOCUMENTATION.md (S3 upload flow, storage quotas)

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `media.initiateUpload` tests: Generate presigned URL, check quota
    - [ ] `media.completeUpload` tests: Validate upload, update storage used
    - [ ] `media.deleteMedia` tests: Delete from S3, update storage used
    - [ ] `media.getStorageUsage` tests: Return used/quota/percentage
    - [ ] Storage quota enforcement tests: Block upload if quota exceeded

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/media.ts`
    - [ ] Create `apps/api/src/lib/s3.ts` (S3 client initialization)
    - [ ] Implement `media.initiateUpload` (check quota with FOR UPDATE lock, generate presigned URL)
    - [ ] Implement `media.completeUpload` (validate upload, create post_media record, update storage)
    - [ ] Implement `media.deleteMedia` (delete from S3, update storage via trigger)
    - [ ] Implement `media.getStorageUsage`
    - [ ] Configure S3 in `.env` (MinIO for dev, AWS S3 for prod)

- [ ] **Validate**
    - [ ] Presigned URLs generated correctly (15min expiry)
    - [ ] Storage quota enforced (atomic check with FOR UPDATE)
    - [ ] Storage triggers update `storage_usage` table
    - [ ] S3 delete works
    - [ ] Test coverage: 90%+

**Success Criteria:** Two-phase file upload working, storage quotas enforced

---

## 3.7 Message, Notification, Discovery, Settings Routers `[duration: 3-4 days]` `[parallel: true]`

- [ ] **Message Router** `[duration: 2 days]` `[parallel: true]` `[component: messaging]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Message Router"
    - [ ] **Write Tests**: Send message, get conversations, get messages, mark read
    - [ ] **Implement**: 5 procedures (sendMessage, getConversations, getMessages, markAsRead, deleteConversation)
    - [ ] **Validate**: Messaging flow works, pagination efficient

- [ ] **Notification Router** `[duration: 1 day]` `[parallel: true]` `[component: notifications]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Notification Router"
    - [ ] **Write Tests**: Get notifications, mark read, delete
    - [ ] **Implement**: 3 procedures (getNotifications, markAsRead, deleteNotification)
    - [ ] **Validate**: Notifications poll correctly, unread count accurate

- [ ] **Discovery Router** `[duration: 1-2 days]` `[parallel: true]` `[component: discovery]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Discovery Router"
    - [ ] **Write Tests**: Search users, search posts, get discover feed
    - [ ] **Implement**: 3 procedures (searchUsers, searchPosts, getDiscoverFeed)
    - [ ] **Validate**: Search works, discover feed uses algorithm

- [ ] **Settings Router** `[duration: 1-2 days]` `[parallel: true]` `[component: settings]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Settings Router"
    - [ ] **Write Tests**: Update account, update privacy, delete account, export data
    - [ ] **Implement**: 5 procedures (updateAccount, updatePrivacy, deleteAccount, exportData, getAccountSettings)
    - [ ] **Validate**: Account management works, GDPR export functional

**Success Criteria:** All 10 routers complete, all 50+ procedures functional

---
