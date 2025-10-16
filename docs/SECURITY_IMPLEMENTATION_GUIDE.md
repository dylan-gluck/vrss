# VRSS Security Implementation Guide

Quick reference guide for implementing the security design.

## Quick Start

### 1. Install Dependencies

```bash
# Core dependencies
bun add better-auth @better-auth/prisma-adapter
bun add hono @hono/zod-validator zod
bun add @prisma/client
bun add ioredis
bun add isomorphic-dompurify

# Development dependencies
bun add -d prisma
bun add -d @types/node
```

### 2. Initialize Better-auth

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update daily
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.APP_URL,
});
```

### 3. Set Up Prisma Schema

```bash
# Initialize Prisma
bunx prisma init

# Copy the schema from SECURITY_DESIGN.md
# Then run migrations
bunx prisma migrate dev --name init
bunx prisma generate
```

### 4. Create Auth Routes

```typescript
// src/routes/auth.ts
import { Hono } from "hono";
import { auth } from "../lib/auth";

const authRouter = new Hono();

// Mount Better-auth endpoints
authRouter.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRouter;
```

### 5. Add Middleware

```typescript
// src/index.ts
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import authRouter from "./routes/auth";

const app = new Hono();

// Security middleware
app.use(secureHeaders());
app.use(cors({
  origin: [process.env.WEB_URL],
  credentials: true,
}));

// Auth middleware (attaches user to context)
app.use(authMiddleware);

// Routes
app.route("/", authRouter);

export default app;
```

### 6. Environment Variables

```bash
# .env
NODE_ENV=development
APP_URL=http://localhost:3000
WEB_URL=http://localhost:5173

# Generate this: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here

DATABASE_URL=postgresql://user:password@localhost:5432/vrss

# Email (Resend.com recommended for MVP)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@vrss.app

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# S3 (can use Cloudflare R2 for cheaper alternative)
S3_BUCKET=vrss-media
S3_REGION=auto
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
CDN_URL=https://cdn.vrss.app
```

---

## Frontend Integration

### 1. Install Client

```bash
# In your frontend project
bun add @better-auth/react
bun add @tanstack/react-query
```

### 2. Create Auth Client

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "@better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
```

### 3. Auth Provider

```typescript
// src/providers/AuthProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";

const queryClient = new QueryClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <authClient.SessionProvider>
        {children}
      </authClient.SessionProvider>
    </QueryClientProvider>
  );
}
```

### 4. Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
import { useSession } from "../lib/auth-client";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 5. Login Form

```typescript
// src/pages/Login.tsx
import { useState } from "react";
import { signIn } from "../lib/auth-client";
import { useNavigate } from "react-router-dom";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signIn.email({
        email,
        password,
      });

      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

---

## Common Patterns

### Protected API Endpoint

```typescript
// Example: Create post
import { requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
});

postRouter.post(
  "/",
  requireAuth,
  requireVerifiedEmail,
  zValidator("json", createPostSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: data.content,
        visibility: data.visibility,
      },
    });

    return c.json({ post }, 201);
  }
);
```

### Resource Ownership Check

```typescript
// Example: Delete post
postRouter.delete("/:postId", requireAuth, async (c) => {
  const user = c.get("user");
  const postId = c.req.param("postId");

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.userId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await prisma.post.delete({
    where: { id: postId },
  });

  return c.json({ success: true });
});
```

### Rate Limiting

```typescript
// Example: Apply rate limit to endpoint
import { rateLimiter } from "../middleware/rate-limit";

authRouter.post(
  "/sign-in",
  rateLimiter({ limit: 10, window: 900 }), // 10 attempts per 15 min
  async (c) => {
    // Login logic
  }
);
```

---

## Security Middleware Reference

### authMiddleware
Attaches user and session to context if authenticated.

```typescript
import { authMiddleware } from "./middleware/auth";

app.use(authMiddleware); // Global
// or
router.use(authMiddleware); // Route-specific
```

### requireAuth
Requires authentication, returns 401 if not authenticated.

```typescript
import { requireAuth } from "./middleware/auth";

router.get("/protected", requireAuth, async (c) => {
  const user = c.get("user"); // Always available
  // ...
});
```

### requireVerifiedEmail
Requires email verification, returns 403 if not verified.

```typescript
import { requireVerifiedEmail } from "./middleware/auth";

router.post("/post", requireAuth, requireVerifiedEmail, async (c) => {
  // User is authenticated AND email is verified
});
```

### requireOwnership
Custom ownership check.

```typescript
import { requireOwnership } from "./middleware/auth";

router.delete(
  "/posts/:postId",
  requireAuth,
  requireOwnership(async (c) => {
    const postId = c.req.param("postId");
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    return post?.userId || null;
  }),
  async (c) => {
    // User owns the post
  }
);
```

---

## File Upload Implementation

### Backend: Request Upload URL

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

uploadRouter.post(
  "/request-upload",
  requireAuth,
  requireVerifiedEmail,
  zValidator(
    "json",
    z.object({
      filename: z.string(),
      contentType: z.string(),
      size: z.number().max(50 * 1024 * 1024), // 50MB
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { filename, contentType, size } = c.req.valid("json");

    // Check quota
    const quota = await checkStorageQuota(user.id, size);
    if (!quota.allowed) {
      return c.json({ error: quota.reason }, 413);
    }

    // Generate unique key
    const key = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${filename.split(".").pop()}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        filename: key,
        originalFilename: filename,
        contentType,
        size,
        status: "PENDING",
      },
    });

    return c.json({
      uploadId: upload.id,
      presignedUrl,
    });
  }
);
```

### Frontend: Upload File

```typescript
// src/hooks/useFileUpload.ts
export function useFileUpload() {
  const uploadFile = async (file: File) => {
    // 1. Request upload URL
    const response = await fetch(`${API_URL}/api/upload/request-upload`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to request upload");
    }

    const { uploadId, presignedUrl } = await response.json();

    // 2. Upload directly to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }

    // 3. Confirm upload
    const confirmResponse = await fetch(
      `${API_URL}/api/upload/confirm-upload/${uploadId}`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!confirmResponse.ok) {
      throw new Error("Failed to confirm upload");
    }

    const { upload } = await confirmResponse.json();
    return upload;
  };

  return { uploadFile };
}
```

---

## Database Migrations

### Initial Migration

```sql
-- Create users table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "emailVerified" BOOLEAN DEFAULT false,
  "name" TEXT,
  "username" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "storageUsed" INTEGER DEFAULT 0,
  "storageLimit" INTEGER DEFAULT 52428800,
  "profileVisibility" TEXT DEFAULT 'PUBLIC'
);

-- Create password table
CREATE TABLE "Password" (
  "hash" TEXT NOT NULL,
  "userId" TEXT UNIQUE NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_token_idx" ON "Session"("token");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
```

### Add Audit Logging

```sql
-- Create audit log table
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "metadata" JSONB,
  "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
```

---

## Testing Examples

### Authentication Tests

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/index";

describe("Authentication", () => {
  const testUser = {
    email: "test@example.com",
    password: "SecureP@ssw0rd123",
    username: "testuser",
  };

  test("should register new user", async () => {
    const res = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("should reject duplicate email", async () => {
    const res = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(400);
  });

  test("should login with valid credentials", async () => {
    // First verify email (in real app, click email link)
    // For testing, manually verify:
    await prisma.user.update({
      where: { email: testUser.email },
      data: { emailVerified: true },
    });

    const res = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("vrss.session_token");
  });
});
```

### Authorization Tests

```typescript
describe("Authorization", () => {
  let userCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Create and login test user
    const loginRes = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "SecureP@ssw0rd123",
      }),
    });

    userCookie = loginRes.headers.get("Set-Cookie")!;
    const session = await loginRes.json();
    userId = session.user.id;
  });

  test("should deny unauthenticated access", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Test" }),
    });

    expect(res.status).toBe(401);
  });

  test("should allow authenticated access", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({ content: "Test post" }),
    });

    expect(res.status).toBe(201);
  });
});
```

---

## Production Checklist

### Pre-deployment

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced
- [ ] Database backups configured
- [ ] Error tracking configured (Sentry)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Input validation on all endpoints
- [ ] Email verification required
- [ ] Password requirements enforced
- [ ] Session expiration configured
- [ ] File upload limits enforced
- [ ] Storage quota enforced

### Post-deployment

- [ ] Test authentication flow
- [ ] Test password reset
- [ ] Test file upload
- [ ] Test rate limiting
- [ ] Monitor error rates
- [ ] Monitor failed login attempts
- [ ] Review audit logs
- [ ] Test security headers (securityheaders.com)
- [ ] Run penetration tests
- [ ] Update dependencies

---

## Troubleshooting

### Common Issues

**Issue**: Session not persisting
**Solution**: Check CORS credentials and cookie domain

```typescript
// Backend
app.use(cors({
  origin: process.env.WEB_URL,
  credentials: true, // Important!
}));

// Frontend
fetch(API_URL, {
  credentials: 'include', // Important!
});
```

**Issue**: CSRF errors
**Solution**: Ensure SameSite cookie setting is correct

```typescript
// Development (localhost)
cookieSameSite: 'lax'

// Production (same domain)
cookieSameSite: 'lax'

// Production (different domains)
cookieSameSite: 'none' // Requires secure: true
```

**Issue**: Rate limiting not working
**Solution**: Ensure Redis is running and connected

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check connection in code
const redis = new Redis(process.env.REDIS_URL);
await redis.ping(); // Should return 'PONG'
```

**Issue**: File upload fails
**Solution**: Check S3 credentials and CORS

```typescript
// Verify S3 connection
const s3 = new S3Client({ /* config */ });
await s3.send(new ListBucketsCommand({}));
```

---

## Additional Resources

### Email Service Setup (Resend)

```typescript
// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};
```

### Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: vrss
      POSTGRES_PASSWORD: vrss
      POSTGRES_DB: vrss
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Environment Setup Script

```bash
#!/bin/bash
# setup.sh

echo "Setting up VRSS development environment..."

# Install dependencies
bun install

# Start Docker services
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 5

# Run migrations
bunx prisma migrate dev

# Generate Prisma client
bunx prisma generate

echo "Setup complete! Run 'bun dev' to start the server."
```

---

## Next Steps

1. **Review** this implementation guide
2. **Set up** local development environment
3. **Implement** authentication endpoints
4. **Test** authentication flows
5. **Implement** protected routes
6. **Add** file upload functionality
7. **Configure** production environment
8. **Deploy** and monitor

For detailed security architecture, see [SECURITY_DESIGN.md](./SECURITY_DESIGN.md).
