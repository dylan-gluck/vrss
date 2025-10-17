/**
 * Simple test to verify Bun test runner works
 */

import { describe, expect, it } from "bun:test";

describe("Simple Test", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });

  it("should work with async", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
