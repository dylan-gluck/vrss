import { describe, expect, it } from "vitest";
import manifest from "../../../public/manifest.json";

/**
 * PWA Manifest Validation Tests
 *
 * Validates that the PWA manifest.json file conforms to the Web App Manifest specification
 * and includes all required properties for a proper PWA installation.
 */
describe("PWA Manifest", () => {
  it("should have required basic properties", () => {
    expect(manifest.name).toBe("VRSS Social Platform");
    expect(manifest.short_name).toBe("VRSS");
    expect(manifest.description).toBeDefined();
    expect(manifest.start_url).toBe("/");
  });

  it("should have proper display mode for standalone app", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("should have theme colors defined", () => {
    expect(manifest.background_color).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
    expect(typeof manifest.background_color).toBe("string");
    expect(typeof manifest.theme_color).toBe("string");
  });

  it("should have proper orientation setting", () => {
    expect(manifest.orientation).toBe("portrait-primary");
  });

  it("should have categories defined", () => {
    expect(manifest.categories).toBeDefined();
    expect(Array.isArray(manifest.categories)).toBe(true);
    expect(manifest.categories).toContain("social");
  });

  it("should have all required icon sizes", () => {
    const requiredSizes = ["192x192", "512x512"];
    const iconSizes = manifest.icons.map((icon) => icon.sizes);

    for (const size of requiredSizes) {
      expect(iconSizes).toContain(size);
    }
  });

  it("should have icons with correct properties", () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    for (const icon of manifest.icons) {
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBe("image/png");
      expect(icon.purpose).toBeDefined();
    }
  });

  it("should have maskable icons for adaptive icon support", () => {
    const maskableIcons = manifest.icons.filter((icon) =>
      icon.purpose?.includes("maskable")
    );
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  it("should have comprehensive icon coverage (72x72 to 512x512)", () => {
    const expectedSizes = [
      "72x72",
      "96x96",
      "128x128",
      "144x144",
      "152x152",
      "192x192",
      "384x384",
      "512x512",
    ];
    const iconSizes = manifest.icons.map((icon) => icon.sizes);

    for (const size of expectedSizes) {
      expect(iconSizes).toContain(size);
    }
  });

  it("should have valid icon paths", () => {
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\/icons\/icon-\d+x\d+\.png$/);
    }
  });

  it("should have proper structure for installability", () => {
    // Check all properties required for PWA installability
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("short_name");
    expect(manifest).toHaveProperty("start_url");
    expect(manifest).toHaveProperty("display");
    expect(manifest).toHaveProperty("icons");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2); // At least 192x192 and 512x512
  });
});
