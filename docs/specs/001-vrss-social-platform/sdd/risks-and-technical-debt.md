# Risks and Technical Debt

## Known Technical Issues

**Polling Instead of WebSockets**: Notifications and messages use 30-second polling instead of WebSocket connections (higher latency, increased server load, battery drain on mobile). Polling interval may need tuning; watch for race conditions with multiple tabs.

**No Real-Time Feed Updates**: Feed content cached with TanStack Query, no live updates when new posts appear. Users must manually refresh. Need clear UI indicators for "pull to refresh".

**Basic Text Search Only**: Search uses PostgreSQL `ILIKE` and `pg_trgm` for fuzzy matching, no full-text search (limited capabilities, poor performance at scale). Consider dedicated search solution (Elasticsearch, MeiliSearch) post-MVP.

**No Content Moderation System**: No automated filtering, spam detection, or abuse reporting workflows. Platform vulnerable until manual moderation established. Must implement before public launch; GDPR/DMCA compliance required.

**S3 Eventual Consistency**: S3 provides eventual consistency for updates/deletes (users may see 404 errors briefly after upload, deleted media may remain accessible temporarily). Two-phase upload helps but doesn't eliminate race conditions.

**Session Cookie Domain Configuration**: Better-auth session cookies need careful domain configuration for subdomains. Use `.vrss.app` (with leading dot) to share cookies across subdomains. Test thoroughly in production.

## Technical Debt

**Denormalized Engagement Counters**: `likes_count`, `comments_count`, `reposts_count` stored on `posts` table, updated via database triggers. MVP decision for feed query performance. Counter drift possible if triggers fail; requires periodic reconciliation. Monitor for negative counts.

**JSONB for Profile Customization**: `user_profiles.style_config`, `background_config`, `layout_config` use JSONB instead of normalized tables. MVP decision for schema flexibility. No schema validation at database level, complex queries for nested data. Validate JSONB in application layer using Zod schemas.

**Polling for Notifications**: Frontend polls `/api/rpc` with `notification.getNotifications` every 30 seconds. MVP decision to avoid WebSocket complexity. Wastes bandwidth, delays notifications by up to 30 seconds. Tune polling interval; implement exponential backoff when inactive.

**Basic Discovery Algorithm**: Discover feed uses simple SQL: popular posts by likes_count within N-degree friend network. MVP decision to ship without ML/recommendation engine. Poor discovery experience, no personalization. Will hit performance limits at scale.

**No CDN for Media Delivery**: Media served directly from S3 origin without CloudFront initially. MVP cost optimization. Slower load times for distant users, higher S3 egress costs. Set proper Cache-Control headers even without CDN.

**Monolithic RPC API**: All 50+ procedures in single Bun+Hono application, no service separation. MVP decision for simplicity. Entire API scales as one unit. Monitor resource usage by procedure; plan extraction: media service first, feed algorithm engine second.

**Array-Based Conversation Participants**: `conversations.participant_ids` stores user IDs as PostgreSQL array instead of junction table. MVP decision for 1:1 DMs with group DM future-proofing. Works for small groups (2-10); migrate to junction table if groups scale to 100+.

## Implementation Gotchas

**JSONB Query Complexity**: Querying nested JSONB requires PostgreSQL JSON operators (`->`, `->>`, `@>`). Easy to write inefficient queries. Use `@>` for containment checks (GIN indexable), avoid `->>` for text extraction in WHERE clauses.

**Prisma N+1 Query Problem**: Fetching posts with authors in loop generates N+1 database queries (feed with 20 posts = 21 queries). Always use `include: { author: true }` in Prisma queries. Monitor slow query log for repeated identical queries.

**S3 Eventual Consistency Edge Cases**: After two-phase upload, media may not be immediately readable (user sees image briefly, then 404). Implement retry logic with exponential backoff in image loading. Consider S3 Transfer Acceleration.

**Session Cookie SameSite Attribute**: Better-auth cookies need `SameSite=Lax` or `SameSite=None; Secure` for cross-origin requests. Local development (localhost:3000 → localhost:3001) works with Lax; production with separate domains requires SameSite=None + Secure (HTTPS required).

**Feed Algorithm JSONB to SQL Translation**: `custom_feeds.algorithm_config` needs conversion to SQL WHERE clauses at runtime. Dynamic SQL generation is security-sensitive (SQL injection risk). Never concatenate user input; use parameterized queries exclusively. Validate filter types and operators; implement query timeout.

**Denormalized Counter Race Conditions**: Database triggers update `posts.likes_count` when `post_interactions` inserted, but triggers aren't atomic with external logic. Concurrent likes/unlikes can cause counter drift. Don't update counters in application code if triggers exist. Implement nightly reconciliation.

**PostgreSQL Array vs JSONB Performance**: `conversations.participant_ids` uses BIGINT[] array. Array lookups require GIN index. Query pattern: `WHERE user_id = ANY(participant_ids)` works with GIN index. PostgreSQL arrays are 1-indexed, not 0-indexed.

**Better-auth Middleware Order**: Auth middleware must run before RPC router, but body needs parsing twice. Hono's context doesn't clone request bodies automatically. RPC router must recreate Request with cached body text. Test with large file uploads.

**Soft Delete Filter Overhead**: All queries on posts/comments/messages need `WHERE deleted_at IS NULL` filter. Easy to forget, exposing soft-deleted content. Create wrapper functions that automatically add filter. Use partial indexes `WHERE deleted_at IS NULL`.

**Storage Quota Check Race Condition**: Multiple concurrent uploads can exceed quota if check isn't atomic. Use `SELECT ... FOR UPDATE` to lock `storage_usage` row during upload transaction. Handle lock timeout gracefully; lock order matters to prevent deadlocks.
