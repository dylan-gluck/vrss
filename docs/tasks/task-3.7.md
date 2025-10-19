# TASK 3.7: Message, Notification, Discovery, Settings Routers

## TASK
Implement four RPC routers completing the backend API implementation:
1. **Message Router** (5 procedures): Direct messaging between users
2. **Notification Router** (3 procedures): User notification management
3. **Discovery Router** (3 procedures): User and content search/discovery
4. **Settings Router** (5 procedures): Account management and privacy settings

These are the final routers needed to complete Phase 3 Backend API Implementation. All routers follow the established RPC pattern with type-safe procedure handlers.

---

## CONTEXT

### Business Requirements (PRD)

**F7: Direct Messaging** (lines 202-211)
- User can send text messages to other users
- Inbox view shows all message threads
- Message thread view shows conversation history
- Real-time message delivery
- Message read status indicators
- User can block/unblock other users

**F8: Notifications** (lines 212-222)
- Notifications for new followers
- Notifications for post likes
- Notifications for post comments
- Notifications for mentions
- Notification center displays all alerts
- Unread notification count badge
- User can mark notifications as read

**F5: Custom Discovery/Search Algorithm** (lines 182-191)
- Default discovery algorithm: popular posts within 2-degree friend network
- Visual algorithm builder for discovery (same interface as feeds)
- User can create multiple discovery algorithms
- Search functionality for users and content
- Discovery results update based on custom algorithm
- User can switch between different discovery views

**F9: Account Settings and Management** (lines 223-233)
- User can change username
- User can change email address
- User can change password
- User can set profile visibility (public/private)
- User can view media storage usage (percentage used)
- User can delete account
- Account deletion removes all user data

### Architecture Pattern
This task follows the established RPC architecture pattern (docs/api-architecture.md):
- Single endpoint: `POST /api/rpc`
- Procedure-based routing: `{namespace}.{procedure}` (e.g., `message.sendMessage`)
- Type-safe contracts from `packages/api-contracts/src/procedures/`
- Consistent error handling with `RPCError` and error codes
- Better-auth session management for authentication
- Cursor-based pagination for list endpoints

### Existing Implementation Examples
**Reference completed routers** (Phase 3.1-3.6):
- `apps/api/src/rpc/routers/user.ts` - Profile management pattern
- `apps/api/src/rpc/routers/post.ts` - Content CRUD pattern
- `apps/api/src/rpc/routers/social.ts` - Relationship management pattern
- `apps/api/src/rpc/routers/feed.ts` - Algorithm execution pattern
- `apps/api/src/rpc/routers/media.ts` - Storage quota enforcement pattern

---

## SDD_REQUIREMENTS

### Message Router Procedures
**Location:** docs/api-architecture.md lines 401-435

**MessageProcedures.SendMessage** (lines 402-411)
```typescript
input: {
  recipientId: UserId;
  content: string;
  mediaIds?: MediaId[];
}
output: {
  message: Message;
}
```

**MessageProcedures.GetConversations** (lines 413-422)
```typescript
input: {
  limit?: number;
  cursor?: string;
}
output: {
  conversations: Conversation[];
  nextCursor?: string;
}
```

**MessageProcedures.GetMessages** (lines 424-434)
```typescript
input: {
  conversationId: string;
  limit?: number;
  cursor?: string;
}
output: {
  messages: Message[];
  nextCursor?: string;
}
```

**Additional Required Procedures** (from phase document lines 226):
- `message.markAsRead` - Mark messages as read in conversation
- `message.deleteConversation` - Delete conversation thread

### Notification Router Procedures
**Location:** docs/api-architecture.md lines 437-458

**NotificationProcedures.GetNotifications** (lines 438-448)
```typescript
input: {
  limit?: number;
  cursor?: string;
}
output: {
  notifications: Notification[];
  nextCursor?: string;
  unreadCount: number;
}
```

**NotificationProcedures.MarkAsRead** (lines 450-457)
```typescript
input: {
  notificationIds: string[];
}
output: {
  success: true;
}
```

**Additional Required Procedure** (from phase document line 232):
- `notification.deleteNotification` - Delete specific notification

### Discovery Router Procedures
**Location:** docs/api-architecture.md lines 377-399

**DiscoveryProcedures.SearchUsers** (lines 378-386)
```typescript
input: {
  query: string;
  limit?: number;
}
output: {
  users: User[];
}
```

**DiscoveryProcedures.GetDiscoverFeed** (lines 388-398)
```typescript
input: {
  algorithmId?: string;
  limit?: number;
  cursor?: string;
}
output: {
  posts: Post[];
  nextCursor?: string;
}
```

**Additional Required Procedure** (from phase document line 238):
- `discovery.searchPosts` - Search posts by content/tags

### Settings Router Procedures
**Location:** docs/api-architecture.md lines 503-536

**SettingsProcedures.UpdateAccount** (lines 504-514)
```typescript
input: {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
output: {
  user: User;
}
```

**SettingsProcedures.UpdatePrivacy** (lines 516-524)
```typescript
input: {
  profileVisibility: 'public' | 'followers' | 'private';
  allowMessagesFrom: 'everyone' | 'followers' | 'friends';
  showFollowers: boolean;
}
output: {
  settings: PrivacySettings;
}
```

**SettingsProcedures.DeleteAccount** (lines 527-533)
```typescript
input: {
  password: string;
  confirmation: 'DELETE_MY_ACCOUNT';
}
output: {
  success: true;
}
```

**Additional Required Procedures** (from phase document line 243):
- `settings.exportData` - GDPR data export
- `settings.getAccountSettings` - Get current account settings

---

## DATA_MODEL

### Database Schema Requirements
**Location:** docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md

#### Messages & Conversations
**conversations table** (lines 614-632)
- `id` BIGSERIAL PRIMARY KEY
- `participant_ids` BIGINT[] (supports group DMs)
- `last_message_at` TIMESTAMPTZ
- **Constraint:** Minimum 2 participants
- **Index:** GIN index on `participant_ids` (line 992)

**messages table** (lines 634-657)
- `id` BIGSERIAL PRIMARY KEY
- `conversation_id` BIGINT REFERENCES conversations(id)
- `sender_id` BIGINT REFERENCES users(id)
- `content` TEXT NOT NULL
- `read_by` BIGINT[] (array of user IDs who read message)
- `deleted_at` TIMESTAMPTZ (soft delete)
- **Index:** `idx_messages_conversation_created` (line 996)
- **Index:** GIN on `read_by` for unread queries (line 1001)

#### Notifications
**notifications table** (lines 663-700)
- `id` BIGSERIAL PRIMARY KEY
- `user_id` BIGINT NOT NULL (recipient)
- `type` notification_type ENUM ('follow', 'like', 'comment', 'repost', 'mention', 'message', 'friend_request', 'system')
- `actor_id` BIGINT REFERENCES users(id) (who triggered)
- `post_id` BIGINT REFERENCES posts(id) (optional)
- `comment_id` BIGINT REFERENCES comments(id) (optional)
- `title` VARCHAR(200) NOT NULL
- `content` TEXT
- `action_url` VARCHAR(500)
- `is_read` BOOLEAN DEFAULT FALSE
- `read_at` TIMESTAMPTZ
- **Index:** `idx_notifications_user_unread` WHERE is_read = FALSE (line 1008)
- **Index:** `idx_notifications_user_created` (line 1014)

#### User Settings & Privacy
**user_profiles table** (lines 127-171) - Contains visibility settings
- `visibility` VARCHAR(20) DEFAULT 'public' ('public', 'followers', 'private')
- **Index:** `idx_user_profiles_visibility` (line 906)

**users table** (lines 93-124)
- `username` VARCHAR(30) UNIQUE
- `email` VARCHAR(255) UNIQUE
- `password_hash` VARCHAR(255)
- `status` VARCHAR(20) ('active', 'suspended', 'deleted')
- `deleted_at` TIMESTAMPTZ (soft delete)

**storage_usage table** (lines 703-734) - For quota display
- `user_id` BIGINT UNIQUE
- `used_bytes` BIGINT
- `quota_bytes` BIGINT
- `images_bytes` BIGINT
- `videos_bytes` BIGINT
- `audio_bytes` BIGINT

#### Discovery/Search
**posts table** (lines 236-297) - For post search
- **Index:** `idx_posts_engagement_created` for popular posts (line 923)
- **Index:** `idx_posts_type_created` for filtered queries (line 918)

**users table** (lines 93-124) - For user search
- `username` UNIQUE - primary search field
- `display_name` in user_profiles
- **Index:** `idx_users_email` (line 2228)

### Supporting Types (api-architecture.md)

**Message interface** (lines 552-560)
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: UserId;
  content: string;
  mediaIds?: MediaId[];
  createdAt: Date;
  readAt?: Date;
}
```

**Conversation interface** (lines 562-568)
```typescript
interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: Date;
}
```

**Notification interface** (lines 570-578)
```typescript
interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'mention';
  actorId: UserId;
  targetId?: PostId | UserId;
  content: string;
  read: boolean;
  createdAt: Date;
}
```

**PrivacySettings interface** (lines 592-596)
```typescript
interface PrivacySettings {
  profileVisibility: 'public' | 'followers' | 'private';
  allowMessagesFrom: 'everyone' | 'followers' | 'friends';
  showFollowers: boolean;
}
```

---

## SUCCESS

### Completion Criteria

**1. Message Router Implementation** (`apps/api/src/rpc/routers/message.ts`)
- [ ] `message.sendMessage` - Creates conversation if needed, inserts message, updates `last_message_at`
- [ ] `message.getConversations` - Lists user's conversations with cursor pagination, includes unread count
- [ ] `message.getMessages` - Fetches conversation messages with cursor pagination
- [ ] `message.markAsRead` - Adds user to `read_by` array for messages
- [ ] `message.deleteConversation` - Soft deletes conversation (sets `deleted_at`)
- [ ] Business logic in `apps/api/src/features/message/` (conversation service, message service)
- [ ] Authorization: Users can only access their own conversations
- [ ] Cursor-based pagination for efficient scrolling

**2. Notification Router Implementation** (`apps/api/src/rpc/routers/notification.ts`)
- [ ] `notification.getNotifications` - Lists notifications with cursor pagination, returns unread count
- [ ] `notification.markAsRead` - Bulk marks notifications as read, sets `read_at` timestamp
- [ ] `notification.deleteNotification` - Soft deletes notification
- [ ] Business logic in `apps/api/src/features/notification/`
- [ ] Authorization: Users can only access their own notifications
- [ ] Efficient unread count calculation using index

**3. Discovery Router Implementation** (`apps/api/src/rpc/routers/discovery.ts`)
- [ ] `discovery.searchUsers` - Full-text search on username/display_name, respects profile visibility
- [ ] `discovery.searchPosts` - Search posts by content/tags, applies visibility rules
- [ ] `discovery.getDiscoverFeed` - Returns popular posts from 2-degree network, cursor pagination
- [ ] Business logic in `apps/api/src/features/discovery/` (search service, algorithm service)
- [ ] Default algorithm: Popular posts within 2-degree friend network (friendships + follows)
- [ ] Visibility filtering: Exclude private profiles/posts
- [ ] Performance: Queries execute in <200ms

**4. Settings Router Implementation** (`apps/api/src/rpc/routers/settings.ts`)
- [ ] `settings.updateAccount` - Updates username/email/password with validation
- [ ] `settings.updatePrivacy` - Updates profile visibility and message permissions in user_profiles
- [ ] `settings.deleteAccount` - Soft deletes account (sets `deleted_at`), cascades via FK constraints
- [ ] `settings.exportData` - Generates GDPR-compliant data export (JSON)
- [ ] `settings.getAccountSettings` - Returns current account settings
- [ ] Business logic in `apps/api/src/features/settings/`
- [ ] Password validation: Requires current password for sensitive changes
- [ ] Username/email uniqueness checks before update
- [ ] Data export includes: posts, comments, interactions, messages, profile data

**5. Testing Requirements** (Following established pattern from Phase 3.1-3.6)
- [ ] **Message Router Tests**:
  - Send message creates conversation if needed
  - Get conversations returns correct unread counts
  - Get messages respects conversation access
  - Mark as read updates read_by array
  - Authorization: Cannot access others' conversations
- [ ] **Notification Router Tests**:
  - Get notifications includes unread count
  - Mark as read bulk operation works
  - Delete notification soft deletes
  - Authorization: Cannot access others' notifications
- [ ] **Discovery Router Tests**:
  - Search users finds by username/display name
  - Search respects profile visibility (private profiles excluded)
  - Discover feed returns popular posts from network
  - Discovery algorithm executes efficiently
- [ ] **Settings Router Tests**:
  - Update account validates uniqueness (username/email)
  - Update password requires current password
  - Delete account soft deletes user
  - Export data includes all user data
  - Privacy settings persist to database
- [ ] Test coverage: 85%+ for all routers
- [ ] Integration tests verify database operations

**6. Router Registration**
- [ ] All 4 routers registered in `apps/api/src/rpc/index.ts` procedure registry
- [ ] Type safety verified: All procedure handlers match contract types
- [ ] Error handling: All procedures use `RPCError` with appropriate error codes

**7. Specification Compliance**
- [ ] All procedures implement exact input/output types from api-architecture.md
- [ ] Cursor-based pagination implemented for all list endpoints (limit, cursor, nextCursor)
- [ ] Authentication enforced via middleware (public procedures: discovery.searchUsers, discovery.searchPosts)
- [ ] Authorization checks: Users can only access their own resources
- [ ] Database indexes used: Verify EXPLAIN ANALYZE shows index usage
- [ ] Performance targets met:
  - Message queries: <50ms
  - Notification queries: <30ms
  - Search queries: <100ms
  - Settings updates: <50ms

### Validation Steps
1. **Type Check**: `bun run type-check` passes without errors
2. **Tests Pass**: All router tests pass (16+ tests per router minimum)
3. **Integration**: RPC router successfully routes to all procedures
4. **Manual Testing**: Use Postman/curl to test each procedure
5. **Performance**: EXPLAIN ANALYZE confirms index usage
6. **Coverage**: Test coverage reports show 85%+ coverage

---

## IMPLEMENTATION NOTES

### Critical Patterns to Follow

1. **Conversation Creation** (Message Router)
   - Use `participant_ids` array (supports future group DMs)
   - Order participants consistently for deduplication
   - Update `last_message_at` on every message send
   - Check participant membership before allowing access

2. **Unread Count Calculation** (Message/Notification Routers)
   - Messages: Check if current user NOT IN `read_by` array
   - Notifications: WHERE `is_read = FALSE`
   - Use database aggregation for efficiency

3. **Discovery Algorithm** (Discovery Router)
   - 2-degree network = friends + friends-of-friends + followed users
   - Use CTEs (Common Table Expressions) for complex graph queries
   - Apply visibility filters (exclude private profiles/posts)
   - Sort by engagement: `likes_count DESC, created_at DESC`

4. **Account Deletion** (Settings Router)
   - Soft delete: Set `deleted_at` timestamp
   - Cascade handled by database FK ON DELETE CASCADE
   - Grace period: 30 days before permanent deletion (handled via cron job)
   - Keep username reserved to prevent impersonation

5. **Privacy Settings** (Settings Router)
   - Store in `user_profiles.visibility`
   - Add `allowMessagesFrom` and `showFollowers` to user_profiles (may need migration)
   - Apply visibility filters in all relevant queries (feed, search, profile access)

### Error Codes to Use (docs/api-architecture.md lines 600-661)
- `UNAUTHORIZED` (1000) - Not authenticated
- `FORBIDDEN` (1100) - Not authorized to access resource
- `VALIDATION_ERROR` (1200) - Invalid input
- `NOT_FOUND` (1300) - Resource not found
- `CONFLICT` (1400) - Username/email already taken
- `RATE_LIMIT_EXCEEDED` (1500) - Too many requests

### Dependencies
- Prisma Client: Database access
- Better-auth: Session/user context from middleware
- Zod: Input validation schemas
- Existing routers: Reference for patterns and structure
