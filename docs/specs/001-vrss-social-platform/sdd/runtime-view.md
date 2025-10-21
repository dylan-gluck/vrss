# Runtime View

**Complete Documentation**: @docs/architecture/RUNTIME_VIEW.md

## Primary Flows

**7 Core User Journeys Documented with Sequence Diagrams**:
1. **User Registration** (11 steps) - Account creation, email verification, storage quota initialization
2. **User Login** (11 steps) - Authentication, session creation, token management
3. **Create Post** (13 steps) - Post composition, validation, media attachment, feed distribution
4. **View Feed** (12 steps) - Feed loading, infinite scroll, custom filter execution, caching
5. **Follow User** (10 steps) - Follow action, friend detection, notification, feed updates
6. **Send Direct Message** (9 steps) - Message composition, permission check, delivery, read tracking
7. **Upload Media** (three-phase) - Initiate (quota check) → Upload (S3 direct) → Complete (validation)

All flows include Mermaid sequence diagrams showing PWA → API → Database → External Services interactions.

## Error Handling Strategies

**9 Error Categories with Client Handling**:
- **Validation Errors (1200-1299)**: Field-specific messages with inline error display
- **Authentication Errors (1000-1099)**: Session expiry with auto-redirect to login
- **Authorization Errors (1100-1199)**: Permission denied with actionable guidance
- **Resource Not Found (1300-1399)**: 404 handling with navigation suggestions
- **Conflict Errors (1400-1499)**: Duplicate detection with alternative suggestions
- **Rate Limiting (1500-1599)**: Countdown timers and retry-after headers
- **Storage Errors (1600-1699)**: Quota exceeded with upgrade prompts
- **Server Errors (1900-1999)**: Exponential backoff retry logic
- **Network Errors**: Offline detection and background sync queue

## Complex Algorithms

**4 Critical Algorithms Documented**:

1. **Feed Algorithm Execution** (default timeline with custom filters):
   - Load user's custom feed configuration (filters from `feed_filters` table)
   - Build dynamic SQL query from filter blocks (AND logic)
   - Apply post type filters, author filters, group filters
   - Execute paginated query with cursor-based pagination
   - Cache results in Redis (5-minute TTL) keyed by feedId + cursor
   - Return posts with metadata (like counts, author info)

2. **Storage Quota Calculation** (atomic with trigger-based updates):
   - On upload initiate: `SELECT FOR UPDATE` on `storage_usage` row
   - Calculate: used_bytes + new_file_size
   - Validate: total <= quota_bytes (reject if exceeds)
   - On upload complete: Database trigger updates used_bytes atomically
   - Nightly reconciliation: Recalculate from `SUM(post_media.size_bytes)`

3. **Friend Detection** (automatic mutual follow):
   - User A follows User B → Insert into `user_follows`
   - Database trigger checks: Does B follow A?
   - If mutual: Insert into `friendships` (both directions)
   - Friendship enables enhanced features (priority in feeds, direct messaging)

4. **Custom Feed Builder** (visual algorithm with AND/OR logic):
   - User drags filter blocks (post type, author, date range, tags)
   - Each block = row in `feed_filters` with type, operator, value (JSONB)
   - Frontend sends filter array → Backend converts to SQL WHERE clauses
   - Validate: Max 20 filters per feed, allowed operators per filter type
   - Execute with query timeout (5 seconds max)
