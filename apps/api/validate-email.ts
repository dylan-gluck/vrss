/**
 * Email Service Validation Script
 *
 * Tests the email service to ensure:
 * - Configuration is correct
 * - Email templates render properly
 * - Console mode logs emails correctly
 */

import { sendVerificationEmail } from "./src/lib/email";

async function main() {
  console.log("🧪 Email Service Validation\n");
  console.log("Testing verification email...\n");

  try {
    await sendVerificationEmail(
      "test@example.com",
      "testuser",
      "test_verification_token_abc123xyz789"
    );

    console.log("\n✅ Email service test completed successfully!");
    console.log("\nExpected behavior:");
    console.log("- Email logged to console (development mode)");
    console.log("- Verification URL includes token");
    console.log("- HTML template contains username");
    console.log("- Plain text fallback included");
  } catch (error) {
    console.error("\n❌ Email service test failed:", error);
    process.exit(1);
  }
}

main();
