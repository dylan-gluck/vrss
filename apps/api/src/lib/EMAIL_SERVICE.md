# Email Service Documentation

## Overview

The VRSS email service provides a flexible, configurable email sending system that works in both development and production environments. It supports multiple email providers and includes professional HTML templates.

## Features

- **Development Mode**: Logs emails to console (no real sending)
- **Production Mode**: Supports SMTP (Nodemailer) and SendGrid
- **HTML Templates**: Professional, responsive email templates
- **Plain Text Fallback**: Accessibility and spam filter compliance
- **Graceful Error Handling**: Logs errors without crashing the app
- **Auto-detection**: Automatically selects provider based on environment

## Configuration

### Environment Variables

#### Basic Configuration

```bash
# Auto-detect provider (recommended)
EMAIL_PROVIDER=auto
APP_URL=http://localhost:3000

# Or explicitly set provider
EMAIL_PROVIDER=console  # Development
EMAIL_PROVIDER=smtp     # SMTP (Nodemailer)
EMAIL_PROVIDER=sendgrid # SendGrid
```

#### SMTP Configuration

For Gmail:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="VRSS <noreply@vrss.dev>"
```

For AWS SES:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-access-key-id
SMTP_PASS=your-aws-secret-access-key
SMTP_FROM="VRSS <noreply@vrss.dev>"
```

#### SendGrid Configuration

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM=noreply@vrss.dev
```

## Usage

### Send Verification Email

```typescript
import { sendVerificationEmail } from "./lib/email";

await sendVerificationEmail(
  "user@example.com",
  "johndoe",
  "verification-token-abc123"
);
```

### Email Template Features

- **Responsive Design**: Works on mobile and desktop
- **VRSS Branding**: Gradient header with logo
- **Clear CTA**: Prominent verification button
- **Security Note**: 24-hour expiry warning
- **Alternative Link**: Copy-paste URL for accessibility
- **Plain Text Version**: For text-only email clients

## Provider Selection Logic

The email service auto-detects the provider based on:

1. **Explicit `EMAIL_PROVIDER`**: If set, uses that provider
2. **Development/Test**: Uses console logging
3. **SendGrid API Key**: If `SENDGRID_API_KEY` is set, uses SendGrid
4. **SMTP Host**: If `SMTP_HOST` is set, uses SMTP
5. **Fallback**: Uses console logging

## Development Workflow

### Local Development

In development mode (`NODE_ENV=development`), emails are logged to console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (Console Mode - Not Actually Sent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: user@example.com
Subject: Verify Your Email - VRSS Social Platform

--- Plain Text ---
[Email content]

--- HTML Preview ---
[HTML preview]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Testing Email Service

Run the validation script:

```bash
bun run validate-email.ts
```

This will:
- Send a test verification email
- Log the output to console
- Verify template rendering

### Production Setup

#### Option 1: SMTP (Recommended for most cases)

1. Install Nodemailer (if not already installed):
   ```bash
   bun add nodemailer
   bun add -D @types/nodemailer
   ```

2. Configure SMTP settings in `.env`:
   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="VRSS <noreply@vrss.dev>"
   ```

3. For Gmail, create an app password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"

#### Option 2: SendGrid (For high-volume sending)

1. Install SendGrid SDK (if not already installed):
   ```bash
   bun add @sendgrid/mail
   ```

2. Configure SendGrid in `.env`:
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your-api-key
   SENDGRID_FROM=noreply@vrss.dev
   ```

3. Get API key from SendGrid dashboard

## Error Handling

The email service uses graceful error handling:

```typescript
try {
  await sendVerificationEmail(email, username, token);
} catch (error) {
  // Error is logged but doesn't crash the app
  console.error("[EMAIL] Failed to send:", error);
}
```

**Important**: Email failures are logged but don't throw errors. This prevents registration failures due to temporary email service issues.

## Email Templates

### Current Templates

- **Verification Email**: Account email verification

### Future Templates (Phase 2.4+)

- Password Reset Email
- Welcome Email
- Notification Emails

## Security Considerations

1. **XSS Protection**: All user input (username) is HTML-escaped
2. **Token Security**: Tokens are URL-encoded in links
3. **Email Enumeration**: Generic error messages prevent email discovery
4. **Expiry**: Verification links expire in 24 hours

## Troubleshooting

### Email Not Sending

1. Check `EMAIL_PROVIDER` setting
2. Verify SMTP/SendGrid credentials
3. Check console for error logs
4. Test with validation script

### SMTP Issues

- **Port 587 blocked**: Try port 465 with `SMTP_SECURE=true`
- **Authentication failed**: Verify credentials, use app password for Gmail
- **Connection timeout**: Check firewall settings

### SendGrid Issues

- **Invalid API key**: Regenerate in SendGrid dashboard
- **Sender not verified**: Verify sender email in SendGrid
- **Rate limited**: Check SendGrid quota

## API Reference

### `sendVerificationEmail(email, username, token)`

Sends a verification email to the user.

**Parameters:**
- `email` (string): Recipient email address
- `username` (string): User's username (for personalization)
- `token` (string): Verification token (will be URL-encoded)

**Returns:** `Promise<void>`

**Example:**
```typescript
await sendVerificationEmail(
  "user@example.com",
  "johndoe",
  "abc123xyz789"
);
```

**Email Content:**
- Subject: "Verify Your Email - VRSS Social Platform"
- Verification URL: `${APP_URL}/verify-email?token=${token}`
- Professional HTML template with VRSS branding
- Plain text fallback

## Performance Considerations

- **Async**: All email sending is asynchronous
- **Error Isolation**: Email failures don't block registration
- **Connection Pooling**: SMTP uses connection pooling (Nodemailer)
- **Rate Limiting**: Consider implementing rate limits for email sending

## Testing

### Unit Tests

```typescript
// Mock email service in tests
vi.mock("./lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));
```

### Integration Tests

```typescript
// Test actual email sending
import { sendVerificationEmail } from "./lib/email";

test("sends verification email", async () => {
  await sendVerificationEmail(
    "test@example.com",
    "testuser",
    "test-token"
  );

  // In development, check console logs
  // In production, check email provider logs
});
```

## Migration Guide

### From Better-auth Default

The email service replaces Better-auth's default email handling:

**Before:**
```typescript
// Better-auth handled emails internally
```

**After:**
```typescript
import { sendVerificationEmail } from "./lib/email";

// Manual email sending with custom templates
await sendVerificationEmail(email, username, token);
```

## Future Enhancements

- [ ] Email queue for retry logic
- [ ] Template engine integration (Handlebars, etc.)
- [ ] Multi-language support
- [ ] Email analytics tracking
- [ ] A/B testing for email templates
- [ ] Bulk email sending
- [ ] Email scheduling
