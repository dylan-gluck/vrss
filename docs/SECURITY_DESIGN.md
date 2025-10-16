# VRSS Security & Authentication Design

## Overview

This document defines the security architecture for VRSS social platform MVP using Better-auth with Bun + Hono backend. The design prioritizes security best practices while maintaining developer experience and performance.

**Last Updated:** 2025-10-16
**Status:** Design Phase
**Version:** 1.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Better-auth Integration](#better-auth-integration)
3. [Authentication Flows](#authentication-flows)
4. [Session Management](#session-management)
5. [Authorization Patterns](#authorization-patterns)
6. [API Security](#api-security)
7. [Media Upload Security](#media-upload-security)
8. [Data Protection](#data-protection)
9. [Privacy Controls](#privacy-controls)
10. [Security Headers & Configuration](#security-headers--configuration)
11. [Secrets Management](#secrets-management)
12. [Rate Limiting](#rate-limiting)
13. [Security Checklist](#security-checklist)

---

## Architecture Overview

### Tech Stack
- **Backend**: Bun + Hono (API Server)
- **Database**: PostgreSQL (user data, sessions)
- **Storage**: S3-compatible (media files)
- **Frontend**: React/Vite (PWA)
- **Auth Library**: Better-auth

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  - HTTPS Only                                            │
│  - Secure Cookie Storage                                 │
│  - Content Security Policy                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     CDN / Edge Layer                     │
│  - DDoS Protection                                       │
│  - TLS Termination                                       │
│  - Rate Limiting (L7)                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Server (Hono)                      │
│  - Better-auth Middleware                                │
│  - Input Validation                                      │
│  - CSRF Protection                                       │
│  - Authorization Checks                                  │
│  - Request Rate Limiting                                 │
└─────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
┌──────────────────────┐  ┌──────────────────────┐
│    PostgreSQL        │  │   S3 Storage         │
│  - Encrypted at Rest │  │  - Signed URLs       │
│  - TLS Connections   │  │  - Access Control    │
│  - Row-Level Security│  │  - Encryption        │
└──────────────────────┘  └──────────────────────┘
```

---

## Better-auth Integration

### Installation & Setup

```bash
# Install Better-auth
bun add better-auth

# Install database adapter
bun add @better-auth/prisma-adapter  # or postgres adapter
```

### Core Configuration

**File**: `src/lib/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security settings
  advanced: {
    cookieSameSite: "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    cookiePrefix: "vrss",
    generateId: false, // Use database auto-increment
  },

  // Base URL for email links
  baseURL: process.env.APP_URL || "http://localhost:3000",

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET,

  // Trusted origins
  trustedOrigins: [
    process.env.APP_URL || "http://localhost:3000",
    process.env.WEB_URL || "http://localhost:5173",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

### Database Schema

Better-auth requires specific tables. Using Prisma:

**File**: `prisma/schema.prisma`

```prisma
// Better-auth User model
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   Boolean   @default(false)
  name            String?
  username        String    @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Password hash (managed by Better-auth)
  password        Password?

  // Sessions
  sessions        Session[]

  // VRSS specific fields
  profile         Profile?
  posts           Post[]
  storageUsed     Int       @default(0) // bytes
  storageLimit    Int       @default(52428800) // 50MB default
  profileVisibility ProfileVisibility @default(PUBLIC)

  @@index([email])
  @@index([username])
}

model Password {
  hash   String
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@index([token])
}

enum ProfileVisibility {
  PUBLIC    // Anyone can view
  PRIVATE   // Only approved followers
  UNLISTED  // Only with direct link
}

// Additional VRSS models
model Profile {
  id             String  @id @default(cuid())
  userId         String  @unique
  bio            String?
  backgroundColor String?
  backgroundImage String?
  backgroundMusic String?
  customCss      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id          String   @id @default(cuid())
  userId      String
  content     String
  mediaUrls   String[] // Array of S3 URLs
  visibility  PostVisibility @default(PUBLIC)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}

enum PostVisibility {
  PUBLIC
  FOLLOWERS
  PRIVATE
}
```

### Hono Middleware Integration

**File**: `src/middleware/auth.ts`

```typescript
import { Context, MiddlewareHandler } from "hono";
import { auth } from "../lib/auth";
import { getCookie } from "hono/cookie";

// Type augmentation for Hono context
declare module "hono" {
  interface ContextVariableMap {
    user: typeof auth.$Infer.User | null;
    session: typeof auth.$Infer.Session | null;
  }
}

/**
 * Auth middleware - attaches user/session to context if authenticated
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const sessionToken = getCookie(c, "vrss.session_token");

  if (sessionToken) {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (session) {
        c.set("user", session.user);
        c.set("session", session.session);
      }
    } catch (error) {
      console.error("Session validation failed:", error);
    }
  }

  await next();
};

/**
 * Protected route middleware - requires authentication
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Authentication required",
      },
      401
    );
  }

  await next();
};

/**
 * Email verification middleware - requires verified email
 */
export const requireVerifiedEmail: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user?.emailVerified) {
    return c.json(
      {
        error: "Forbidden",
        message: "Email verification required",
      },
      403
    );
  }

  await next();
};

/**
 * Check if user owns resource
 */
export const requireOwnership = (
  getUserId: (c: Context) => Promise<string | null>
): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");
    const resourceUserId = await getUserId(c);

    if (!user || user.id !== resourceUserId) {
      return c.json(
        {
          error: "Forbidden",
          message: "Access denied",
        },
        403
      );
    }

    await next();
  };
};
```

---

## Authentication Flows

### 1. Registration Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant BetterAuth
    participant DB
    participant Email

    Client->>API: POST /api/auth/sign-up
    Note over Client,API: {email, password, username}

    API->>API: Validate input
    API->>API: Check username uniqueness
    API->>BetterAuth: signUp()

    BetterAuth->>BetterAuth: Hash password (bcrypt)
    BetterAuth->>DB: Create user record
    BetterAuth->>DB: Create verification token
    BetterAuth->>Email: Send verification email
    BetterAuth-->>API: User created (unverified)

    API-->>Client: 201 Created
    Note over Client,API: {user, requiresVerification: true}

    Client->>Client: Show "Check your email" message

    Note over Client,Email: User clicks email link
    Client->>API: GET /api/auth/verify-email?token=xxx
    API->>BetterAuth: verifyEmail(token)
    BetterAuth->>DB: Mark email as verified
    BetterAuth->>DB: Create session
    BetterAuth-->>API: Session created

    API-->>Client: Set cookie + redirect
    Note over Client: User is now authenticated
```

**Implementation**: `src/routes/auth.ts`

```typescript
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { rateLimiter } from "../middleware/rate-limit";

const authRouter = new Hono();

// Registration schema
const signUpSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
  name: z.string().min(1).max(100).optional(),
});

// Sign up endpoint
authRouter.post(
  "/sign-up",
  rateLimiter({ limit: 5, window: 3600 }), // 5 attempts per hour
  zValidator("json", signUpSchema),
  async (c) => {
    const data = c.req.valid("json");

    try {
      // Check username uniqueness (Better-auth checks email)
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser) {
        return c.json(
          {
            error: "ValidationError",
            message: "Username already taken",
          },
          400
        );
      }

      // Create user via Better-auth
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          callbackURL: "/auth/verify-success",
        },
        headers: c.req.raw.headers,
      });

      // Update username (Better-auth doesn't handle custom fields)
      if (result?.user) {
        await prisma.user.update({
          where: { id: result.user.id },
          data: { username: data.username },
        });
      }

      return c.json(
        {
          success: true,
          requiresVerification: true,
          message: "Please check your email to verify your account",
        },
        201
      );
    } catch (error) {
      console.error("Sign up error:", error);
      return c.json(
        {
          error: "SignUpError",
          message: "Failed to create account",
        },
        500
      );
    }
  }
);

export default authRouter;
```

### 2. Login Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant BetterAuth
    participant DB

    Client->>API: POST /api/auth/sign-in
    Note over Client,API: {email, password}

    API->>API: Rate limit check
    API->>BetterAuth: signIn()

    BetterAuth->>DB: Find user by email
    BetterAuth->>BetterAuth: Verify password (bcrypt compare)

    alt Valid credentials
        BetterAuth->>DB: Create session
        BetterAuth->>DB: Store session token
        BetterAuth-->>API: Session created
        API-->>Client: 200 OK + Set-Cookie
        Note over Client: Store session in cookie
    else Invalid credentials
        BetterAuth-->>API: Error
        API-->>Client: 401 Unauthorized
        Note over API: Increment failed attempts
    end
```

**Implementation**:

```typescript
// Login schema
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post(
  "/sign-in",
  rateLimiter({ limit: 10, window: 900 }), // 10 attempts per 15 minutes
  zValidator("json", signInSchema),
  async (c) => {
    const data = c.req.valid("json");

    try {
      const result = await auth.api.signInEmail({
        body: {
          email: data.email,
          password: data.password,
        },
        headers: c.req.raw.headers,
      });

      if (!result?.user) {
        return c.json(
          {
            error: "AuthenticationError",
            message: "Invalid email or password",
          },
          401
        );
      }

      // Check email verification
      if (!result.user.emailVerified) {
        return c.json(
          {
            error: "EmailNotVerified",
            message: "Please verify your email before signing in",
            requiresVerification: true,
          },
          403
        );
      }

      return c.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          name: result.user.name,
        },
      });
    } catch (error) {
      console.error("Sign in error:", error);
      return c.json(
        {
          error: "AuthenticationError",
          message: "Invalid email or password",
        },
        401
      );
    }
  }
);
```

### 3. Logout Flow

```typescript
authRouter.post("/sign-out", requireAuth, async (c) => {
  try {
    await auth.api.signOut({
      headers: c.req.raw.headers,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Sign out error:", error);
    return c.json(
      {
        error: "SignOutError",
        message: "Failed to sign out",
      },
      500
    );
  }
});
```

### 4. Password Reset Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant BetterAuth
    participant DB
    participant Email

    Client->>API: POST /api/auth/forgot-password
    Note over Client,API: {email}

    API->>BetterAuth: forgetPassword()
    BetterAuth->>DB: Find user
    BetterAuth->>DB: Create reset token
    BetterAuth->>Email: Send reset email
    BetterAuth-->>API: Token sent
    API-->>Client: 200 OK

    Note over Client,Email: User clicks reset link
    Client->>API: POST /api/auth/reset-password
    Note over Client,API: {token, newPassword}

    API->>BetterAuth: resetPassword()
    BetterAuth->>DB: Verify token
    BetterAuth->>BetterAuth: Hash new password
    BetterAuth->>DB: Update password
    BetterAuth->>DB: Invalidate all sessions
    BetterAuth-->>API: Password updated
    API-->>Client: 200 OK
```

**Implementation**:

```typescript
// Forgot password
authRouter.post(
  "/forgot-password",
  rateLimiter({ limit: 3, window: 3600 }), // 3 attempts per hour
  zValidator("json", z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid("json");

    try {
      await auth.api.forgetPassword({
        body: {
          email,
          redirectTo: "/auth/reset-password",
        },
        headers: c.req.raw.headers,
      });

      // Always return success to prevent email enumeration
      return c.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      // Still return success for security
      return c.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }
  }
);

// Reset password
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    ),
});

authRouter.post(
  "/reset-password",
  rateLimiter({ limit: 5, window: 3600 }),
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");

    try {
      await auth.api.resetPassword({
        body: {
          token,
          password,
        },
        headers: c.req.raw.headers,
      });

      return c.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return c.json(
        {
          error: "ResetError",
          message: "Invalid or expired reset token",
        },
        400
      );
    }
  }
);
```

---

## Session Management

### Session Strategy

Better-auth uses **session cookies** with the following approach:

1. **Session Token**: Generated cryptographically secure random string
2. **Storage**: Database-backed (PostgreSQL)
3. **Cookie**: HttpOnly, Secure, SameSite=Lax
4. **Expiration**: 7 days with sliding window (updates every 24h)
5. **Refresh**: Automatic on activity

### Session Security Properties

```typescript
// Cookie configuration
{
  httpOnly: true,              // Prevents XSS access
  secure: true,                // HTTPS only (production)
  sameSite: 'lax',            // CSRF protection
  path: '/',
  maxAge: 60 * 60 * 24 * 7,   // 7 days
  domain: process.env.COOKIE_DOMAIN, // .vrss.app
}
```

### Session Validation Middleware

```typescript
/**
 * Validates and refreshes session on each request
 */
export const validateSession: MiddlewareHandler = async (c, next) => {
  const session = c.get("session");

  if (session) {
    // Check if session needs refresh (older than 24h)
    const age = Date.now() - session.updatedAt.getTime();
    const shouldRefresh = age > 60 * 60 * 24 * 1000; // 24 hours

    if (shouldRefresh) {
      try {
        await auth.api.updateSession({
          headers: c.req.raw.headers,
        });
      } catch (error) {
        console.error("Session refresh failed:", error);
        // Continue without refresh, session still valid
      }
    }
  }

  await next();
};
```

### Session Management Endpoints

```typescript
// Get current session
authRouter.get("/session", authMiddleware, async (c) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      emailVerified: user.emailVerified,
    },
    session: {
      expiresAt: session.expiresAt,
    },
  });
});

// List active sessions
authRouter.get("/sessions", requireAuth, async (c) => {
  const user = c.get("user");

  const sessions = await prisma.session.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ sessions });
});

// Revoke specific session
authRouter.delete("/sessions/:sessionId", requireAuth, async (c) => {
  const user = c.get("user");
  const sessionId = c.req.param("sessionId");

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
    },
  });

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  return c.json({ success: true });
});

// Revoke all sessions (except current)
authRouter.post("/sessions/revoke-all", requireAuth, async (c) => {
  const user = c.get("user");
  const currentSession = c.get("session");

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      id: { not: currentSession.id },
    },
  });

  return c.json({
    success: true,
    message: "All other sessions have been revoked",
  });
});
```

---

## Authorization Patterns

### 1. Resource Ownership

```typescript
/**
 * Check if user owns a post
 */
export const requirePostOwnership: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");
  const postId = c.req.param("postId");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  if (!post || post.userId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
};

// Usage
postRouter.delete("/:postId", requireAuth, requirePostOwnership, async (c) => {
  // Delete post
});
```

### 2. Profile Visibility Authorization

```typescript
/**
 * Check if user can view profile based on visibility settings
 */
export const checkProfileAccess = async (
  profileUserId: string,
  requestingUserId: string | null
): Promise<boolean> => {
  const profile = await prisma.user.findUnique({
    where: { id: profileUserId },
    select: {
      profileVisibility: true,
      followers: {
        where: { followerId: requestingUserId || "" },
        select: { id: true },
      },
    },
  });

  if (!profile) return false;

  // Owner can always access
  if (profileUserId === requestingUserId) return true;

  // Check visibility
  switch (profile.profileVisibility) {
    case "PUBLIC":
      return true;
    case "PRIVATE":
      // Only approved followers
      return profile.followers.length > 0;
    case "UNLISTED":
      // Anyone with direct link (no discovery)
      return true;
    default:
      return false;
  }
};

// Middleware
export const requireProfileAccess: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");
  const username = c.req.param("username");

  const profileUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!profileUser) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const hasAccess = await checkProfileAccess(profileUser.id, user?.id || null);

  if (!hasAccess) {
    return c.json({ error: "Access denied" }, 403);
  }

  await next();
};
```

### 3. Storage Quota Authorization

```typescript
/**
 * Check if user has enough storage quota
 */
export const checkStorageQuota = async (
  userId: string,
  additionalBytes: number
): Promise<{ allowed: boolean; reason?: string }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      storageUsed: true,
      storageLimit: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const newTotal = user.storageUsed + additionalBytes;

  if (newTotal > user.storageLimit) {
    return {
      allowed: false,
      reason: `Storage limit exceeded. Used: ${user.storageUsed}, Limit: ${user.storageLimit}`,
    };
  }

  return { allowed: true };
};

// Middleware
export const requireStorageQuota = (
  getFileSize: (c: Context) => Promise<number>
): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");
    const fileSize = await getFileSize(c);

    const quota = await checkStorageQuota(user.id, fileSize);

    if (!quota.allowed) {
      return c.json(
        {
          error: "StorageQuotaExceeded",
          message: quota.reason,
        },
        413
      );
    }

    await next();
  };
};
```

### 4. Role-Based Access (Future Enhancement)

```typescript
// For future admin features
enum UserRole {
  USER = "USER",
  MODERATOR = "MODERATOR",
  ADMIN = "ADMIN",
}

export const requireRole = (
  allowedRoles: UserRole[]
): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await next();
  };
};
```

---

## API Security

### 1. Input Validation

All endpoints use **Zod** for input validation:

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// Example: Create post schema
const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Content required")
    .max(5000, "Content too long")
    .trim(),
  mediaIds: z
    .array(z.string().uuid())
    .max(10, "Maximum 10 media files")
    .optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
});

postRouter.post(
  "/",
  requireAuth,
  requireVerifiedEmail,
  zValidator("json", createPostSchema),
  async (c) => {
    const data = c.req.valid("json");
    // Safe to use data - already validated
  }
);
```

### 2. CSRF Protection

Better-auth handles CSRF automatically via SameSite cookies, but for additional protection:

```typescript
import { csrf } from "hono/csrf";

// Add CSRF middleware to app
app.use(
  csrf({
    origin: [
      process.env.WEB_URL || "http://localhost:5173",
      process.env.APP_URL || "http://localhost:3000",
    ],
  })
);
```

### 3. XSS Protection

**Output Encoding**: Always sanitize user-generated content:

```typescript
import DOMPurify from "isomorphic-dompurify";

// Sanitize HTML content
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href"],
  });
};

// Before storing user content
const sanitizedContent = sanitizeHtml(data.content);
```

**Content Security Policy**: See [Security Headers](#security-headers--configuration)

### 4. SQL Injection Prevention

Using Prisma ORM provides automatic parameterization:

```typescript
// Safe - parameterized query
const user = await prisma.user.findUnique({
  where: { email: userInput }, // Automatically escaped
});

// Avoid raw queries, but if needed:
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`; // Still parameterized
```

### 5. Request Size Limits

```typescript
import { bodyLimit } from "hono/body-limit";

// Global limit
app.use(bodyLimit({ maxSize: 1024 * 1024 })); // 1MB

// Specific limit for uploads
uploadRouter.use(bodyLimit({ maxSize: 50 * 1024 * 1024 })); // 50MB
```

### 6. API Response Security

```typescript
/**
 * Never expose sensitive data in API responses
 */
export const sanitizeUser = (user: User) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  // Never include: email, password hash, sessions, etc.
});

/**
 * Consistent error responses (don't leak information)
 */
export const errorResponse = (c: Context, error: Error, statusCode = 500) => {
  console.error("API Error:", error);

  // Generic error message for production
  const message =
    process.env.NODE_ENV === "production"
      ? "An error occurred"
      : error.message;

  return c.json(
    {
      error: error.name || "Error",
      message,
      // Never include stack traces in production
    },
    statusCode
  );
};
```

---

## Media Upload Security

### Architecture

```
Client → API (validate) → Generate Presigned URL → Client uploads to S3
                              ↓
                      Store metadata in DB
```

### 1. Upload Flow

```typescript
/**
 * Request upload URL
 */
uploadRouter.post(
  "/request-upload",
  requireAuth,
  requireVerifiedEmail,
  zValidator(
    "json",
    z.object({
      filename: z.string().min(1).max(255),
      contentType: z.string(),
      size: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { filename, contentType, size } = c.req.valid("json");

    // 1. Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
    ];

    if (!allowedTypes.includes(contentType)) {
      return c.json(
        {
          error: "InvalidFileType",
          message: "File type not allowed",
        },
        400
      );
    }

    // 2. Check storage quota
    const quota = await checkStorageQuota(user.id, size);
    if (!quota.allowed) {
      return c.json(
        {
          error: "StorageQuotaExceeded",
          message: quota.reason,
        },
        413
      );
    }

    // 3. Generate unique filename
    const ext = filename.split(".").pop();
    const uniqueFilename = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // 4. Generate presigned URL (15 min expiration)
    const presignedUrl = await s3Client.getSignedUrl("putObject", {
      Bucket: process.env.S3_BUCKET,
      Key: uniqueFilename,
      ContentType: contentType,
      Expires: 900, // 15 minutes
      // Enforce content type
      Conditions: [["eq", "$Content-Type", contentType]],
    });

    // 5. Create pending upload record
    const upload = await prisma.upload.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        filename: uniqueFilename,
        originalFilename: filename,
        contentType,
        size,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return c.json({
      uploadId: upload.id,
      presignedUrl,
      expiresAt: upload.expiresAt,
    });
  }
);
```

### 2. Confirm Upload

```typescript
/**
 * Confirm upload completion
 */
uploadRouter.post(
  "/confirm-upload/:uploadId",
  requireAuth,
  async (c) => {
    const user = c.get("user");
    const uploadId = c.req.param("uploadId");

    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId: user.id,
        status: "PENDING",
      },
    });

    if (!upload) {
      return c.json({ error: "Upload not found" }, 404);
    }

    // Verify file exists in S3
    try {
      const headResult = await s3Client.headObject({
        Bucket: process.env.S3_BUCKET,
        Key: upload.filename,
      });

      // Update storage usage
      await prisma.user.update({
        where: { id: user.id },
        data: {
          storageUsed: {
            increment: upload.size,
          },
        },
      });

      // Mark upload as complete
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return c.json({
        success: true,
        upload: {
          id: upload.id,
          url: `${process.env.CDN_URL}/${upload.filename}`,
        },
      });
    } catch (error) {
      console.error("S3 verification failed:", error);
      return c.json(
        {
          error: "UploadVerificationFailed",
          message: "Could not verify upload",
        },
        400
      );
    }
  }
);
```

### 3. File Type Validation

```typescript
/**
 * Validate file type by magic bytes (not just extension)
 */
import { fileTypeFromBuffer } from "file-type";

export const validateFileType = async (
  buffer: ArrayBuffer
): Promise<{ valid: boolean; mimeType?: string }> => {
  const type = await fileTypeFromBuffer(buffer);

  if (!type) {
    return { valid: false };
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
  ];

  return {
    valid: allowedTypes.includes(type.mime),
    mimeType: type.mime,
  };
};
```

### 4. Image Processing (Optional)

```typescript
/**
 * Process uploaded images (resize, optimize)
 */
import sharp from "sharp";

export const processImage = async (
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Buffer> => {
  const { maxWidth = 2048, maxHeight = 2048, quality = 85 } = options;

  return await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, progressive: true })
    .toBuffer();
};
```

### 5. Virus Scanning (Production)

```typescript
/**
 * Scan uploaded files for malware (using ClamAV or cloud service)
 */
import { scanFile } from "./antivirus";

export const scanUpload = async (key: string): Promise<boolean> => {
  try {
    // Download from S3
    const file = await s3Client.getObject({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    // Scan file
    const safe = await scanFile(file.Body);

    if (!safe) {
      // Delete infected file
      await s3Client.deleteObject({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error("Virus scan failed:", error);
    return false;
  }
};
```

### 6. S3 Bucket Configuration

```typescript
// S3 bucket security settings
{
  // Block public access
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  },

  // Enable versioning
  VersioningConfiguration: {
    Status: 'Enabled',
  },

  // Server-side encryption
  ServerSideEncryptionConfiguration: {
    Rules: [{
      ApplyServerSideEncryptionByDefault: {
        SSEAlgorithm: 'AES256',
      },
    }],
  },

  // CORS configuration
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: [process.env.WEB_URL],
      AllowedMethods: ['PUT', 'POST'],
      AllowedHeaders: ['Content-Type'],
      MaxAgeSeconds: 3000,
    }],
  },

  // Lifecycle rules (delete expired uploads)
  LifecycleConfiguration: {
    Rules: [{
      Id: 'DeleteExpiredUploads',
      Status: 'Enabled',
      Expiration: { Days: 1 },
      Prefix: 'temp/',
    }],
  },
}
```

### 7. CDN Configuration (CloudFront)

```typescript
// CloudFront distribution settings
{
  // Origin
  Origins: [{
    DomainName: 's3-bucket.s3.amazonaws.com',
    OriginAccessControlId: 'OAC-ID', // Use OAC, not OAI
  }],

  // Cache behavior
  CacheBehaviors: [{
    PathPattern: '/media/*',
    CachePolicyId: 'CachingOptimized',
    ViewerProtocolPolicy: 'redirect-to-https',
  }],

  // Geo restrictions (if needed)
  Restrictions: {
    GeoRestriction: {
      RestrictionType: 'none',
    },
  },

  // HTTPS only
  ViewerCertificate: {
    ACMCertificateArn: 'arn:aws:acm:...',
    SSLSupportMethod: 'sni-only',
    MinimumProtocolVersion: 'TLSv1.2_2021',
  },
}
```

---

## Data Protection

### 1. Password Security

Better-auth uses **bcrypt** with automatic salt generation:

- **Algorithm**: bcrypt
- **Rounds**: 10 (default, adjustable)
- **Salt**: Automatically generated per password
- **Storage**: Hash stored in `Password` table

```typescript
// Password hashing is automatic via Better-auth
// No manual implementation needed

// Password requirements enforced in validation
const passwordSchema = z
  .string()
  .min(12, "Minimum 12 characters")
  .max(128, "Maximum 128 characters")
  .regex(/^(?=.*[a-z])/, "Must contain lowercase")
  .regex(/^(?=.*[A-Z])/, "Must contain uppercase")
  .regex(/^(?=.*\d)/, "Must contain number")
  .regex(/^(?=.*[@$!%*?&])/, "Must contain special character");
```

### 2. Database Encryption

**At Rest**:
```sql
-- PostgreSQL encryption at rest (managed by cloud provider)
-- AWS RDS: Enable encryption when creating instance
-- Encryption key managed by AWS KMS

-- For sensitive fields, use column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt custom CSS (if storing user scripts)
ALTER TABLE profiles ADD COLUMN custom_css_encrypted bytea;

-- Encrypt/decrypt in application layer
```

**In Transit**:
```typescript
// PostgreSQL connection with SSL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enforce SSL in production
  ...(process.env.NODE_ENV === "production" && {
    datasourceUrl: `${process.env.DATABASE_URL}?sslmode=require`,
  }),
});
```

### 3. Session Token Security

```typescript
// Better-auth generates cryptographically secure tokens
// Equivalent to:
import { randomBytes } from "crypto";

const generateSessionToken = (): string => {
  return randomBytes(32).toString("base64url");
};

// Tokens are:
// - 256-bit random (32 bytes)
// - Base64url encoded
// - Stored hashed in database (optional)
// - Single-use for critical operations
```

### 4. API Key Management

```typescript
/**
 * Generate API keys for third-party integrations (future feature)
 */
export const generateApiKey = (): {
  key: string;
  hash: string;
} => {
  // Generate random key
  const key = `vrss_${randomBytes(32).toString("base64url")}`;

  // Hash for storage
  const hash = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

  return { key, hash };
};

// Store only hash in database
// Return key to user ONCE (never retrievable)
```

---

## Privacy Controls

### 1. Profile Visibility Settings

```typescript
/**
 * Update profile visibility
 */
profileRouter.patch(
  "/visibility",
  requireAuth,
  zValidator(
    "json",
    z.object({
      visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { visibility } = c.req.valid("json");

    await prisma.user.update({
      where: { id: user.id },
      data: { profileVisibility: visibility },
    });

    return c.json({ success: true });
  }
);
```

### 2. Data Export (GDPR Compliance)

```typescript
/**
 * Export user data
 */
settingsRouter.get("/export", requireAuth, async (c) => {
  const user = c.get("user");

  // Gather all user data
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      posts: true,
      sessions: {
        select: {
          createdAt: true,
          ipAddress: true,
          userAgent: true,
        },
      },
    },
  });

  // Remove sensitive fields
  const exportData = {
    user: {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      name: userData.name,
      createdAt: userData.createdAt,
    },
    profile: userData.profile,
    posts: userData.posts,
    sessions: userData.sessions,
  };

  return c.json(exportData);
});
```

### 3. Account Deletion

```typescript
/**
 * Delete account (soft delete with grace period)
 */
settingsRouter.post(
  "/delete-account",
  requireAuth,
  zValidator(
    "json",
    z.object({
      password: z.string(),
      confirmation: z.literal("DELETE"),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { password } = c.req.valid("json");

    // Verify password
    const isValid = await auth.api.verifyPassword({
      body: {
        email: user.email,
        password,
      },
    });

    if (!isValid) {
      return c.json({ error: "Invalid password" }, 401);
    }

    // Soft delete (mark for deletion in 30 days)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return c.json({
      success: true,
      message: "Account scheduled for deletion in 30 days",
    });
  }
);

/**
 * Cancel account deletion
 */
settingsRouter.post("/cancel-deletion", requireAuth, async (c) => {
  const user = c.get("user");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deletedAt: null,
      scheduledDeletionAt: null,
    },
  });

  return c.json({ success: true });
});
```

### 4. Data Access Logging

```typescript
/**
 * Log sensitive data access for audit trail
 */
export const logDataAccess = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, any>
) => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date(),
    },
  });
};

// Usage
await logDataAccess(
  user.id,
  "PROFILE_VIEWED",
  "profile",
  profileId,
  { viewerIp: c.req.header("x-forwarded-for") }
);
```

---

## Security Headers & Configuration

### 1. Hono Security Middleware

```typescript
import { secureHeaders } from "hono/secure-headers";

// Apply security headers
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline for production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", process.env.CDN_URL],
      connectSrc: ["'self'", process.env.API_URL],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
    crossOriginEmbedderPolicy: false, // Allow embedding images
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "same-site",
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    xXssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
  })
);
```

### 2. CORS Configuration

```typescript
import { cors } from "hono/cors";

app.use(
  cors({
    origin: [
      process.env.WEB_URL || "http://localhost:5173",
      process.env.APP_URL || "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 600,
    credentials: true,
  })
);
```

### 3. Additional Security Headers

```typescript
// Custom headers middleware
app.use(async (c, next) => {
  await next();

  // Remove server header
  c.res.headers.delete("X-Powered-By");

  // Add custom headers
  c.res.headers.set("X-Request-Id", crypto.randomUUID());
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-DNS-Prefetch-Control", "off");
  c.res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
});
```

---

## Secrets Management

### 1. Environment Variables

**File**: `.env` (never commit)

```bash
# Application
NODE_ENV=production
APP_URL=https://api.vrss.app
WEB_URL=https://vrss.app
COOKIE_DOMAIN=.vrss.app

# Better-auth
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://api.vrss.app

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vrss?sslmode=require

# S3 Storage
S3_BUCKET=vrss-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<aws-access-key>
S3_SECRET_ACCESS_KEY=<aws-secret-key>
CDN_URL=https://cdn.vrss.app

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@vrss.app

# Rate Limiting (Redis)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=<sentry-dsn>
```

### 2. Secret Generation

```bash
# Generate Better-auth secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 64

# Generate API keys
openssl rand -hex 32
```

### 3. Production Secrets Management

**AWS Secrets Manager**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export const getSecret = async (secretName: string): Promise<string> => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString;
};

// Load secrets at startup
const secrets = {
  databaseUrl: await getSecret("vrss/database-url"),
  betterAuthSecret: await getSecret("vrss/auth-secret"),
  s3Credentials: await getSecret("vrss/s3-credentials"),
};
```

### 4. Secret Rotation

```typescript
/**
 * Rotate Better-auth secret (requires session migration)
 */
export const rotateAuthSecret = async (newSecret: string) => {
  // 1. Update environment variable
  process.env.BETTER_AUTH_SECRET = newSecret;

  // 2. Re-sign all active sessions
  const activeSessions = await prisma.session.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
  });

  for (const session of activeSessions) {
    // Re-generate session token with new secret
    const newToken = generateSessionToken();
    await prisma.session.update({
      where: { id: session.id },
      data: { token: newToken },
    });
  }

  // 3. Notify users to re-authenticate
  console.log("Secret rotated. Active sessions updated.");
};
```

---

## Rate Limiting

### 1. Redis-based Rate Limiter

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const rateLimiter = (options: {
  limit: number;
  window: number; // seconds
  keyPrefix?: string;
}): MiddlewareHandler => {
  return async (c, next) => {
    const identifier =
      c.get("user")?.id ||
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "anonymous";

    const key = `${options.keyPrefix || "ratelimit"}:${identifier}`;

    // Increment counter
    const current = await redis.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, options.window);
    }

    // Check limit
    if (current > options.limit) {
      const ttl = await redis.ttl(key);
      return c.json(
        {
          error: "TooManyRequests",
          message: "Rate limit exceeded",
          retryAfter: ttl,
        },
        429,
        {
          "Retry-After": ttl.toString(),
          "X-RateLimit-Limit": options.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (Date.now() + ttl * 1000).toString(),
        }
      );
    }

    // Add rate limit headers
    c.res.headers.set("X-RateLimit-Limit", options.limit.toString());
    c.res.headers.set("X-RateLimit-Remaining", (options.limit - current).toString());

    await next();
  };
};
```

### 2. Rate Limit Configuration

```typescript
// Apply different limits per endpoint
app.use("/api/auth/sign-in", rateLimiter({ limit: 10, window: 900 })); // 10/15min
app.use("/api/auth/sign-up", rateLimiter({ limit: 5, window: 3600 })); // 5/hour
app.use("/api/posts", rateLimiter({ limit: 100, window: 60 })); // 100/min
app.use("/api/upload", rateLimiter({ limit: 20, window: 3600 })); // 20/hour
```

### 3. DDoS Protection

```typescript
/**
 * Distributed rate limiting (track across multiple instances)
 */
export const ddosProtection: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");

  if (!ip) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Check if IP is blocked
  const blocked = await redis.get(`blocked:${ip}`);
  if (blocked) {
    return c.json(
      {
        error: "Forbidden",
        message: "Your IP has been blocked",
      },
      403
    );
  }

  // Track request rate per IP
  const key = `ddos:${ip}`;
  const requests = await redis.incr(key);

  if (requests === 1) {
    await redis.expire(key, 10); // 10 second window
  }

  // Block if > 100 requests in 10 seconds
  if (requests > 100) {
    await redis.setex(`blocked:${ip}`, 3600, "1"); // Block for 1 hour
    return c.json({ error: "Too many requests" }, 429);
  }

  await next();
};
```

---

## Security Checklist

### Pre-Launch Security Audit

- [ ] **Authentication**
  - [ ] Better-auth properly configured
  - [ ] Password requirements enforced (12+ chars, complexity)
  - [ ] Email verification required
  - [ ] Session expiration configured (7 days)
  - [ ] Session refresh working
  - [ ] Password reset flow tested
  - [ ] Account deletion flow tested

- [ ] **Authorization**
  - [ ] Protected endpoints require authentication
  - [ ] Resource ownership checked
  - [ ] Profile visibility enforced
  - [ ] Storage quota enforced
  - [ ] No broken access control

- [ ] **API Security**
  - [ ] Input validation on all endpoints (Zod)
  - [ ] CSRF protection enabled
  - [ ] XSS prevention (output encoding)
  - [ ] SQL injection prevented (Prisma)
  - [ ] Rate limiting configured
  - [ ] Request size limits set
  - [ ] Error messages don't leak information

- [ ] **Data Protection**
  - [ ] Passwords hashed with bcrypt
  - [ ] Database connections use TLS
  - [ ] Session tokens cryptographically secure
  - [ ] Sensitive data not logged
  - [ ] API responses sanitized

- [ ] **Media Security**
  - [ ] File type validation (magic bytes)
  - [ ] File size limits enforced
  - [ ] S3 bucket not publicly accessible
  - [ ] Presigned URLs expire (15 min)
  - [ ] Storage quota enforced
  - [ ] CDN configured with HTTPS only

- [ ] **Infrastructure**
  - [ ] HTTPS/TLS enforced (production)
  - [ ] Security headers configured
  - [ ] CORS properly configured
  - [ ] Environment variables secured
  - [ ] Secrets not in code
  - [ ] Database encrypted at rest
  - [ ] Backups encrypted

- [ ] **Monitoring**
  - [ ] Failed login attempts logged
  - [ ] Suspicious activity alerting
  - [ ] Audit logs for sensitive actions
  - [ ] Error tracking (Sentry)
  - [ ] Uptime monitoring

- [ ] **Compliance**
  - [ ] Privacy policy published
  - [ ] Terms of service published
  - [ ] Data export available (GDPR)
  - [ ] Account deletion available
  - [ ] Cookie consent implemented

---

## Implementation Timeline

### Phase 1: Core Authentication (Week 1)
- Install and configure Better-auth
- Implement registration/login flows
- Set up session management
- Create auth middleware

### Phase 2: Authorization & API Security (Week 2)
- Implement authorization patterns
- Add input validation (Zod)
- Configure rate limiting
- Set up security headers

### Phase 3: Media Security (Week 3)
- Implement secure file upload flow
- Configure S3 bucket security
- Set up CDN with access control
- Add storage quota enforcement

### Phase 4: Privacy & Compliance (Week 4)
- Implement profile visibility controls
- Add data export functionality
- Create account deletion flow
- Set up audit logging

### Phase 5: Monitoring & Testing (Week 5)
- Configure error tracking
- Set up security monitoring
- Perform penetration testing
- Review security checklist

---

## Testing Strategy

### 1. Authentication Tests

```typescript
import { describe, test, expect } from "bun:test";

describe("Authentication", () => {
  test("should register new user", async () => {
    const res = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "SecureP@ssw0rd123",
        username: "testuser",
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.requiresVerification).toBe(true);
  });

  test("should reject weak password", async () => {
    const res = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "weak",
        username: "testuser",
      }),
    });

    expect(res.status).toBe(400);
  });

  test("should login with valid credentials", async () => {
    const res = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "SecureP@ssw0rd123",
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("vrss.session_token");
  });
});
```

### 2. Authorization Tests

```typescript
describe("Authorization", () => {
  test("should deny access to protected endpoint without auth", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Test" }),
    });

    expect(res.status).toBe(401);
  });

  test("should allow post deletion by owner only", async () => {
    // Create post as user1
    const post = await createPost(user1Id, "Test post");

    // Try to delete as user2
    const res = await app.request(`/api/posts/${post.id}`, {
      method: "DELETE",
      headers: { Cookie: user2Cookie },
    });

    expect(res.status).toBe(403);
  });
});
```

### 3. Security Tests

```typescript
describe("Security", () => {
  test("should prevent XSS in post content", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        content: '<script>alert("XSS")</script>',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.post.content).not.toContain("<script>");
  });

  test("should enforce rate limits", async () => {
    const requests = Array.from({ length: 15 }, () =>
      app.request("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrong",
        }),
      })
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter((r) => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

---

## Incident Response

### 1. Security Incident Workflow

```
Detect → Contain → Investigate → Remediate → Document → Review
```

### 2. Common Incidents

**Compromised User Account**:
```typescript
export const handleCompromisedAccount = async (userId: string) => {
  // 1. Invalidate all sessions
  await prisma.session.deleteMany({ where: { userId } });

  // 2. Force password reset
  await auth.api.forgetPassword({
    body: { email: user.email },
  });

  // 3. Lock account temporarily
  await prisma.user.update({
    where: { id: userId },
    data: { locked: true, lockedUntil: new Date(Date.now() + 3600000) },
  });

  // 4. Notify user
  await sendEmail({
    to: user.email,
    subject: "Security Alert",
    body: "Your account has been locked due to suspicious activity...",
  });

  // 5. Log incident
  await logSecurityIncident("COMPROMISED_ACCOUNT", userId);
};
```

**Data Breach**:
```typescript
export const handleDataBreach = async () => {
  // 1. Immediately revoke all sessions
  await prisma.session.deleteMany({});

  // 2. Rotate secrets
  await rotateAuthSecret(newSecret);

  // 3. Force password resets
  await prisma.user.updateMany({
    data: { requirePasswordReset: true },
  });

  // 4. Notify affected users
  // 5. Report to authorities (GDPR)
  // 6. Document incident
};
```

---

## Additional Resources

### Documentation
- [Better-auth Docs](https://better-auth.com/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

### Tools
- **Security Scanning**: npm audit, Snyk, Dependabot
- **SAST**: SonarQube, Semgrep
- **Penetration Testing**: Burp Suite, OWASP ZAP
- **Monitoring**: Sentry, DataDog, CloudWatch

### Regular Security Tasks
- [ ] Update dependencies weekly
- [ ] Review audit logs weekly
- [ ] Rotate secrets quarterly
- [ ] Security audit quarterly
- [ ] Penetration test annually

---

## Conclusion

This security design provides a comprehensive, production-ready authentication and security implementation for VRSS social platform using Better-auth. The design prioritizes:

1. **Security by Default**: All endpoints protected, all inputs validated
2. **Defense in Depth**: Multiple security layers
3. **Privacy First**: User control over data and visibility
4. **Compliance Ready**: GDPR-compliant data handling
5. **Developer Experience**: Clear patterns, good documentation
6. **Production Ready**: Scalable, maintainable, monitorable

**Next Steps**:
1. Review and approve this design
2. Set up development environment
3. Implement Phase 1 (Core Authentication)
4. Proceed through implementation phases
5. Conduct security review before launch

---

**Document Control**
- **Created**: 2025-10-16
- **Last Updated**: 2025-10-16
- **Version**: 1.0
- **Status**: Design Review
- **Next Review**: Post-implementation
