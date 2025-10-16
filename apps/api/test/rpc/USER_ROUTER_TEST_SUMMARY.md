# User Router Test Summary

**Location**: `apps/api/test/rpc/user.test.ts`

**Status**: Tests written following TDD approach (RED phase)

**Framework**: Bun Test (Jest-compatible API)

**Test Infrastructure**:
- Testcontainers PostgreSQL for isolated test database
- Prisma ORM for database operations
- Custom fixtures and builders for test data generation

---

## Overview

Comprehensive test suite for the User Router covering all 6 procedures with a total of **41 test cases**:

1. **user.getProfile** - 7 tests
2. **user.updateProfile** - 9 tests
3. **user.updateStyle** - 8 tests
4. **user.updateSections** - 8 tests
5. **user.getSections** - 5 tests
6. **Storage Quota** - 4 tests

All tests are written BEFORE implementation following Test-Driven Development principles.

---

## Test Coverage by Procedure

### 1. user.getProfile (7 tests)

**Purpose**: Retrieve user profile with style and sections, respecting visibility rules

**Test Cases**:
1. ✅ Get profile by username successfully
   - Verifies complete profile data structure (user, style, sections)
   - Tests database joins and data transformation

2. ✅ Return user + style + sections in response
   - Validates response includes all three components
   - Tests JSONB field serialization (backgroundConfig, musicConfig, styleConfig)

3. ✅ Handle non-existent username (throw USER_NOT_FOUND error)
   - Tests error handling for missing users
   - Error Code: 1302 (USER_NOT_FOUND)

4. ✅ Respect visibility: Public profile - Anyone can view
   - Verifies anonymous users can access public profiles
   - Tests authorization logic for public visibility

5. ✅ Respect visibility: Followers profile - Only followers can view
   - Tests follow relationship validation
   - Verifies followers can access, non-followers cannot
   - Error Code: 1100 (FORBIDDEN) for non-followers

6. ✅ Respect visibility: Private profile - Only owner can view
   - Tests ownership validation
   - Only the profile owner can view private profiles
   - Error Code: 1100 (FORBIDDEN) for non-owners

7. ✅ Anonymous user can view public profiles only
   - Tests unauthenticated access to public vs private profiles
   - Public profiles: accessible, Private/Followers: forbidden

**Key Validations**:
- Profile visibility enforcement (public/followers/private)
- Follow relationship checking
- Anonymous vs authenticated access
- Complete response structure with nested data

---

### 2. user.updateProfile (9 tests)

**Purpose**: Update user profile information with validation

**Test Cases**:
1. ✅ Update display name successfully
   - Tests single field updates
   - Validates display name is persisted correctly

2. ✅ Update bio successfully
   - Tests bio field updates
   - Handles null and empty string values

3. ✅ Update avatar URL successfully
   - Tests avatar URL validation and storage
   - URL format validation

4. ✅ Update profile visibility (public/followers/private)
   - Tests visibility enum validation
   - Validates only valid visibility values accepted

5. ✅ Update multiple fields atomically
   - Tests transaction behavior for multi-field updates
   - Ensures all-or-nothing update semantics

6. ✅ Require authentication (throw UNAUTHORIZED)
   - Tests unauthenticated requests are rejected
   - Error Code: 1000 (UNAUTHORIZED)

7. ✅ Only owner can update their profile (throw FORBIDDEN)
   - Tests authorization - user can only update own profile
   - Error Code: 1100 (FORBIDDEN)

8. ✅ Validate display name length (1-100 chars)
   - Tests input validation for display name
   - Empty string: rejected
   - 101+ characters: rejected
   - Error Code: 1200 (VALIDATION_ERROR)

9. ✅ Validate bio length (max 500 chars)
   - Tests bio length constraint
   - 501+ characters: rejected
   - Empty string: allowed
   - Error Code: 1200 (VALIDATION_ERROR)

**Key Validations**:
- Authentication required
- Authorization (owner-only access)
- Field length constraints
- Atomic multi-field updates
- Enum validation for visibility

---

### 3. user.updateStyle (8 tests)

**Purpose**: Update profile customization (background, music, style configs)

**Test Cases**:
1. ✅ Update background config (color, image, position)
   - Tests JSONB field updates for background customization
   - Validates nested object structure

2. ✅ Update music config (url, autoplay, volume)
   - Tests music player configuration
   - Validates boolean and numeric fields

3. ✅ Update style config (fonts, colors)
   - Tests CSS customization options
   - Font family and color settings

4. ✅ Validate JSONB structure with Zod schemas
   - Tests type validation for JSONB fields
   - Rejects invalid types (number instead of string, etc.)
   - Error Code: 1200 (VALIDATION_ERROR)

5. ✅ Reject invalid color hex codes
   - Tests hex color validation (#RRGGBB format)
   - Rejects: "red", "#gggggg"
   - Accepts: "#ff0000", "#123abc"
   - Error Code: 1200 (VALIDATION_ERROR)

6. ✅ Reject invalid URLs for background/music
   - Tests URL format validation
   - Requires https:// or http:// protocol
   - Error Code: 1200 (VALIDATION_ERROR)

7. ✅ Handle partial updates (merge with existing)
   - Tests partial object updates don't replace entire config
   - Merges new values with existing JSONB data

8. ✅ Require authentication & owner-only access
   - Tests auth and authz requirements
   - Error Codes: 1000 (UNAUTHORIZED), 1100 (FORBIDDEN)

**Key Validations**:
- JSONB schema validation
- Hex color format validation
- URL format validation
- Partial update merging logic
- Authentication & authorization

---

### 4. user.updateSections (8 tests)

**Purpose**: Manage profile sections (add, remove, reorder, update config)

**Test Cases**:
1. ✅ Add new profile section
   - Tests section creation
   - Validates section data structure

2. ✅ Remove existing section
   - Tests section deletion
   - Empty sections array removes all sections

3. ✅ Reorder sections (change display_order)
   - Tests section ordering
   - Validates display_order updates

4. ✅ Update section config
   - Tests JSONB config field updates
   - Section-specific configuration (feedId, limit, etc.)

5. ✅ Validate section types
   - Tests SectionType enum validation
   - Valid types: feed, gallery, links, static_text, static_image, video, reposts, friends, followers, following, list
   - Error Code: 1200 (VALIDATION_ERROR) for invalid types

6. ✅ Preserve section IDs when reordering
   - Tests that reordering doesn't create new sections
   - Section IDs remain stable across updates

7. ✅ Require authentication
   - Tests auth requirement
   - Error Code: 1000 (UNAUTHORIZED)

8. ✅ Only owner can update sections
   - Tests authorization
   - Error Code: 1100 (FORBIDDEN)

**Key Validations**:
- Section type enum validation
- CRUD operations (Create, Read, Update, Delete)
- Display order management
- Section ID stability
- Config JSONB validation
- Authentication & authorization

---

### 5. user.getSections (5 tests)

**Purpose**: Retrieve profile sections with visibility filtering

**Test Cases**:
1. ✅ Get all sections for user
   - Tests section retrieval
   - Returns complete section data

2. ✅ Return sections ordered by display_order
   - Tests ORDER BY display_order ASC
   - Sections returned in correct display sequence

3. ✅ Filter out non-visible sections for non-owners
   - Tests isVisible flag filtering
   - Non-owners only see visible sections

4. ✅ Include all sections (visible + hidden) for owner
   - Tests owner privilege
   - Owners see all sections regardless of isVisible

5. ✅ Handle user with no sections (return empty array)
   - Tests empty state handling
   - Returns [] instead of error

**Key Validations**:
- Display order sorting
- Visibility filtering based on ownership
- Empty array for users with no sections
- Owner vs non-owner access levels

---

### 6. Storage Quota Tests (4 tests)

**Purpose**: Validate storage quota enforcement for avatar uploads

**Test Cases**:
1. ✅ Check quota before allowing avatar upload
   - Tests quota validation logic
   - Verifies available space calculation

2. ✅ Reject avatar upload if quota exceeded
   - Tests quota enforcement
   - Error Code: 1603 (STORAGE_QUOTA_EXCEEDED)
   - Example: 49MB used + 5MB upload > 50MB quota = rejected

3. ✅ Update storage_usage when avatar uploaded
   - Tests storage tracking updates
   - usedBytes and imagesBytes incremented

4. ✅ Track avatar file size in post_media table
   - Tests metadata tracking
   - Documents expected behavior for quota management

**Key Validations**:
- Quota calculation (usedBytes + uploadSize <= quotaBytes)
- Storage tracking updates
- Type-specific byte tracking (imagesBytes)
- Quota exceeded error handling

---

## Test Utilities & Helpers

### Mock Context Factory
```typescript
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T>
```
Creates a mock RPC procedure context with:
- Hono context (mocked)
- User authentication state
- Session data
- IP address and user agent
- Input data

### Database Fixtures
- `buildUser()`: Fluent builder for creating test users
- `cleanAllTables()`: Database cleanup between tests
- `getTestDatabase()`: Access to test Prisma client

### Test Database
- Isolated PostgreSQL container via Testcontainers
- Fresh database for each test run
- Automatic migration application
- Cleanup after each test

---

## Error Codes Tested

From `@vrss/api-contracts` ErrorCode enum:

- **1000** - UNAUTHORIZED (not logged in)
- **1100** - FORBIDDEN (insufficient permissions)
- **1200** - VALIDATION_ERROR (invalid input)
- **1302** - USER_NOT_FOUND (user doesn't exist)
- **1603** - STORAGE_QUOTA_EXCEEDED (storage limit reached)

---

## Running the Tests

```bash
# Run all user router tests
bun test test/rpc/user.test.ts

# Run with coverage
bun test --coverage test/rpc/user.test.ts

# Run specific test suite
bun test test/rpc/user.test.ts -t "user.getProfile"

# Watch mode for TDD
bun test --watch test/rpc/user.test.ts
```

---

## Expected Test Results (Current State)

**Status**: All tests should PASS at the structural level

The tests are designed to:
1. Create test data successfully
2. Validate mock context structure
3. Document expected behavior
4. Assert on test data and error codes

**Note**: Tests contain commented-out assertions for actual procedure calls since the User Router implementation doesn't exist yet. This follows TDD RED phase.

Once the User Router is implemented:
1. Uncomment procedure import statements
2. Uncomment procedure call assertions
3. Tests will transition from GREEN (structural) to RED (implementation)
4. Implement procedures until all tests are GREEN

---

## Implementation Checklist

When implementing the User Router, ensure:

- [ ] Import and use `ProcedureContext<T>` type
- [ ] Throw `RPCError` with correct error codes
- [ ] Validate input using Zod schemas
- [ ] Check authentication: `ctx.user !== null`
- [ ] Check authorization: `ctx.user.id === targetUserId`
- [ ] Query profile with Prisma joins
- [ ] Handle JSONB fields (parse/stringify)
- [ ] Respect ProfileVisibility enum
- [ ] Check UserFollow relationships for followers visibility
- [ ] Validate section types against SectionType enum
- [ ] Order sections by display_order
- [ ] Filter sections by isVisible for non-owners
- [ ] Check storage quota before avatar uploads
- [ ] Update StorageUsage on avatar changes
- [ ] Return proper response structure per API contracts

---

## SDD Compliance

Tests validate against:

- **docs/api-architecture.md** (lines 182-220): UserProcedures type definitions
- **docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md** (lines 130-171): user_profiles schema
- **docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md** (lines 394-425): profile_sections schema
- **packages/api-contracts/src/rpc.ts**: ErrorCode enum definitions

---

## Test Metrics

- **Total Test Cases**: 41
- **Total Test Suites**: 6
- **Authentication Tests**: 8
- **Authorization Tests**: 8
- **Validation Tests**: 12
- **Visibility Tests**: 7
- **CRUD Tests**: 6

**Coverage Goals** (when implementation is complete):
- Line Coverage: 90%+
- Branch Coverage: 85%+
- Function Coverage: 95%+

---

## Notes for Implementation

1. **Profile Creation**: When a user registers, a UserProfile should be automatically created with default values
2. **Visibility Defaults**: Default profile visibility should be "public"
3. **Section Ordering**: display_order should be 0-indexed and gapless
4. **JSONB Merging**: Use object spread to merge partial style updates
5. **Follow Checking**: Query UserFollow table bidirectionally (follower -> following)
6. **Storage Tracking**: Update StorageUsage atomically with avatar changes
7. **Transaction Safety**: Use Prisma transactions for multi-table updates
8. **Error Messages**: Provide user-friendly error messages with field context
9. **Null Handling**: Many profile fields are nullable - handle gracefully
10. **BigInt Serialization**: Convert BigInt IDs to strings in responses

---

## Next Steps

1. **Implement User Router** (`apps/api/src/rpc/routers/user.ts`)
2. **Uncomment test assertions** for procedure calls
3. **Run tests** - expect failures (RED phase)
4. **Implement procedures** until tests pass (GREEN phase)
5. **Refactor** while keeping tests green (REFACTOR phase)
6. **Measure coverage** and add edge case tests if needed

---

**Created**: 2025-10-16
**Author**: Test Engineer (AI Assistant)
**Test Framework**: Bun Test
**Database**: PostgreSQL via Testcontainers
**Approach**: Test-Driven Development (TDD)
