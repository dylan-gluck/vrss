# Test Specifications

**Complete Documentation**: @docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md

## Critical Test Scenarios (10 Gherkin Scenarios)

**1. User Registration - Happy Path** (P0 Critical)
```gherkin
Given: User is on registration page
And: Valid email and password are prepared
When: User submits registration form with username "john_doe", email "john@example.com", password "SecurePass123!"
Then: Account is created in database with hashed password
And: Email verification sent to john@example.com
And: User redirected to email verification page
And: Storage quota initialized to 50MB free tier
```

**2. User Login - Validation Error** (P0 Critical)
```gherkin
Given: User has existing account
When: User submits login with incorrect password
Then: Error message "Invalid email or password" displayed
And: Failed login attempt logged for security monitoring
And: Rate limiting applied (5 attempts per minute)
And: User session not created
```

**3. Post Creation with File Upload - Happy Path** (P0 Critical)
```gherkin
Given: Authenticated user with 10MB storage used (40MB remaining)
When: User uploads 5MB image and creates post with content "Beautiful sunset! 🌅"
Then: media.initiateUpload checks quota (10MB + 5MB = 15MB < 50MB)
And: Presigned S3 URL generated with 1-hour expiry
And: Frontend uploads directly to S3
And: media.completeUpload validates S3 upload success
And: Post created with mediaIds reference
And: Storage usage updated to 15MB
And: Post appears in user's profile and followers' feeds
```

**4. Storage Quota Limit Enforcement - Edge Case** (P1 High)
```gherkin
Given: User has 49MB of 50MB quota used
When: User attempts to upload 2MB file
Then: media.initiateUpload rejects with error code 1600 (STORAGE_LIMIT_EXCEEDED)
And: Error message displays "Storage limit exceeded. You have 1MB remaining."
And: Upgrade prompt shown with subscription options
And: No presigned URL generated
And: Storage usage remains at 49MB
```

**5. Feed Viewing with Custom Filters - Happy Path** (P1 High)
```gherkin
Given: User has created custom feed "Music Only"
And: Feed has filters: postType=song, authors=[user123, user456]
When: User selects "Music Only" feed
Then: Feed algorithm executes with filters applied
And: Only song posts from specified authors returned
And: Results paginated with cursor (limit=20)
And: Feed cached in Redis for 5 minutes
And: Infinite scroll loads more posts using nextCursor
```

**6. Social Following and Notifications - Happy Path** (P1 High)
```gherkin
Given: User A and User B are not connected
When: User A follows User B
Then: Row inserted into user_follows table
And: User B's posts appear in User A's feed
And: Notification created for User B (type: follow, actor: User A)
When: User B follows User A back
Then: Database trigger detects mutual follow
And: Friendship record created in friendships table
And: Enhanced features enabled (priority in feeds, direct messaging)
```

**7. Profile Customization - Happy Path** (P1 High)
```gherkin
Given: User is on profile customization page
When: User updates background color to "#1a1a2e"
And: User sets font to "Inter"
And: User adds profile section (type: gallery, title: "My Photos")
Then: profile_config JSONB updated with style changes
And: profile_sections row inserted with gallery configuration
And: Changes visible immediately on profile (optimistic update)
And: Profile renders correctly on mobile and desktop
```

**8. Authentication Session Management - Security** (P0 Critical)
```gherkin
Given: User logged in 6 days ago (session expires in 7 days)
When: User makes API request
Then: Session validated from database
And: Sliding window extends session by 7 days
And: Request proceeds successfully
When: Session expires (7 days with no activity)
Then: Next API request returns error code 1002 (SESSION_EXPIRED)
And: User redirected to login page
And: Session removed from database
```

**9. Direct Messaging - Happy Path** (P2 Medium)
```gherkin
Given: User A and User B are friends (mutual follow)
When: User A sends message "Hey, how are you?" to User B
Then: Message saved to messages table
And: Conversation created/updated in conversations table
And: User B's unread message count incremented
And: Notification sent to User B (type: message, actor: User A)
When: User B views conversation
Then: Message marked as read (read_by array updated)
And: User A sees "Read" status on message
```

**10. Search and Discovery - Happy Path** (P1 High)
```gherkin
Given: User on discovery page
When: User searches for "john"
Then: Search query uses PostgreSQL pg_trgm fuzzy matching
And: Results include users with matching usernames or display names
And: Results sorted by relevance (exact matches first)
When: User views default discovery feed
Then: Algorithm shows popular posts within 2-degree friend network
And: Posts sorted by likes_count (descending)
And: Results paginated with cursor
```

## Test Coverage Requirements

**Business Logic Coverage** (90%+ target):
- Authentication and authorization flows
- Storage quota calculations and enforcement
- Feed algorithm execution with custom filters
- Post validation rules (content length, media limits, visibility)
- Notification creation and delivery logic

**UI Interaction Coverage** (80%+ target):
- All authentication forms (login, register, password reset)
- Post creation flow (text, image, video, song posts)
- Feed builder with drag-and-drop filter blocks
- Profile customization (styles, layout, sections)
- Navigation and routing
- Accessibility (keyboard navigation, screen readers)

**Integration Point Coverage** (85%+ target):
- All 50+ RPC procedures (success and error scenarios)
- Database operations (CRUD, transactions, triggers)
- S3 file upload (two-phase pattern, presigned URLs)
- Better-auth integration (session management, password hashing)

**Edge Case Coverage**:
- Boundary conditions (storage limits, text lengths, pagination limits)
- Input validation (username format, email format, password strength)
- Concurrency (simultaneous follows, storage quota races)
- Error recovery (network failures, S3 timeouts, database errors)

**Performance Testing**:
- API response times (p50 and p95 for all endpoints)
- Feed rendering under load (20 posts, 100 posts, 1000 posts)
- Database query performance (complex joins, JSONB queries)
- Load testing (1000 concurrent users)
