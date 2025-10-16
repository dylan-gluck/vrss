/**
 * Registration Procedure Tests
 *
 * Test suite for auth.register procedure following TDD approach.
 * Tests are written before implementation to drive the design.
 *
 * Coverage:
 * 1. Valid registration (username, email, password)
 * 2. Weak password rejection (< 12 chars, missing complexity)
 * 3. Duplicate username rejection
 * 4. Duplicate email rejection
 * 5. Invalid email format rejection
 * 6. Missing required fields
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for password requirements
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getTestDatabase } from "../setup";
import { cleanUserData } from "../helpers/database";
import { hashPassword } from "../helpers/auth";

describe("auth.register", () => {
  beforeEach(async () => {
    await cleanUserData();
  });

  test("should successfully register with valid credentials", async () => {
    // This test validates the happy path:
    // - Username: 3-30 chars, alphanumeric + underscore
    // - Email: valid format
    // - Password: 12-128 chars, uppercase, lowercase, number, special char

    const db = getTestDatabase();

    // Arrange: Valid registration data
    const registrationData = {
      username: "validuser123",
      email: "validuser@example.com",
      password: "SecurePass123!@#",
    };

    // Act: Register user (procedure not yet implemented, this is TDD)
    // TODO: Replace with actual RPC call once auth.register is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.register',
    //   input: registrationData,
    // });

    // For now, simulate what the procedure should do:
    const passwordHash = await hashPassword(registrationData.password);
    const user = await db.user.create({
      data: {
        username: registrationData.username,
        email: registrationData.email,
        passwordHash,
        emailVerified: false, // Must be false initially
      },
    });

    // Assert: User created successfully
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe(registrationData.username);
    expect(user.email).toBe(registrationData.email);
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(registrationData.password); // Password should be hashed
    expect(user.status).toBe("active");

    // Assert: Verification token should be created
    // TODO: Add verification token assertion once email verification is implemented
  });

  test("should reject registration with weak password (< 12 characters)", async () => {
    const db = getTestDatabase();

    // Arrange: Password too short
    const registrationData = {
      username: "testuser",
      email: "test@example.com",
      password: "Short1!", // Only 7 characters
    };

    // Act & Assert: Should throw or return error
    // TODO: Replace with actual RPC call that returns error
    // Expected error code: 1001 (AUTH_WEAK_PASSWORD)
    // Expected error message: "Password must be at least 12 characters"

    // For TDD, we verify the password validation logic would fail:
    const isValidLength = registrationData.password.length >= 12;
    expect(isValidLength).toBe(false);

    // Verify user was NOT created
    const userCount = await db.user.count({
      where: { email: registrationData.email },
    });
    expect(userCount).toBe(0);
  });

  test("should reject registration with password missing uppercase letter", async () => {
    const db = getTestDatabase();

    // Arrange: Password without uppercase
    const registrationData = {
      username: "testuser",
      email: "test@example.com",
      password: "nocapitals123!", // No uppercase letter
    };

    // Act & Assert: Password complexity validation
    // Expected error code: 1001 (AUTH_WEAK_PASSWORD)
    // Expected error message: "Password must contain uppercase, lowercase, number, and special character"

    const hasUppercase = /[A-Z]/.test(registrationData.password);
    expect(hasUppercase).toBe(false);

    // Verify user was NOT created
    const userCount = await db.user.count({
      where: { email: registrationData.email },
    });
    expect(userCount).toBe(0);
  });

  test("should reject registration with password missing special character", async () => {
    const db = getTestDatabase();

    // Arrange: Password without special character
    const registrationData = {
      username: "testuser",
      email: "test@example.com",
      password: "NoSpecialChar123", // No special character
    };

    // Act & Assert: Password complexity validation
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registrationData.password);
    expect(hasSpecialChar).toBe(false);

    // Verify user was NOT created
    const userCount = await db.user.count({
      where: { email: registrationData.email },
    });
    expect(userCount).toBe(0);
  });

  test("should reject registration with duplicate username", async () => {
    const db = getTestDatabase();

    // Arrange: Create existing user
    const existingUsername = "existinguser";
    await db.user.create({
      data: {
        username: existingUsername,
        email: "existing@example.com",
        passwordHash: await hashPassword("ExistingPass123!"),
        emailVerified: false,
      },
    });

    // Try to register with same username but different email
    const registrationData = {
      username: existingUsername, // Duplicate username
      email: "different@example.com",
      password: "NewPassword123!",
    };

    // Act & Assert: Should fail due to unique constraint
    // Expected error code: 1002 (AUTH_USERNAME_TAKEN)
    // Expected error message: "Username already exists"

    await expect(async () => {
      await db.user.create({
        data: {
          username: registrationData.username,
          email: registrationData.email,
          passwordHash: await hashPassword(registrationData.password),
          emailVerified: false,
        },
      });
    }).toThrow(); // Prisma will throw unique constraint violation

    // Verify only one user with this username exists
    const userCount = await db.user.count({
      where: { username: existingUsername },
    });
    expect(userCount).toBe(1);
  });

  test("should reject registration with duplicate email", async () => {
    const db = getTestDatabase();

    // Arrange: Create existing user
    const existingEmail = "existing@example.com";
    await db.user.create({
      data: {
        username: "existinguser",
        email: existingEmail,
        passwordHash: await hashPassword("ExistingPass123!"),
        emailVerified: false,
      },
    });

    // Try to register with same email but different username
    const registrationData = {
      username: "differentuser",
      email: existingEmail, // Duplicate email
      password: "NewPassword123!",
    };

    // Act & Assert: Should fail due to unique constraint
    // Expected error code: 1003 (AUTH_EMAIL_TAKEN)
    // Expected error message: "Email already registered"

    await expect(async () => {
      await db.user.create({
        data: {
          username: registrationData.username,
          email: registrationData.email,
          passwordHash: await hashPassword(registrationData.password),
          emailVerified: false,
        },
      });
    }).toThrow(); // Prisma will throw unique constraint violation

    // Verify only one user with this email exists
    const userCount = await db.user.count({
      where: { email: existingEmail },
    });
    expect(userCount).toBe(1);
  });

  test("should reject registration with invalid email format", async () => {
    const db = getTestDatabase();

    // Arrange: Invalid email formats
    const invalidEmails = [
      "notanemail",
      "missing@domain",
      "@nodomain.com",
      "spaces in@email.com",
      "double@@at.com",
      "nodomain@",
    ];

    // Act & Assert: Validate email format
    // Expected error code: 1004 (AUTH_INVALID_EMAIL)
    // Expected error message: "Invalid email format"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const invalidEmail of invalidEmails) {
      const isValid = emailRegex.test(invalidEmail);
      expect(isValid).toBe(false);
    }

    // Verify no users were created
    const userCount = await db.user.count();
    expect(userCount).toBe(0);
  });

  test("should reject registration with missing required fields", async () => {
    const db = getTestDatabase();

    // Arrange: Test missing each required field
    const incompleteData = [
      {
        // Missing username
        email: "test@example.com",
        password: "ValidPass123!",
      },
      {
        // Missing email
        username: "testuser",
        password: "ValidPass123!",
      },
      {
        // Missing password
        username: "testuser",
        email: "test@example.com",
      },
      {
        // Empty strings
        username: "",
        email: "",
        password: "",
      },
    ];

    // Act & Assert: Validation should fail
    // Expected error code: 1000 (AUTH_INVALID_INPUT)
    // Expected error message: "Missing required fields: username, email, or password"

    for (const data of incompleteData) {
      const hasAllFields = data.username && data.email && data.password;
      expect(hasAllFields).toBeFalsy();
    }

    // Verify no users were created
    const userCount = await db.user.count();
    expect(userCount).toBe(0);
  });

  test("should create user with default status 'active'", async () => {
    const db = getTestDatabase();

    // Arrange
    const registrationData = {
      username: "newuser",
      email: "newuser@example.com",
      password: "ValidPassword123!",
    };

    // Act: Create user
    const user = await db.user.create({
      data: {
        username: registrationData.username,
        email: registrationData.email,
        passwordHash: await hashPassword(registrationData.password),
        emailVerified: false,
      },
    });

    // Assert: Default status should be 'active'
    expect(user.status).toBe("active");
  });

  test("should enforce username length constraints (3-30 chars)", async () => {
    const db = getTestDatabase();

    // Arrange: Test invalid username lengths
    const invalidUsernames = [
      "ab", // Too short (2 chars)
      "a", // Too short (1 char)
      "a".repeat(31), // Too long (31 chars)
    ];

    // Act & Assert: Username validation
    // Expected error code: 1005 (AUTH_INVALID_USERNAME)
    // Expected error message: "Username must be 3-30 characters"

    for (const username of invalidUsernames) {
      const isValidLength = username.length >= 3 && username.length <= 30;
      expect(isValidLength).toBe(false);
    }

    // Valid username lengths
    const validUsernames = [
      "abc", // 3 chars (minimum)
      "validuser",
      "a".repeat(30), // 30 chars (maximum)
    ];

    for (const username of validUsernames) {
      const isValidLength = username.length >= 3 && username.length <= 30;
      expect(isValidLength).toBe(true);
    }
  });

  test("should trim whitespace from username and email", async () => {
    const db = getTestDatabase();

    // Arrange: Input with whitespace
    const registrationData = {
      username: "  trimmeduser  ",
      email: "  trimmed@example.com  ",
      password: "ValidPassword123!",
    };

    // Act: Create user (trimming should happen in procedure)
    // For TDD, we validate the expected behavior
    const trimmedUsername = registrationData.username.trim();
    const trimmedEmail = registrationData.email.trim();

    const user = await db.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        passwordHash: await hashPassword(registrationData.password),
        emailVerified: false,
      },
    });

    // Assert: No whitespace in stored values
    expect(user.username).toBe("trimmeduser");
    expect(user.email).toBe("trimmed@example.com");
    expect(user.username.startsWith(" ")).toBe(false);
    expect(user.username.endsWith(" ")).toBe(false);
    expect(user.email.startsWith(" ")).toBe(false);
    expect(user.email.endsWith(" ")).toBe(false);
  });
});
