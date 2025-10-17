/**
 * Email Service - Phase 2.3
 *
 * Provides email sending functionality for the VRSS Social Platform.
 * Supports multiple providers and development/production modes.
 *
 * Features:
 * - Development mode: Logs emails to console (no real sending)
 * - Production mode: Supports SMTP (Nodemailer) and SendGrid
 * - HTML email templates with responsive design
 * - Plain text fallbacks
 * - Graceful error handling (logs errors, doesn't crash)
 *
 * Environment Variables:
 * - NODE_ENV: 'development' | 'production' | 'test'
 * - EMAIL_PROVIDER: 'console' | 'smtp' | 'sendgrid' (optional, auto-detected)
 * - APP_URL: Base URL for verification links
 *
 * SMTP Configuration (if EMAIL_PROVIDER=smtp):
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (e.g., 587)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password/app password
 * - SMTP_FROM: From email address (e.g., "VRSS <noreply@vrss.dev>")
 *
 * SendGrid Configuration (if EMAIL_PROVIDER=sendgrid):
 * - SENDGRID_API_KEY: SendGrid API key
 * - SENDGRID_FROM: From email address (e.g., "noreply@vrss.dev")
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.3
 * @see docs/SECURITY_DESIGN.md for email verification flow
 */

// =============================================================================
// TYPES
// =============================================================================

interface EmailConfig {
  provider: "console" | "smtp" | "sendgrid";
  from: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig {
  const env = process.env.NODE_ENV || "development";
  const provider = (process.env.EMAIL_PROVIDER || "auto") as string;

  // Auto-detect provider based on available environment variables
  let detectedProvider: "console" | "smtp" | "sendgrid" = "console";

  if (provider !== "auto") {
    detectedProvider = provider as "console" | "smtp" | "sendgrid";
  } else {
    // Auto-detection logic
    if (env === "development" || env === "test") {
      detectedProvider = "console";
    } else if (process.env.SENDGRID_API_KEY) {
      detectedProvider = "sendgrid";
    } else if (process.env.SMTP_HOST) {
      detectedProvider = "smtp";
    } else {
      detectedProvider = "console";
    }
  }

  // Build configuration based on provider
  const config: EmailConfig = {
    provider: detectedProvider,
    from: process.env.SMTP_FROM || process.env.SENDGRID_FROM || "VRSS <noreply@vrss.dev>",
  };

  if (detectedProvider === "smtp") {
    config.smtp = {
      host: process.env.SMTP_HOST || "localhost",
      port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    };
  } else if (detectedProvider === "sendgrid") {
    config.sendgrid = {
      apiKey: process.env.SENDGRID_API_KEY || "",
    };
  }

  return config;
}

// =============================================================================
// EMAIL SENDERS
// =============================================================================

/**
 * Console email sender (development mode)
 * Logs email to console instead of sending
 */
async function sendEmailConsole(options: EmailOptions): Promise<void> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 EMAIL (Console Mode - Not Actually Sent)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log("\n--- Plain Text ---");
  console.log(options.text);
  console.log("\n--- HTML Preview ---");
  console.log(`${options.html.substring(0, 500)}...`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

/**
 * SMTP email sender (production mode)
 * Uses Nodemailer to send emails via SMTP
 */
async function sendEmailSMTP(options: EmailOptions, config: EmailConfig): Promise<void> {
  try {
    // Dynamic import of nodemailer (only if installed)
    // @ts-ignore - nodemailer is optional dependency
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: config.smtp?.host,
      port: config.smtp?.port,
      secure: config.smtp?.secure,
      auth: config.smtp?.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[EMAIL] Sent via SMTP to ${options.to}`);
  } catch (error) {
    console.error("[EMAIL] Failed to send via SMTP:", error);
    throw error;
  }
}

/**
 * SendGrid email sender (production mode)
 * Uses SendGrid API to send emails
 */
async function sendEmailSendGrid(options: EmailOptions, config: EmailConfig): Promise<void> {
  try {
    // Dynamic import of @sendgrid/mail (only if installed)
    // @ts-ignore - @sendgrid/mail is optional dependency
    const sgMail = await import("@sendgrid/mail");

    sgMail.default.setApiKey(config.sendgrid?.apiKey);

    await sgMail.default.send({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[EMAIL] Sent via SendGrid to ${options.to}`);
  } catch (error) {
    console.error("[EMAIL] Failed to send via SendGrid:", error);
    throw error;
  }
}

/**
 * Main email sender that routes to appropriate provider
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  const config = getEmailConfig();

  try {
    switch (config.provider) {
      case "console":
        await sendEmailConsole(options);
        break;
      case "smtp":
        await sendEmailSMTP(options, config);
        break;
      case "sendgrid":
        await sendEmailSendGrid(options, config);
        break;
      default:
        console.warn(`[EMAIL] Unknown provider: ${config.provider}, falling back to console`);
        await sendEmailConsole(options);
    }
  } catch (error) {
    // Log error but don't throw - email failures shouldn't crash the app
    console.error("[EMAIL] Failed to send email:", error);
    console.error("[EMAIL] Email details:", {
      to: options.to,
      subject: options.subject,
    });
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Generate HTML email template for verification email
 */
function getVerificationEmailHtml(username: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - VRSS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    }
    .button:hover {
      box-shadow: 0 6px 8px rgba(102, 126, 234, 0.4);
    }
    .alt-link {
      margin-top: 20px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      word-break: break-all;
    }
    .alt-link p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #999999;
    }
    .alt-link a {
      color: #667eea;
      font-size: 14px;
      word-break: break-all;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f9f9f9;
      border-top: 1px solid #eeeeee;
    }
    .footer p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #999999;
    }
    .security-note {
      margin-top: 30px;
      padding: 15px;
      background-color: #fff9e6;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .security-note p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      h1 {
        font-size: 20px;
      }
      .button {
        padding: 14px 30px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">VRSS</h1>
    </div>

    <div class="content">
      <h1>Welcome to VRSS, ${escapeHtml(username)}!</h1>

      <p>
        Thank you for joining the VRSS Social Platform. We're excited to have you as part of our community.
      </p>

      <p>
        To complete your registration and start using your account, please verify your email address by clicking the button below:
      </p>

      <div class="button-container">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>

      <div class="alt-link">
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>

      <div class="security-note">
        <p>
          <strong>Security Note:</strong> This verification link will expire in 24 hours.
          If you didn't create an account with VRSS, you can safely ignore this email.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>
        This is an automated email from VRSS. Please do not reply to this message.
      </p>
      <p>
        &copy; ${new Date().getFullYear()} VRSS Social Platform. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of verification email
 */
function getVerificationEmailText(username: string, verificationUrl: string): string {
  return `
Welcome to VRSS, ${username}!

Thank you for joining the VRSS Social Platform. We're excited to have you as part of our community.

To complete your registration and start using your account, please verify your email address by clicking the link below:

${verificationUrl}

SECURITY NOTE:
This verification link will expire in 24 hours. If you didn't create an account with VRSS, you can safely ignore this email.

---
This is an automated email from VRSS. Please do not reply to this message.
© ${new Date().getFullYear()} VRSS Social Platform. All rights reserved.
  `.trim();
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Send verification email to user
 *
 * Sends a professional HTML email with a verification link.
 * The link includes a token that expires in 24 hours.
 *
 * @param email - User's email address
 * @param username - User's username (for personalization)
 * @param token - Verification token (random, secure)
 *
 * @example
 * await sendVerificationEmail(
 *   "user@example.com",
 *   "johndoe",
 *   "abc123xyz789"
 * );
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  // Build verification URL
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  // Generate email content
  const html = getVerificationEmailHtml(username, verificationUrl);
  const text = getVerificationEmailText(username, verificationUrl);

  // Send email
  await sendEmail({
    to: email,
    subject: "Verify Your Email - VRSS Social Platform",
    html,
    text,
  });
}

// =============================================================================
// FUTURE EMAIL TYPES (Placeholders for Phase 2.4+)
// =============================================================================

/**
 * Send password reset email (TODO: Phase 2.4)
 */
// export async function sendPasswordResetEmail(
//   email: string,
//   username: string,
//   token: string
// ): Promise<void> {
//   // TODO: Implement in Phase 2.4
// }

/**
 * Send notification email (TODO: Phase 3+)
 */
// export async function sendNotificationEmail(
//   email: string,
//   username: string,
//   notification: { type: string; message: string }
// ): Promise<void> {
//   // TODO: Implement in Phase 3+
// }
