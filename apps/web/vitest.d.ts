/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import type { Assertion, AsymmetricMatchersContaining, ExpectStatic, VitestUtils } from "vitest";

// Augment vitest module to add testing-library matchers and fix module exports
declare module "vitest" {
  interface Assertion<T = any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}

  // Re-export vitest functions for imports from @vitest/runner
  export {
    describe,
    it,
    test,
    suite,
    beforeAll,
    beforeEach,
    afterAll,
    afterEach,
    onTestFailed,
    onTestFinished,
  } from "@vitest/runner";

  // Re-export from other vitest packages
  export { expectTypeOf } from "expect-type";
  export type { ExpectTypeOf } from "expect-type";

  // Export vitest core functions
  export const expect: ExpectStatic;
  export const vi: VitestUtils;
  export const vitest: VitestUtils;
}
