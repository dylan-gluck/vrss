# User Router Implementation Guide

**Test File**: `apps/api/test/rpc/user.test.ts`

**Implementation File**: `apps/api/src/rpc/routers/user.ts` (to be created)

This guide provides implementation patterns based on the test requirements and existing router patterns.

---

## Router Structure Template

```typescript
/**
 * User Router - Phase 3.1
 *
 * Implements user profile management procedures for the VRSS Social Platform.
 *
 * Procedures:
 * - user.getProfile: View user profiles with visibility checks
 * - user.updateProfile: Update profile information
 * - user.updateStyle: Update profile customization
 * - user.updateSections: Manage profile sections
 * - user.getSections: Retrieve profile sections
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.1
 * @see test/rpc/user.test.ts for test coverage
 */

import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { ProcedureContext } from "../types";
import { ErrorCode } from "@vrss/api-contracts";

const prisma = new PrismaClient();

// =============================================================================
// ERROR HANDLING
// =============================================================================

class RPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RPCError";
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Display name: 1-100 characters
const displayNameSchema = z
  .string()
  .min(1, "Display name must be at least 1 character")
  .max(100, "Display name must be at most 100 characters");

// Bio: max 500 characters
const bioSchema = z
  .string()
  .max(500, "Bio must be at most 500 characters")
  .optional();

// Avatar URL validation
const avatarUrlSchema = z
  .string()
  .url("Invalid avatar URL")
  .optional();

// Visibility enum
const visibilitySchema = z.enum(["public", "followers", "private"]);

// Hex color validation
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color format");

// URL validation
const urlSchema = z.string().url("Invalid URL format");

// Section type validation
const sectionTypeSchema = z.enum([
  "feed",
  "gallery",
  "links",
  "static_text",
  "static_image",
  "video",
  "reposts",
  "friends",
  "followers",
  "following",
  "list",
]);

// Background config schema
const backgroundConfigSchema = z.object({
  color: hexColorSchema.optional(),
  image: urlSchema.optional(),
  position: z.string().optional(),
  repeat: z.string().optional(),
});

// Music config schema
const musicConfigSchema = z.object({
  url: urlSchema,
  autoplay: z.boolean().optional(),
  volume: z.number().min(0).max(1).optional(),
  loop: z.boolean().optional(),
});

// Style config schema
const styleConfigSchema = z.object({
  fontFamily: z.string().optional(),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
});

// Profile section schema
const profileSectionSchema = z.object({
  id: z.string().optional(),
  type: sectionTypeSchema,
  title: z.string().max(100),
  description: z.string().optional(),
  config: z.record(z.any()),
  displayOrder: z.number().int().min(0),
  isVisible: z.boolean().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has permission to view profile based on visibility
 */
async function canViewProfile(
  profileUserId: bigint,
  visibility: string,
  currentUserId: string | null
): Promise<boolean> {
  // Public profiles: anyone can view
  if (visibility === "public") {
    return true;
  }

  // Not authenticated: can only view public
  if (!currentUserId) {
    return false;
  }

  // Owner can always view their own profile
  if (currentUserId === profileUserId.toString()) {
    return true;
  }

  // Private profiles: only owner can view
  if (visibility === "private") {
    return false;
  }

  // Followers-only: check if user follows the profile owner
  if (visibility === "followers") {
    const followRelation = await prisma.userFollow.findFirst({
      where: {
        followerId: BigInt(currentUserId),
        followingId: profileUserId,
      },
    });
    return followRelation !== null;
  }

  return false;
}

/**
 * Check storage quota before allowing upload
 */
async function checkStorageQuota(
  userId: bigint,
  additionalBytes: bigint
): Promise<void> {
  const storage = await prisma.storageUsage.findUnique({
    where: { userId },
  });

  if (!storage) {
    throw new RPCError(
      ErrorCode.NOT_FOUND,
      "Storage quota not found"
    );
  }

  if (storage.usedBytes + additionalBytes > storage.quotaBytes) {
    throw new RPCError(
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
      "Storage quota exceeded",
      {
        used: storage.usedBytes.toString(),
        quota: storage.quotaBytes.toString(),
        needed: additionalBytes.toString(),
      }
    );
  }
}

// =============================================================================
// USER PROCEDURES
// =============================================================================

export const userRouter = {
  /**
   * user.getProfile - Get user profile with style and sections
   *
   * Returns complete profile data respecting visibility settings.
   */
  "user.getProfile": async (
    ctx: ProcedureContext<{ username: string }>
  ) => {
    const { username } = ctx.input;

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new RPCError(
        ErrorCode.USER_NOT_FOUND,
        `User '${username}' not found`
      );
    }

    if (!user.profile) {
      throw new RPCError(
        ErrorCode.NOT_FOUND,
        "User profile not found"
      );
    }

    // Check visibility permissions
    const canView = await canViewProfile(
      user.id,
      user.profile.visibility,
      ctx.user?.id ?? null
    );

    if (!canView) {
      throw new RPCError(
        ErrorCode.FORBIDDEN,
        "You do not have permission to view this profile"
      );
    }

    // Get sections (filter by visibility for non-owners)
    const isOwner = ctx.user?.id === user.id.toString();
    const sections = await prisma.profileSection.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isVisible: true }),
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        displayName: user.profile.displayName ?? user.username,
        bio: user.profile.bio,
        avatarUrl: null, // TODO: Implement avatar storage
        visibility: user.profile.visibility,
      },
      style: {
        backgroundConfig: user.profile.backgroundConfig,
        musicConfig: user.profile.musicConfig,
        styleConfig: user.profile.styleConfig,
      },
      sections: sections.map((s) => ({
        id: s.id.toString(),
        type: s.type,
        title: s.title,
        description: s.description,
        config: s.config,
        displayOrder: s.displayOrder,
        isVisible: s.isVisible,
      })),
    };
  },

  /**
   * user.updateProfile - Update profile information
   *
   * Allows owner to update display name, bio, avatar, and visibility.
   */
  "user.updateProfile": async (
    ctx: ProcedureContext<{
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      visibility?: string;
    }>
  ) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const input = z
      .object({
        displayName: displayNameSchema.optional(),
        bio: bioSchema,
        avatarUrl: avatarUrlSchema,
        visibility: visibilitySchema.optional(),
      })
      .parse(ctx.input);

    // Get user's profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId: BigInt(ctx.user.id) },
    });

    if (!profile) {
      throw new RPCError(
        ErrorCode.NOT_FOUND,
        "Profile not found"
      );
    }

    // Update profile
    const updatedProfile = await prisma.userProfile.update({
      where: { userId: BigInt(ctx.user.id) },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
        // TODO: Handle avatarUrl with storage quota check
      },
      include: {
        user: true,
      },
    });

    return {
      user: {
        id: updatedProfile.userId.toString(),
        username: updatedProfile.user.username,
        displayName: updatedProfile.displayName ?? updatedProfile.user.username,
        bio: updatedProfile.bio,
        visibility: updatedProfile.visibility,
      },
    };
  },

  // Additional procedures follow similar patterns...
};
```

---

## Implementation Patterns

### 1. Authentication Check
```typescript
if (!ctx.user) {
  throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
}
```

### 2. Authorization Check (Owner-only)
```typescript
if (ctx.user.id !== targetUserId.toString()) {
  throw new RPCError(ErrorCode.FORBIDDEN, "Access denied");
}
```

### 3. Visibility Check
```typescript
const canView = await canViewProfile(
  profileUserId,
  visibility,
  ctx.user?.id ?? null
);

if (!canView) {
  throw new RPCError(ErrorCode.FORBIDDEN, "Cannot view profile");
}
```

### 4. Input Validation with Zod
```typescript
const validated = schema.safeParse(ctx.input);
if (!validated.success) {
  throw new RPCError(
    ErrorCode.VALIDATION_ERROR,
    validated.error.errors[0].message,
    { field: validated.error.errors[0].path[0] }
  );
}
```

### 5. JSONB Partial Updates
```typescript
// Merge with existing config
const updatedConfig = {
  ...existingProfile.styleConfig,
  ...input.styleConfig,
};

await prisma.userProfile.update({
  where: { userId },
  data: { styleConfig: updatedConfig },
});
```

### 6. Storage Quota Check
```typescript
// Before uploading avatar
await checkStorageQuota(userId, BigInt(avatarSizeBytes));

// After upload
await prisma.storageUsage.update({
  where: { userId },
  data: {
    usedBytes: { increment: BigInt(avatarSizeBytes) },
    imagesBytes: { increment: BigInt(avatarSizeBytes) },
  },
});
```

### 7. Section Management
```typescript
// Replace all sections (delete existing, create new)
await prisma.$transaction(async (tx) => {
  // Delete existing sections
  await tx.profileSection.deleteMany({
    where: { userId },
  });

  // Create new sections
  await tx.profileSection.createMany({
    data: input.sections.map((s, index) => ({
      userId,
      type: s.type,
      title: s.title,
      description: s.description,
      config: s.config,
      displayOrder: index,
      isVisible: s.isVisible ?? true,
    })),
  });
});
```

---

## Key Implementation Notes

1. **BigInt Handling**: Always convert BigInt to string in responses
2. **Transactions**: Use Prisma transactions for multi-table operations
3. **JSONB Fields**: Parse/stringify carefully, support partial updates
4. **Error Codes**: Use ErrorCode enum from @vrss/api-contracts
5. **Null Safety**: Handle nullable fields gracefully
6. **Follow Relationships**: Query UserFollow table for visibility checks
7. **Display Order**: Auto-assign display_order when creating sections
8. **Visibility Defaults**: Use "public" as default visibility
9. **Owner Detection**: Compare ctx.user.id (string) with userId (BigInt)
10. **Response Structure**: Match exact structure from API contracts

---

## Testing Strategy

1. **Run tests**: `bun test test/rpc/user.test.ts`
2. **Expect RED**: Tests will fail until procedures are implemented
3. **Implement one procedure at a time**
4. **Run tests after each procedure**: Watch tests turn GREEN
5. **Refactor**: Clean up code while keeping tests GREEN
6. **Measure coverage**: Aim for 90%+ line coverage

---

## Common Pitfalls

1. **BigInt Comparison**: Use `.toString()` when comparing BigInt to string
2. **JSONB Type**: Prisma returns `JsonValue` - cast appropriately
3. **Empty Arrays**: Return `[]` for no sections, not `null`
4. **Visibility Enum**: Validate against exact enum values
5. **Follow Check**: Remember it's a bidirectional relationship
6. **Transaction Rollback**: Wrap multi-step operations in `prisma.$transaction`
7. **Error Messages**: Be specific but don't leak sensitive info
8. **Null vs Undefined**: Use consistent handling for optional fields

---

## Integration with Existing Routers

The User Router will be integrated into the main RPC router:

```typescript
// apps/api/src/rpc/index.ts
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";

export const router = {
  ...authRouter,
  ...userRouter,
  // ... other routers
};
```

---

## Next Steps After Implementation

1. **Integration Tests**: Test procedures via HTTP endpoint
2. **Performance Testing**: Check query efficiency with large datasets
3. **Security Review**: Validate all authorization checks
4. **Documentation**: Update API docs with examples
5. **Frontend Integration**: Connect web app to new endpoints

---

**Created**: 2025-10-16
**For**: User Router Implementation (Phase 3.1)
**Reference**: apps/api/test/rpc/user.test.ts
