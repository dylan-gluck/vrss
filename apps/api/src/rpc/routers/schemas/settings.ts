/**
 * Settings Router Validation Schemas - Phase 3.7
 *
 * Zod schemas for validating settings management inputs.
 * These schemas enforce business rules for account, privacy, and data management.
 *
 * @see docs/tasks/task-3.7.md Phase 3.7
 */

import { z } from "zod";

// =============================================================================
// GET ACCOUNT SETTINGS SCHEMAS
// =============================================================================

export const getAccountSettingsSchema = z.object({});

// =============================================================================
// UPDATE ACCOUNT SCHEMAS
// =============================================================================

export const updateAccountSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores")
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    currentPassword: z
      .string()
      .min(1, "Current password is required for sensitive changes")
      .optional(),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters")
      .max(128, "New password must be at most 128 characters")
      .optional(),
  })
  .refine(
    (data) => {
      // If email or newPassword is being changed, currentPassword is required
      if ((data.email || data.newPassword) && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Current password is required when changing email or password",
      path: ["currentPassword"],
    }
  )
  .refine(
    (data) => {
      // If newPassword is provided, it should be different from currentPassword
      if (data.newPassword && data.currentPassword && data.newPassword === data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // At least one field must be provided
      return data.username || data.email || data.newPassword;
    },
    {
      message: "At least one field must be provided to update",
    }
  );

// =============================================================================
// UPDATE PRIVACY SCHEMAS
// =============================================================================

export const updatePrivacySchema = z
  .object({
    profileVisibility: z
      .enum(["public", "followers", "private"], {
        errorMap: () => ({ message: "Visibility must be public, followers, or private" }),
      })
      .optional(),
    allowMessagesFrom: z
      .enum(["everyone", "followers", "friends", "nobody"], {
        errorMap: () => ({
          message: "Allow messages from must be everyone, followers, friends, or nobody",
        }),
      })
      .optional(),
    showFollowers: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return (
        data.profileVisibility !== undefined ||
        data.allowMessagesFrom !== undefined ||
        data.showFollowers !== undefined
      );
    },
    {
      message: "At least one privacy setting must be provided to update",
    }
  );

// =============================================================================
// DELETE ACCOUNT SCHEMAS
// =============================================================================

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account"),
  confirmation: z.string().refine((val) => val === "DELETE", {
    message: "Confirmation must be exactly 'DELETE'",
  }),
});

// =============================================================================
// EXPORT DATA SCHEMAS
// =============================================================================

export const exportDataSchema = z.object({});
