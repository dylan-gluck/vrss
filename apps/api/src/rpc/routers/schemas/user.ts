/**
 * User Router Validation Schemas - Phase 3.1
 *
 * Zod schemas for validating user profile and section management inputs.
 * These schemas enforce business rules for profile customization.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.1
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 130-171 (user_profiles)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 394-425 (profile_sections)
 */

import { z } from "zod";

// =============================================================================
// GET PROFILE SCHEMAS
// =============================================================================

export const getProfileSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

// =============================================================================
// UPDATE PROFILE SCHEMAS
// =============================================================================

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name must be at least 1 character")
    .max(100, "Display name must be at most 100 characters")
    .optional(),
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  avatarUrl: z.string().url("Avatar URL must be a valid URL").optional(),
  visibility: z
    .enum(["public", "followers", "private"], {
      errorMap: () => ({ message: "Visibility must be public, followers, or private" }),
    })
    .optional(),
  avatarSize: z.number().int().positive().optional(), // For storage quota validation
});

// =============================================================================
// UPDATE STYLE SCHEMAS
// =============================================================================

// Background configuration schema
export const backgroundConfigSchema = z
  .object({
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Background color must be a valid hex color (#RRGGBB)")
      .optional(),
    image: z.string().url("Background image must be a valid URL").optional(),
    position: z.string().optional(),
    repeat: z.string().optional(),
    size: z.string().optional(),
  })
  .optional();

// Music configuration schema
export const musicConfigSchema = z
  .object({
    url: z.string().url("Music URL must be a valid URL"),
    autoplay: z.boolean().optional(),
    volume: z.number().min(0).max(1).optional(),
    loop: z.boolean().optional(),
  })
  .optional();

// Style configuration schema
export const styleConfigSchema = z
  .object({
    fontFamily: z.string().optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex color (#RRGGBB)")
      .optional(),
    secondaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Secondary color must be a valid hex color (#RRGGBB)")
      .optional(),
    textColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Text color must be a valid hex color (#RRGGBB)")
      .optional(),
    backgroundColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Background color must be a valid hex color (#RRGGBB)")
      .optional(),
  })
  .optional();

// Main update style schema
export const updateStyleSchema = z
  .object({
    backgroundConfig: backgroundConfigSchema,
    musicConfig: musicConfigSchema,
    styleConfig: styleConfigSchema,
  })
  .refine(
    (data) => data.backgroundConfig || data.musicConfig || data.styleConfig,
    "At least one style configuration must be provided"
  );

// =============================================================================
// UPDATE SECTIONS SCHEMAS
// =============================================================================

// Section type enum (must match DATABASE_SCHEMA.md SectionType enum)
export const sectionTypeSchema = z.enum(
  [
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
  ],
  {
    errorMap: () => ({ message: "Invalid section type" }),
  }
);

// Profile section schema
export const profileSectionSchema = z.object({
  id: z.string().optional(), // If present, update existing; if absent, create new
  type: sectionTypeSchema,
  title: z
    .string()
    .min(1, "Section title is required")
    .max(100, "Section title must be at most 100 characters"),
  description: z.string().max(500, "Section description must be at most 500 characters").optional(),
  config: z.record(z.unknown()).optional(), // JSONB config
  displayOrder: z.number().int().min(0, "Display order must be non-negative"),
  isVisible: z.boolean().default(true),
});

// Update sections input schema
export const updateSectionsSchema = z.object({
  sections: z.array(profileSectionSchema),
});

// =============================================================================
// GET SECTIONS SCHEMAS
// =============================================================================

export const getSectionsSchema = z.object({
  username: z.string().min(1, "Username is required"),
});
