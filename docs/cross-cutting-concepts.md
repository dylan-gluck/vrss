# VRSS Cross-Cutting Concepts

**Version**: 1.0
**Date**: 2025-10-16
**Status**: Design Phase

This document defines cross-cutting patterns and concepts that apply across all features of the VRSS social platform MVP. These patterns ensure consistency, maintainability, and code reuse throughout the system.

---

## Table of Contents

1. [System-Wide Patterns](#system-wide-patterns)
2. [Code Patterns](#code-patterns)
3. [Test Pattern](#test-pattern)
4. [Integration Points](#integration-points)

---

## System-Wide Patterns

### 1. Security Patterns

**Reference**: See `/docs/SECURITY_DESIGN.md` for complete security architecture.

#### Authentication Flow
```yaml
pattern: session-based-authentication
library: better-auth
approach: |
  - All authentication flows managed by Better-auth
  - Session cookies (HttpOnly, Secure, SameSite=Lax)
  - 7-day session expiration with sliding window
  - Automatic session refresh on activity

pseudocode: |
  FUNCTION authenticate_request(request):
    session_token = GET_COOKIE(request, "vrss_session")

    IF session_token IS NULL:
      RETURN anonymous_context()

    session = validate_session(session_token)

    IF session.expired():
      RETURN session_expired_error()

    IF session.needs_refresh():
      session = refresh_session(session)

    RETURN authenticated_context(session.user)

integration_points:
  - Auth middleware: apps/api/src/middleware/auth.ts
  - Auth configuration: apps/api/src/auth/config.ts
  - Frontend hooks: apps/pwa/src/api/hooks.ts (useAuth)
```

#### Authorization Pattern
```yaml
pattern: resource-ownership-and-visibility
approach: |
  - Resource ownership checked at procedure level
  - Profile visibility enforced (public/followers/private)
  - Storage quota validated before operations
  - Permission checks before sensitive actions

pseudocode: |
  FUNCTION check_authorization(user, resource, action):
    # Check authentication
    IF user IS NULL:
      THROW unauthorized_error()

    # Check ownership
    IF action REQUIRES ownership:
      IF resource.owner_id != user.id:
        THROW forbidden_error("Not resource owner")

    # Check visibility
    IF action IS "view" AND resource HAS visibility:
      IF resource.visibility == "private":
        IF user.id != resource.owner_id:
          THROW forbidden_error("Private resource")

      IF resource.visibility == "followers":
        IF user.id != resource.owner_id AND NOT is_following(user, resource.owner):
          THROW forbidden_error("Followers only")

    # Check quota
    IF action CREATES resource WITH storage:
      quota = get_storage_quota(user)
      IF quota.exceeded(resource.size):
        THROW quota_exceeded_error()

    RETURN authorized()

integration_points:
  - Middleware: apps/api/src/middleware/auth.ts (requireAuth, requireOwnership)
  - Authorization helpers: apps/api/src/lib/authorization.ts
```

### 2. Error Handling Patterns

**Reference**: See `/docs/api-architecture.md` for error codes and RPC error handling.

#### Standardized Error Response
```yaml
pattern: rpc-error-handling
error_codes: |
  1000-1099: Authentication errors
  1100-1199: Authorization errors
  1200-1299: Validation errors
  1300-1399: Resource errors
  1400-1499: Conflict errors
  1500-1599: Rate limiting
  1600-1699: Storage errors
  1900-1999: Server errors

pseudocode: |
  FUNCTION handle_procedure_error(error):
    request_id = generate_uuid()

    # Log error with context
    log_error(error, {
      request_id: request_id,
      user_id: context.user?.id,
      procedure: context.procedure,
      timestamp: now()
    })

    # Convert to RPC error
    IF error IS RPCError:
      rpc_error = error
    ELSE IF error IS ValidationError:
      rpc_error = NEW RPCError(1200, error.message, error.details)
    ELSE IF error IS NotFoundError:
      rpc_error = NEW RPCError(1300, "Resource not found")
    ELSE:
      # Unknown error - don't leak details in production
      IF is_production():
        rpc_error = NEW RPCError(1900, "An unexpected error occurred")
      ELSE:
        rpc_error = NEW RPCError(1900, error.message, { stack: error.stack })

    RETURN {
      success: false,
      error: {
        code: rpc_error.code,
        message: rpc_error.message,
        details: rpc_error.details
      },
      metadata: {
        timestamp: now(),
        request_id: request_id
      }
    }

integration_points:
  - Error types: packages/api-contracts/src/errors.ts
  - RPC router: apps/api/src/rpc/router.ts
  - Client error handling: packages/api-client/src/index.ts (ClientRPCError)
```

#### Frontend Error Handling
```yaml
pattern: user-friendly-error-messages
approach: |
  - Map error codes to user-friendly messages
  - Show actionable error messages
  - Log detailed errors for debugging
  - Retry transient errors automatically

pseudocode: |
  FUNCTION handle_client_error(error):
    IF error IS ClientRPCError:
      # Map error codes to messages
      IF error.code == 1000:  # UNAUTHORIZED
        show_login_prompt()
        RETURN

      IF error.code == 1001:  # INVALID_CREDENTIALS
        show_error("Invalid email or password")
        RETURN

      IF error.code == 1500:  # RATE_LIMIT_EXCEEDED
        show_error("Too many requests. Please try again in a moment.")
        RETURN

      IF error.code == 1600:  # STORAGE_LIMIT_EXCEEDED
        show_error("Storage limit reached. Delete files or upgrade your account.")
        navigate_to("/settings/storage")
        RETURN

      # Generic validation error
      IF error.is_validation_error():
        show_error(error.message)
        highlight_invalid_fields(error.details)
        RETURN

      # Transient error - retry
      IF error.code >= 1900:  # Server errors
        IF retry_count < 3:
          retry_after_delay(exponential_backoff(retry_count))
          RETURN

      # Default: show generic error
      show_error("Something went wrong. Please try again.")
      log_error(error)

integration_points:
  - Error mapping: apps/pwa/src/lib/errors.ts
  - Error UI: apps/pwa/src/components/ErrorBoundary.tsx
  - Toast notifications: apps/pwa/src/components/ui/toast.tsx
```

### 3. Performance Patterns

**Reference**: See `/docs/frontend-architecture.md` for frontend performance optimizations.

#### Caching Strategy
```yaml
pattern: multi-layer-caching
layers:
  - Browser cache (Service Worker)
  - Client state cache (TanStack Query)
  - Server cache (Redis - future)
  - CDN cache (CloudFront)

pseudocode: |
  # TanStack Query caching (client-side)
  FUNCTION fetch_with_cache(query_key, fetch_fn, options):
    cache_config = {
      stale_time: options.stale_time || 5_minutes,
      gc_time: options.gc_time || 30_minutes,
      retry: options.retry || 3,
      retry_delay: exponential_backoff
    }

    # Check cache first
    cached_data = query_cache.get(query_key)

    IF cached_data IS NOT NULL AND NOT is_stale(cached_data):
      RETURN cached_data

    # Fetch fresh data
    TRY:
      data = AWAIT fetch_fn()
      query_cache.set(query_key, data, cache_config)
      RETURN data
    CATCH error:
      # Return stale data if available
      IF cached_data IS NOT NULL:
        RETURN cached_data
      THROW error

  # Service Worker caching (offline support)
  FUNCTION service_worker_fetch(request):
    cache_name = get_cache_name(request)

    IF request.method != "GET":
      RETURN fetch(request)  # Don't cache non-GET

    # Network-first for API calls
    IF is_api_request(request):
      TRY:
        response = AWAIT fetch(request)
        cache.put(request, response.clone())
        RETURN response
      CATCH network_error:
        cached_response = AWAIT cache.match(request)
        IF cached_response:
          RETURN cached_response
        THROW network_error

    # Cache-first for static assets
    IF is_static_asset(request):
      cached_response = AWAIT cache.match(request)
      IF cached_response:
        RETURN cached_response

      response = AWAIT fetch(request)
      cache.put(request, response.clone())
      RETURN response

integration_points:
  - TanStack Query config: apps/pwa/src/lib/query-client.ts
  - Service Worker: apps/pwa/src/service-worker.ts
  - Cache hooks: apps/pwa/src/lib/hooks/useCache.ts
```

#### Async Operations Pattern
```yaml
pattern: optimistic-updates-with-rollback
approach: |
  - Update UI immediately (optimistic)
  - Send request to server
  - Rollback on failure
  - Show loading states for slow operations

pseudocode: |
  FUNCTION perform_optimistic_mutation(mutation_fn, optimistic_data):
    # Snapshot current state
    previous_state = snapshot_query_state()

    # Update UI immediately
    update_query_cache_optimistically(optimistic_data)
    show_temporary_success_indicator()

    TRY:
      # Perform actual mutation
      result = AWAIT mutation_fn()

      # Update with real data
      update_query_cache(result)
      show_success_toast()

      RETURN result

    CATCH error:
      # Rollback optimistic update
      restore_query_state(previous_state)
      show_error_toast(error.message)

      THROW error

integration_points:
  - Mutation hooks: apps/pwa/src/api/mutations.ts
  - Query invalidation: apps/pwa/src/lib/query-client.ts
  - Example: apps/pwa/src/features/posts/hooks/useCreatePost.ts
```

### 4. Logging and Auditing

**Reference**: See `/docs/SECURITY_DESIGN.md` for audit logging requirements.

#### Structured Logging Pattern
```yaml
pattern: structured-json-logging
approach: |
  - All logs in JSON format
  - Include context (request_id, user_id, etc.)
  - Different log levels (debug, info, warn, error)
  - Sensitive data filtered

pseudocode: |
  FUNCTION log_event(level, message, metadata):
    log_entry = {
      level: level,
      message: message,
      timestamp: iso_timestamp(),
      request_id: context.request_id,
      user_id: context.user?.id,
      procedure: context.procedure,
      environment: get_environment(),
      ...filter_sensitive_data(metadata)
    }

    IF level == "error":
      log_entry.stack_trace = metadata.error?.stack
      alert_error_monitoring(log_entry)

    output_json(log_entry)

  FUNCTION filter_sensitive_data(data):
    filtered = clone(data)
    sensitive_keys = ["password", "token", "secret", "authorization"]

    FOR key IN filtered:
      IF key IN sensitive_keys:
        filtered[key] = "[REDACTED]"

    RETURN filtered

integration_points:
  - Logger utility: apps/api/src/utils/logger.ts
  - Logging middleware: apps/api/src/middleware/logging.ts
  - Error tracking: Sentry integration
```

#### Audit Trail Pattern
```yaml
pattern: sensitive-action-auditing
approach: |
  - Log all sensitive actions
  - Store in dedicated audit table
  - Include actor, action, resource, timestamp
  - Immutable audit logs

pseudocode: |
  FUNCTION audit_action(action, resource_type, resource_id, metadata):
    audit_entry = CREATE AuditLog {
      id: generate_uuid(),
      user_id: context.user.id,
      action: action,
      resource_type: resource_type,
      resource_id: resource_id,
      metadata: metadata,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      timestamp: now()
    }

    SAVE audit_entry TO audit_log_table

    # Also log for monitoring
    log_event("info", "Audit: " + action, {
      resource_type: resource_type,
      resource_id: resource_id
    })

  # Example usage
  FUNCTION delete_account(user):
    audit_action(
      "ACCOUNT_DELETED",
      "user",
      user.id,
      { reason: "user_request" }
    )

    perform_account_deletion(user)

integration_points:
  - Audit helpers: apps/api/src/lib/audit.ts
  - Audit schema: apps/api/prisma/schema.prisma (AuditLog model)
  - Audit queries: apps/pwa/src/features/settings/api/audit.ts
```

---

## Code Patterns

### 1. Component Structure Pattern

**Reference**: See `/docs/frontend-architecture.md` for component architecture.

```yaml
pattern: domain-driven-component-organization
structure: |
  features/
    <domain>/
      components/     # UI components
      hooks/          # Custom hooks
      stores/         # Zustand stores
      api/            # API calls
      types/          # TypeScript types
      index.ts        # Public exports

pseudocode: |
  # Component structure example
  COMPONENT PostCard(props):
    # 1. State and hooks at top
    user = use_auth_store()
    { mutate: like_post } = use_like_post()
    [is_expanded, set_expanded] = use_state(false)

    # 2. Derived state
    is_liked = props.post.liked_by_user_ids.includes(user.id)
    can_edit = props.post.author_id == user.id

    # 3. Event handlers
    FUNCTION handle_like():
      like_post({ post_id: props.post.id })

    FUNCTION handle_expand():
      set_expanded(NOT is_expanded)

    # 4. Effects
    USE_EFFECT(() => {
      IF is_expanded:
        track_event("post_expanded", { post_id: props.post.id })
    }, [is_expanded])

    # 5. Render logic
    RETURN (
      <Card>
        <PostHeader author={props.post.author} />
        <PostContent
          content={props.post.content}
          expanded={is_expanded}
          on_expand={handle_expand}
        />
        <PostActions
          liked={is_liked}
          on_like={handle_like}
          can_edit={can_edit}
        />
      </Card>
    )

integration_points:
  - Component examples: apps/pwa/src/features/*/components/
  - Shadcn UI primitives: apps/pwa/src/components/ui/
  - Composition helpers: apps/pwa/src/lib/components.ts
```

### 2. State Management Pattern

**Reference**: See `/docs/frontend-architecture.md` for state management architecture.

```yaml
pattern: multi-layer-state-management
layers:
  server_state: TanStack Query
  global_client_state: Zustand
  feature_state: Zustand slices
  local_state: React useState

pseudocode: |
  # Server state with TanStack Query
  FUNCTION use_profile(username):
    RETURN use_query({
      query_key: ["profile", username],
      query_fn: () => api.user.get_profile(username),
      stale_time: 5_minutes,
      gc_time: 30_minutes,
      enabled: username IS NOT NULL
    })

  # Global client state with Zustand
  FUNCTION create_auth_store():
    RETURN create_store({
      state: {
        user: null,
        is_authenticated: false
      },
      actions: {
        set_user: (user) => {
          state.user = user
          state.is_authenticated = true
        },
        logout: () => {
          state.user = null
          state.is_authenticated = false
        }
      },
      persist: {
        name: "vrss-auth",
        storage: local_storage,
        partialize: (state) => ({
          user: state.user,
          is_authenticated: state.is_authenticated
        })
      }
    })

  # Feature state with Zustand
  FUNCTION create_post_composer_store():
    RETURN create_store({
      state: {
        draft_content: "",
        selected_media: [],
        visibility: "public"
      },
      actions: {
        set_content: (content) => {
          state.draft_content = content
        },
        add_media: (media) => {
          state.selected_media.push(media)
        },
        clear_draft: () => {
          state.draft_content = ""
          state.selected_media = []
        }
      },
      persist: {
        name: "post-draft",
        storage: local_storage
      }
    })

  # Local component state
  COMPONENT PostComposer():
    [is_submitting, set_submitting] = use_state(false)
    [show_preview, set_show_preview] = use_state(false)

    draft = use_post_composer_store()
    { mutate: create_post } = use_create_post()

    FUNCTION handle_submit():
      set_submitting(true)

      TRY:
        AWAIT create_post({
          content: draft.content,
          media_ids: draft.selected_media.map(m => m.id),
          visibility: draft.visibility
        })
        draft.clear_draft()
        navigate_to("/feed")
      CATCH error:
        show_error_toast(error.message)
      FINALLY:
        set_submitting(false)

integration_points:
  - Query hooks: apps/pwa/src/features/*/hooks/use*.ts
  - Store definitions: apps/pwa/src/features/*/stores/*Store.ts
  - Global stores: apps/pwa/src/lib/store/
```

### 3. Data Processing Pattern

```yaml
pattern: transform-data-at-boundaries
approach: |
  - API returns raw data
  - Transform to domain models at boundary
  - Use domain models throughout application
  - Transform back to API format on mutations

pseudocode: |
  # Transformation at API boundary
  FUNCTION transform_api_post_to_domain(api_post):
    RETURN {
      id: api_post.id,
      author: transform_api_user_to_domain(api_post.author),
      content: api_post.content,
      media: api_post.media_ids.map(transform_media),
      created_at: parse_date(api_post.created_at),
      stats: {
        likes: api_post.likes_count,
        comments: api_post.comments_count
      },
      is_liked: api_post.is_liked,
      visibility: api_post.visibility
    }

  FUNCTION transform_domain_post_to_api(domain_post):
    RETURN {
      content: domain_post.content,
      media_ids: domain_post.media.map(m => m.id),
      visibility: domain_post.visibility
    }

  # API hook with transformation
  FUNCTION use_post(post_id):
    query = use_query({
      query_key: ["post", post_id],
      query_fn: async () => {
        raw_data = AWAIT api.post.get_by_id(post_id)
        RETURN transform_api_post_to_domain(raw_data.post)
      }
    })

    RETURN query

  # Mutation with transformation
  FUNCTION use_create_post():
    RETURN use_mutation({
      mutation_fn: async (domain_post) => {
        api_payload = transform_domain_post_to_api(domain_post)
        result = AWAIT api.post.create(api_payload)
        RETURN transform_api_post_to_domain(result.post)
      },
      on_success: (domain_post) => {
        invalidate_query(["feed"])
      }
    })

integration_points:
  - Transformers: apps/pwa/src/lib/transformers/
  - API types: packages/api-contracts/src/types.ts
  - Domain types: apps/pwa/src/types/domain.ts
```

### 4. Error Handling Pattern

```yaml
pattern: handle-errors-at-boundaries
approach: |
  - Catch errors at component/hook boundaries
  - Transform to user-friendly messages
  - Show appropriate UI feedback
  - Log for debugging

pseudocode: |
  # Hook-level error handling
  FUNCTION use_create_post_with_error_handling():
    { mutate, error, is_error } = use_create_post()
    toast = use_toast()

    FUNCTION create_post_with_feedback(post_data):
      TRY:
        result = AWAIT mutate(post_data)
        toast.success("Post created successfully")
        RETURN result
      CATCH error:
        IF error IS ClientRPCError:
          IF error.code == 1600:  # Storage limit
            toast.error("Storage limit reached", {
              action: {
                label: "Manage Storage",
                on_click: () => navigate("/settings/storage")
              }
            })
          ELSE IF error.is_validation_error():
            toast.error("Invalid post: " + error.message)
          ELSE:
            toast.error("Failed to create post")
        ELSE:
          toast.error("An unexpected error occurred")
          log_error(error)

        THROW error

    RETURN {
      create_post: create_post_with_feedback,
      error: error,
      is_error: is_error
    }

  # Component-level error boundary
  COMPONENT PostComposer():
    { create_post, is_error, error } = use_create_post_with_error_handling()
    [content, set_content] = use_state("")

    FUNCTION handle_submit():
      AWAIT create_post({ content })

    RETURN (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Form on_submit={handle_submit}>
          <TextArea value={content} on_change={set_content} />

          {is_error AND (
            <ErrorMessage>{error.message}</ErrorMessage>
          )}

          <Button type="submit">Create Post</Button>
        </Form>
      </ErrorBoundary>
    )

integration_points:
  - Error boundary: apps/pwa/src/components/ErrorBoundary.tsx
  - Error hooks: apps/pwa/src/lib/hooks/useError.ts
  - Toast system: apps/pwa/src/components/ui/toast.tsx
```

---

## Test Pattern

**Reference**: See `/docs/SECURITY_DESIGN.md` for security testing examples.

### Behavior Verification Testing

```yaml
pattern: behavior-driven-testing
approach: |
  - Test user-facing behavior, not implementation
  - Use realistic test data
  - Test happy path and error cases
  - Mock external dependencies

pseudocode: |
  # Backend procedure testing
  DESCRIBE "user.updateProfile":
    BEFORE_EACH:
      clear_database()
      test_user = create_test_user({
        username: "testuser",
        email: "test@example.com"
      })

    TEST "should update user display name":
      # Arrange
      ctx = {
        user: test_user,
        input: {
          display_name: "New Name"
        }
      }

      # Act
      result = AWAIT user_router["user.updateProfile"](ctx)

      # Assert
      ASSERT result.user.display_name == "New Name"
      ASSERT result.user.username == "testuser"  # Unchanged

      # Verify persistence
      saved_user = AWAIT db.user.find_unique({ id: test_user.id })
      ASSERT saved_user.display_name == "New Name"

    TEST "should reject unauthorized update":
      # Arrange
      other_user = create_test_user({ username: "other" })
      ctx = {
        user: other_user,
        input: { display_name: "Hacked" }
      }

      # Act & Assert
      EXPECT_ERROR(
        user_router["user.updateProfile"](ctx)
      ).to_throw("Unauthorized")

    TEST "should validate input":
      # Arrange
      ctx = {
        user: test_user,
        input: {
          display_name: ""  # Invalid: empty
        }
      }

      # Act & Assert
      EXPECT_ERROR(
        user_router["user.updateProfile"](ctx)
      ).to_throw(ValidationError)

  # Frontend component testing
  DESCRIBE "LoginForm component":
    TEST "should submit login with valid credentials":
      # Arrange
      mock_login = MOCK(api.auth.login)
      mock_login.resolves({
        user: { username: "testuser" },
        session_token: "token123"
      })

      # Act
      render(<LoginForm />)
      fill_input("email", "test@example.com")
      fill_input("password", "password123")
      click_button("Log In")

      # Assert
      AWAIT wait_for(() => {
        ASSERT mock_login.called_with({
          email: "test@example.com",
          password: "password123"
        })
      })

      ASSERT current_route() == "/feed"

    TEST "should show error on invalid credentials":
      # Arrange
      mock_login = MOCK(api.auth.login)
      mock_login.rejects(NEW ClientRPCError(1001, "Invalid credentials"))

      # Act
      render(<LoginForm />)
      fill_input("email", "wrong@example.com")
      fill_input("password", "wrongpass")
      click_button("Log In")

      # Assert
      AWAIT wait_for(() => {
        ASSERT screen.contains("Invalid email or password")
      })

      ASSERT current_route() == "/login"  # Still on login page

  # Integration testing
  DESCRIBE "Post creation flow":
    TEST "should create post and show in feed":
      # Arrange
      user = create_test_user()
      authenticate_as(user)

      # Act
      navigate_to("/feed")
      click_button("Create Post")
      type_in_composer("Hello world!")
      click_button("Publish")

      # Assert
      AWAIT wait_for(() => {
        ASSERT feed_contains_post("Hello world!")
      })

      # Verify persistence
      posts = AWAIT db.post.find_many({ user_id: user.id })
      ASSERT posts.length == 1
      ASSERT posts[0].content == "Hello world!"

integration_points:
  - Backend tests: apps/api/src/rpc/routers/__tests__/
  - Frontend tests: apps/pwa/src/features/*/components/__tests__/
  - Integration tests: apps/api/src/__tests__/integration/
  - Test utilities: apps/pwa/src/test/utils.ts
```

---

## Integration Points

### 1. Feature Integration Pattern

```yaml
pattern: consistent-feature-integration
approach: |
  - All features use same connection points
  - RPC procedures for backend communication
  - Zustand for global state
  - TanStack Query for server state
  - Events for cross-feature communication

pseudocode: |
  # Feature registration pattern
  FUNCTION register_feature(feature_name, config):
    # 1. Register RPC procedures
    FOR procedure IN config.procedures:
      rpc_registry.register(feature_name + "." + procedure.name, procedure.handler)

    # 2. Register state stores
    IF config.store:
      store_registry.register(feature_name, config.store)

    # 3. Register event handlers
    FOR event_handler IN config.event_handlers:
      event_bus.on(event_handler.event, event_handler.handler)

    # 4. Register routes
    FOR route IN config.routes:
      router.add_route(route.path, route.component)

  # Example: Post feature registration
  register_feature("post", {
    procedures: [
      {
        name: "create",
        handler: post_router["post.create"]
      },
      {
        name: "getById",
        handler: post_router["post.getById"]
      }
    ],
    store: create_post_composer_store(),
    event_handlers: [
      {
        event: "user.logged_out",
        handler: () => post_store.clear_drafts()
      }
    ],
    routes: [
      {
        path: "/post/:id",
        component: PostDetailPage
      }
    ]
  })

integration_points:
  - Feature exports: apps/pwa/src/features/*/index.ts
  - RPC registry: apps/api/src/rpc/router.ts
  - Route config: apps/pwa/src/app/router.tsx
```

### 2. Data Flow Pattern

```yaml
pattern: unidirectional-data-flow
flow: |
  User Action → Event Handler → API Call → Server Processing →
  Response → State Update → UI Re-render

pseudocode: |
  # Example: Like post flow

  # 1. User action (UI component)
  FUNCTION PostCard(props):
    { mutate: like_post } = use_like_post()

    FUNCTION handle_like():
      like_post({ post_id: props.post.id })

    RETURN <Button on_click={handle_like}>Like</Button>

  # 2. Mutation hook (API integration)
  FUNCTION use_like_post():
    query_client = use_query_client()

    RETURN use_mutation({
      # 3. API call
      mutation_fn: async (input) => {
        RETURN AWAIT api.post.like(input.post_id)
      },

      # 4. Optimistic update
      on_mutate: async (input) => {
        # Cancel outgoing queries
        AWAIT query_client.cancel_queries(["post", input.post_id])

        # Snapshot current state
        previous = query_client.get_query_data(["post", input.post_id])

        # Optimistically update
        query_client.set_query_data(["post", input.post_id], (old) => ({
          ...old,
          is_liked: true,
          stats: { ...old.stats, likes: old.stats.likes + 1 }
        }))

        RETURN { previous }
      },

      # 5. Success handling
      on_success: (data) => {
        # Invalidate related queries
        query_client.invalidate_queries(["feed"])
        query_client.invalidate_queries(["user", "liked-posts"])
      },

      # 6. Error handling (rollback)
      on_error: (error, variables, context) => {
        # Restore previous state
        IF context?.previous:
          query_client.set_query_data(
            ["post", variables.post_id],
            context.previous
          )
      }
    })

  # 7. Backend processing (RPC handler)
  FUNCTION post_like_handler(ctx):
    # Authorization
    IF NOT ctx.user:
      THROW unauthorized_error()

    # Business logic
    post = AWAIT db.post.find_unique({ id: ctx.input.post_id })

    IF NOT post:
      THROW not_found_error()

    # Check if already liked
    existing_like = AWAIT db.like.find_first({
      user_id: ctx.user.id,
      post_id: ctx.input.post_id
    })

    IF existing_like:
      THROW conflict_error("Already liked")

    # Create like
    AWAIT db.like.create({
      user_id: ctx.user.id,
      post_id: ctx.input.post_id
    })

    # Update counters
    AWAIT db.post.update({
      where: { id: ctx.input.post_id },
      data: { likes_count: { increment: 1 } }
    })

    # Emit event for notifications
    event_bus.emit("post.liked", {
      post_id: ctx.input.post_id,
      user_id: ctx.user.id,
      post_author_id: post.author_id
    })

    RETURN { success: true }

integration_points:
  - User actions: apps/pwa/src/features/*/components/
  - Mutation hooks: apps/pwa/src/features/*/hooks/
  - API procedures: apps/api/src/rpc/routers/
  - Event bus: apps/api/src/lib/events.ts
```

### 3. Event System Pattern

```yaml
pattern: event-driven-cross-feature-communication
approach: |
  - Events for decoupled communication
  - Type-safe event definitions
  - Async event handlers
  - Event replay for debugging

pseudocode: |
  # Event type definitions
  INTERFACE Event:
    name: string
    payload: unknown
    timestamp: number
    source: string

  # Event bus implementation
  CLASS EventBus:
    handlers: Map<string, Array<Function>>
    history: Array<Event>

    FUNCTION on(event_name, handler):
      IF NOT handlers.has(event_name):
        handlers.set(event_name, [])

      handlers.get(event_name).push(handler)

      RETURN unsubscribe_function

    FUNCTION emit(event_name, payload):
      event = {
        name: event_name,
        payload: payload,
        timestamp: now(),
        source: get_caller_info()
      }

      # Store in history
      history.push(event)
      IF history.length > 1000:
        history.shift()  # Keep last 1000 events

      # Call handlers
      handlers_for_event = handlers.get(event_name) || []

      FOR handler IN handlers_for_event:
        TRY:
          AWAIT handler(event.payload)
        CATCH error:
          log_error("Event handler failed", {
            event: event_name,
            error: error
          })

    FUNCTION replay_event(event_id):
      event = history.find(e => e.id == event_id)
      IF event:
        emit(event.name, event.payload)

  # Event definitions
  EVENTS = {
    # Auth events
    "user.logged_in": { user_id: string },
    "user.logged_out": {},

    # Post events
    "post.created": { post_id: string, author_id: string },
    "post.liked": { post_id: string, user_id: string, post_author_id: string },
    "post.commented": { post_id: string, comment_id: string, user_id: string },

    # Social events
    "user.followed": { follower_id: string, followee_id: string },
    "friend_request.sent": { from_user_id: string, to_user_id: string }
  }

  # Example: Notification feature listens to events
  FUNCTION register_notification_handlers(event_bus):
    # Listen to post likes
    event_bus.on("post.liked", async (payload) => {
      # Don't notify if user liked their own post
      IF payload.user_id == payload.post_author_id:
        RETURN

      # Create notification
      AWAIT db.notification.create({
        user_id: payload.post_author_id,
        type: "like",
        actor_id: payload.user_id,
        target_id: payload.post_id,
        content: "liked your post",
        read: false
      })

      # Send real-time update if user online
      IF is_user_online(payload.post_author_id):
        send_websocket_message(payload.post_author_id, {
          type: "new_notification",
          notification_id: notification.id
        })
    })

    # Listen to new followers
    event_bus.on("user.followed", async (payload) => {
      AWAIT db.notification.create({
        user_id: payload.followee_id,
        type: "follow",
        actor_id: payload.follower_id,
        content: "started following you"
      })
    })

integration_points:
  - Event bus: apps/api/src/lib/events.ts
  - Event types: packages/api-contracts/src/events.ts
  - Event handlers: apps/api/src/features/*/events.ts
```

### 4. Media Integration Pattern

**Reference**: See `/docs/api-architecture.md` for file upload strategy.

```yaml
pattern: two-phase-media-upload
approach: |
  - Phase 1: Request upload URL from API
  - Phase 2: Upload directly to S3
  - Phase 3: Confirm upload completion
  - Use media IDs to reference uploaded files

pseudocode: |
  # Frontend: Upload media hook
  FUNCTION use_upload_media():
    [upload_progress, set_progress] = use_state(0)
    [upload_status, set_status] = use_state("idle")

    FUNCTION upload_media(file):
      set_status("initiating")

      # Phase 1: Request upload URL
      { upload_id, upload_url, media_id } = AWAIT api.media.initiate_upload({
        filename: file.name,
        content_type: file.type,
        size: file.size
      })

      # Phase 2: Upload to S3
      set_status("uploading")

      AWAIT upload_to_s3(upload_url, file, {
        on_progress: (progress) => {
          set_progress(progress)
        }
      })

      # Phase 3: Confirm completion
      set_status("completing")

      media = AWAIT api.media.complete_upload({
        upload_id: upload_id,
        media_id: media_id
      })

      set_status("completed")

      RETURN media

    RETURN {
      upload_media: upload_media,
      progress: upload_progress,
      status: upload_status
    }

  # Usage in post composer
  COMPONENT PostComposer():
    { upload_media, progress, status } = use_upload_media()
    [media_ids, set_media_ids] = use_state([])

    FUNCTION handle_file_select(file):
      TRY:
        media = AWAIT upload_media(file)
        set_media_ids([...media_ids, media.id])
      CATCH error:
        show_error("Upload failed: " + error.message)

    FUNCTION handle_submit():
      AWAIT api.post.create({
        content: content,
        media_ids: media_ids  # Reference uploaded media
      })

    RETURN (
      <Form>
        <FileInput on_change={handle_file_select} />

        {status == "uploading" AND (
          <ProgressBar value={progress} />
        )}

        <MediaPreview media_ids={media_ids} />

        <Button on_click={handle_submit}>Publish</Button>
      </Form>
    )

integration_points:
  - Upload hook: apps/pwa/src/features/media/hooks/useUploadMedia.ts
  - S3 upload: apps/pwa/src/lib/s3.ts
  - Media API: apps/api/src/rpc/routers/media.ts
  - Media storage: AWS S3 bucket configuration
```

---

## Summary

This document defines the cross-cutting patterns used throughout VRSS:

**System-Wide Patterns**:
- Security: Better-auth session-based authentication with authorization checks
- Error Handling: Standardized RPC error codes with user-friendly messages
- Performance: Multi-layer caching with optimistic updates
- Logging: Structured JSON logging with audit trails

**Code Patterns**:
- Component Structure: Domain-driven organization with clear boundaries
- State Management: Multi-layer approach (server/global/feature/local)
- Data Processing: Transform at boundaries, use domain models
- Error Handling: Handle at boundaries with appropriate feedback

**Test Pattern**:
- Behavior Verification: Test user-facing behavior with realistic data

**Integration Points**:
- Feature Integration: Consistent registration and connection points
- Data Flow: Unidirectional flow with optimistic updates
- Event System: Type-safe event-driven cross-feature communication
- Media Integration: Two-phase upload with S3 direct upload

All patterns reference existing architecture documentation:
- Frontend patterns: `/docs/frontend-architecture.md`
- Security patterns: `/docs/SECURITY_DESIGN.md`
- API patterns: `/docs/api-architecture.md`

---

**Document Control**
- **Created**: 2025-10-16
- **Version**: 1.0
- **Status**: Design Phase
- **References**:
  - `/docs/frontend-architecture.md`
  - `/docs/SECURITY_DESIGN.md`
  - `/docs/api-architecture.md`
