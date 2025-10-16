# VRSS Authentication Flows

Visual reference for all authentication and authorization flows.

---

## 1. Registration Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /api/auth/sign-up
     │    {email, password, username}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Validate Input (Zod)                                   │  │
│  │    - Email format                                          │  │
│  │    - Password strength (12+ chars, complexity)            │  │
│  │    - Username format (alphanumeric, 3-30 chars)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Check Uniqueness                                       │  │
│  │    - Query database for existing email                    │  │
│  │    - Query database for existing username                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Better-auth: Create User                               │  │
│  │    - Hash password (bcrypt, 10 rounds)                    │  │
│  │    - Generate user ID (CUID)                              │  │
│  │    - Create User record                                   │  │
│  │    - Create Password record                               │  │
│  │    - emailVerified = false                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Generate Verification Token                            │  │
│  │    - Create random token (32 bytes)                       │  │
│  │    - Store in VerificationToken table                     │  │
│  │    - Expiration: 24 hours                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Send Verification Email                                │  │
│  │    - Generate verification link                           │  │
│  │    - https://vrss.app/auth/verify?token=xxx               │  │
│  │    - Send via email service (Resend)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 201 Created
     │ {success: true, requiresVerification: true}
     │
     ▼
┌─────────┐
│ Client  │
│         │ Show: "Check your email to verify account"
└─────────┘

User clicks email link...

┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 6. GET /api/auth/verify-email?token=xxx
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Validate Token                                         │  │
│  │    - Find token in database                               │  │
│  │    - Check expiration                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Mark Email as Verified                                 │  │
│  │    - Update User.emailVerified = true                     │  │
│  │    - Delete verification token                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Create Session                                         │  │
│  │    - Generate session token                               │  │
│  │    - Create Session record                                │  │
│  │    - Set session cookie (HttpOnly, Secure)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: Redirect to /
     │ Set-Cookie: vrss.session_token=xxx
     │
     ▼
┌─────────┐
│ Client  │
│         │ User is now authenticated
└─────────┘
```

---

## 2. Login Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /api/auth/sign-in
     │    {email, password}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Rate Limit Check                                       │  │
│  │    - Check Redis for IP/email attempts                    │  │
│  │    - Limit: 10 attempts per 15 minutes                    │  │
│  │    - If exceeded: 429 Too Many Requests                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Find User by Email                                     │  │
│  │    - Query User table                                     │  │
│  │    - Include Password relation                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Verify Password                                        │  │
│  │    - bcrypt.compare(input, hash)                          │  │
│  │    - Constant-time comparison                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│         ┌─── Invalid? ───────────────────────────────────┐      │
│         │                                                  │      │
│         ▼                                                  ▼      │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ Return 401   │                              │ Continue     │ │
│  │ Increment    │                              │              │ │
│  │ rate limit   │                              │              │ │
│  └──────────────┘                              └──────────────┘ │
│                                                         │         │
│                                                         ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Check Email Verification                           │  │
│  │    - If !emailVerified: return 403                    │  │
│  │    - Message: "Please verify your email"              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Create Session                                         │  │
│  │    - Generate session token (32 bytes random)            │  │
│  │    - Create Session record                               │  │
│  │    - Store IP address and User-Agent                     │  │
│  │    - Expiration: 7 days from now                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Set Session Cookie                                     │  │
│  │    - HttpOnly: true (prevent XSS)                         │  │
│  │    - Secure: true (HTTPS only)                            │  │
│  │    - SameSite: lax (CSRF protection)                      │  │
│  │    - Domain: .vrss.app                                    │  │
│  │    - MaxAge: 7 days                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK
     │ Set-Cookie: vrss.session_token=xxx
     │ {user: {id, email, username}}
     │
     ▼
┌─────────┐
│ Client  │
│         │ Store session cookie
│         │ Update UI state (authenticated)
└─────────┘
```

---

## 3. Session Validation (Middleware)

```
Every authenticated request:

┌─────────┐
│ Client  │
└────┬────┘
     │
     │ Request with Cookie: vrss.session_token=xxx
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server - authMiddleware                                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Extract Session Token from Cookie                     │  │
│  │    - Parse Cookie header                                  │  │
│  │    - Get vrss.session_token value                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Find Session in Database                              │  │
│  │    - Query Session by token                              │  │
│  │    - Include User relation                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│         ┌─── Not found? ─────────────────────────────────┐      │
│         │                                                  │      │
│         ▼                                                  ▼      │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ Continue as  │                              │ Continue     │ │
│  │ anonymous    │                              │              │ │
│  │ (no user)    │                              │              │ │
│  └──────────────┘                              └──────────────┘ │
│                                                         │         │
│                                                         ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Check Session Expiration                           │  │
│  │    - If expiresAt < now: delete session               │  │
│  │    - Continue as anonymous                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Check if Session Needs Refresh                        │  │
│  │    - If updatedAt > 24h ago:                             │  │
│  │      - Update Session.updatedAt = now                    │  │
│  │      - Extend Session.expiresAt by 7 days               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Attach User & Session to Context                      │  │
│  │    - c.set('user', session.user)                         │  │
│  │    - c.set('session', session)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Continue to route handler
     │ User available via: c.get('user')
     │
     ▼
┌─────────────────┐
│ Route Handler   │
└─────────────────┘
```

---

## 4. Password Reset Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /api/auth/forgot-password
     │    {email}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Rate Limit Check                                       │  │
│  │    - Limit: 3 attempts per hour                           │  │
│  │    - Prevent abuse                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Find User by Email                                     │  │
│  │    - Query database                                       │  │
│  │    - (Don't reveal if user exists - security)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Generate Reset Token                                   │  │
│  │    - Create random token (32 bytes)                       │  │
│  │    - Store in VerificationToken table                     │  │
│  │    - Expiration: 1 hour                                   │  │
│  │    - Single use only                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Send Reset Email                                       │  │
│  │    - Generate reset link                                  │  │
│  │    - https://vrss.app/auth/reset?token=xxx                │  │
│  │    - Send via email service                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK (always, prevent email enumeration)
     │ {message: "If account exists, reset link sent"}
     │
     ▼
┌─────────┐
│ Client  │
│         │ Show: "Check your email for reset link"
└─────────┘

User clicks email link...

┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 5. POST /api/auth/reset-password
     │    {token, newPassword}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Validate New Password                                  │  │
│  │    - Length: 12-128 chars                                 │  │
│  │    - Complexity requirements                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Validate Token                                         │  │
│  │    - Find token in database                               │  │
│  │    - Check expiration (< 1 hour old)                      │  │
│  │    - Ensure not already used                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│         ┌─── Invalid/Expired? ───────────────────────────┐      │
│         │                                                  │      │
│         ▼                                                  ▼      │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ Return 400   │                              │ Continue     │ │
│  │ Invalid token│                              │              │ │
│  └──────────────┘                              └──────────────┘ │
│                                                         │         │
│                                                         ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Update Password                                        │  │
│  │    - Hash new password (bcrypt)                           │  │
│  │    - Update Password.hash                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Invalidate All Sessions                                │  │
│  │    - Delete all Session records for user                  │  │
│  │    - Force re-login on all devices                        │  │
│  │    - Security: password changed = re-authenticate         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Delete Reset Token                                     │  │
│  │    - Remove token from database                           │  │
│  │    - Prevent reuse                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Send Confirmation Email                                │  │
│  │    - Notify user password was changed                     │  │
│  │    - Security alert                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK
     │ {success: true}
     │
     ▼
┌─────────┐
│ Client  │
│         │ Redirect to login
│         │ Show: "Password updated, please sign in"
└─────────┘
```

---

## 5. File Upload Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /api/upload/request-upload
     │    {filename, contentType, size}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Authenticate User                                      │  │
│  │    - Require auth + verified email                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Validate File Type                                     │  │
│  │    - Check contentType against whitelist                  │  │
│  │    - Allowed: image/*, video/*, audio/*                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Check Storage Quota                                    │  │
│  │    - Query user.storageUsed + size                        │  │
│  │    - Compare to user.storageLimit                         │  │
│  │    - If exceeded: return 413                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Generate Unique Filename                               │  │
│  │    - Path: userId/timestamp-uuid.ext                      │  │
│  │    - Example: abc123/1697483920-uuid.jpg                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Generate Presigned URL                                 │  │
│  │    - S3 PutObject command                                 │  │
│  │    - Expiration: 15 minutes                               │  │
│  │    - Enforce Content-Type                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Create Upload Record                                   │  │
│  │    - Status: PENDING                                      │  │
│  │    - Store metadata                                       │  │
│  │    - ExpiresAt: 15 minutes                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK
     │ {uploadId, presignedUrl}
     │
     ▼
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 2. PUT to presignedUrl
     │    Upload file directly to S3
     │
     ▼
┌──────────┐
│    S3    │
│          │ File stored
└──────────┘
     │
     │ Success
     │
     ▼
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 3. POST /api/upload/confirm-upload/:uploadId
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Verify Upload Record                                   │  │
│  │    - Find by uploadId                                     │  │
│  │    - Check ownership (userId matches)                     │  │
│  │    - Check status = PENDING                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Verify File in S3                                      │  │
│  │    - S3 HeadObject command                                │  │
│  │    - Ensure file exists                                   │  │
│  │    - Verify size matches                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Update Storage Usage                                   │  │
│  │    - Increment user.storageUsed                           │  │
│  │    - Update upload.status = COMPLETED                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. (Optional) Virus Scan                                  │  │
│  │    - Scan file for malware                                │  │
│  │    - If infected: delete + mark failed                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK
     │ {upload: {id, url}}
     │
     ▼
┌─────────┐
│ Client  │
│         │ Upload complete
│         │ Can use CDN URL: https://cdn.vrss.app/userId/file.jpg
└─────────┘
```

---

## 6. Authorization Flow (Resource Access)

```
Example: Viewing another user's profile

┌─────────┐
│ Client  │
└────┬────┘
     │
     │ GET /api/users/:username
     │ Cookie: vrss.session_token=xxx (optional)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. authMiddleware                                         │  │
│  │    - Extract user from session (if present)               │  │
│  │    - requestingUser = session?.user or null              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Find Target Profile                                    │  │
│  │    - Query User by username                               │  │
│  │    - Include profileVisibility setting                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Check Access Permissions                               │  │
│  │                                                            │  │
│  │    if (targetUser.id === requestingUser?.id)              │  │
│  │      ✓ Owner - full access                               │  │
│  │                                                            │  │
│  │    else if (visibility === 'PUBLIC')                      │  │
│  │      ✓ Anyone can view                                    │  │
│  │                                                            │  │
│  │    else if (visibility === 'UNLISTED')                    │  │
│  │      ✓ Anyone with direct link                            │  │
│  │                                                            │  │
│  │    else if (visibility === 'PRIVATE')                     │  │
│  │      if (isFollower(requestingUser, targetUser))          │  │
│  │        ✓ Approved follower                                │  │
│  │      else                                                  │  │
│  │        ✗ Access denied                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│         ┌─── Access Denied? ─────────────────────────────┐      │
│         │                                                  │      │
│         ▼                                                  ▼      │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ Return 403   │                              │ Return data  │ │
│  │ Forbidden    │                              │              │ │
│  └──────────────┘                              └──────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
```

---

## 7. Account Deletion Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ POST /api/settings/delete-account
     │ {password, confirmation: "DELETE"}
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server                                                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Require Authentication                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Verify Password                                        │  │
│  │    - Ensure user really wants to delete                   │  │
│  │    - Check password is correct                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Soft Delete (30 day grace period)                      │  │
│  │    - Set deletedAt = now                                  │  │
│  │    - Set scheduledDeletionAt = now + 30 days              │  │
│  │    - Do NOT delete data yet                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Invalidate All Sessions                                │  │
│  │    - Delete all Session records                           │  │
│  │    - User is logged out everywhere                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Send Confirmation Email                                │  │
│  │    - Notify deletion scheduled                            │  │
│  │    - Include cancellation link                            │  │
│  │    - Final date: 30 days from now                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Response: 200 OK
     │ {message: "Account scheduled for deletion in 30 days"}
     │
     ▼
┌─────────┐
│ Client  │
│         │ User is logged out
└─────────┘

30 days later (cron job):

┌──────────────────────────────────────────────────────────────────┐
│ Scheduled Job (Daily)                                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Find Expired Deletions                                 │   │
│  │    - scheduledDeletionAt < now                            │   │
│  │    - deletedAt IS NOT NULL                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 2. Delete User Data                                       │   │
│  │    - Delete S3 files (user's folder)                      │   │
│  │    - Delete posts                                         │   │
│  │    - Delete profile                                       │   │
│  │    - Delete sessions                                      │   │
│  │    - Delete user record                                   │   │
│  │    - Cascade deletes handle relations                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 3. Log Deletion                                           │   │
│  │    - Audit log (compliance)                               │   │
│  │    - anonymizedUserId, deletedAt                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Rate Limiting Flow

```
Any rate-limited endpoint:

┌─────────┐
│ Client  │
└────┬────┘
     │
     │ Request
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Server - rateLimiter middleware                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Identify Client                                        │  │
│  │    - If authenticated: userId                             │  │
│  │    - If not: IP address (X-Forwarded-For)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Build Rate Limit Key                                   │  │
│  │    - Key: ratelimit:{endpoint}:{identifier}              │  │
│  │    - Example: ratelimit:auth-signin:192.168.1.1           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Increment Counter (Redis)                              │  │
│  │    - INCR key                                             │  │
│  │    - If first request: SET expiration                     │  │
│  │    - Example: EXPIRE key 900 (15 minutes)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Check Limit                                            │  │
│  │    - If count > limit:                                    │  │
│  │      - Get TTL for retry-after                            │  │
│  │      - Return 429 Too Many Requests                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│         ┌─── Limit Exceeded? ────────────────────────────┐      │
│         │                                                  │      │
│         ▼                                                  ▼      │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ Return 429   │                              │ Continue     │ │
│  │ + Headers:   │                              │ + Headers:   │ │
│  │  Retry-After │                              │  Limit       │ │
│  │  Limit       │                              │  Remaining   │ │
│  │  Remaining:0 │                              │  Reset       │ │
│  └──────────────┘                              └──────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼

Example Rate Limits:
- Login: 10 attempts / 15 minutes
- Registration: 5 attempts / 1 hour
- Password reset: 3 attempts / 1 hour
- File upload: 20 uploads / 1 hour
- API calls: 100 requests / 1 minute
```

---

## Quick Reference

### Cookie Properties

```
Name: vrss.session_token
Value: [random 32-byte token]
HttpOnly: true        → Prevents JavaScript access (XSS protection)
Secure: true          → HTTPS only (production)
SameSite: lax         → CSRF protection
Domain: .vrss.app     → Accessible across subdomains
Path: /               → Accessible on all paths
MaxAge: 604800        → 7 days in seconds
```

### Session Expiration

```
Initial: 7 days from creation
Refresh: After 24 hours of activity
Auto-extend: Yes (sliding window)
Max age: No hard limit (as long as active)
```

### Password Requirements

```
Length: 12-128 characters
Must contain:
  - Lowercase letter (a-z)
  - Uppercase letter (A-Z)
  - Digit (0-9)
  - Special character (@$!%*?&)
```

### Storage Limits

```
Free tier: 50 MB (52,428,800 bytes)
Paid tier: 1 GB+ (configurable)

File size limits:
  - Single file: 50 MB max
  - Total per user: storage limit
```

---

## Security Considerations

1. **Never log sensitive data**: Passwords, tokens, cookies
2. **Always use HTTPS** in production
3. **Rate limit** all authentication endpoints
4. **Validate input** on both client and server
5. **Sanitize output** to prevent XSS
6. **Use parameterized queries** (Prisma handles this)
7. **Implement CSRF protection** (SameSite cookies)
8. **Monitor** failed login attempts
9. **Audit log** sensitive operations
10. **Regular security reviews** and updates

---

For implementation details, see [SECURITY_DESIGN.md](./SECURITY_DESIGN.md) and [SECURITY_IMPLEMENTATION_GUIDE.md](./SECURITY_IMPLEMENTATION_GUIDE.md).
