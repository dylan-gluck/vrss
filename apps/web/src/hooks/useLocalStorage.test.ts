import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage Hook", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Clear console.error mock
    vi.restoreAllMocks();
  });

  it("should initialize with the provided initial value", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  it("should update the stored value when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
  });

  it("should persist value to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("persisted");
    });

    const storedValue = window.localStorage.getItem("test-key");
    expect(storedValue).toBe(JSON.stringify("persisted"));
  });

  it("should read existing value from localStorage on initialization", () => {
    window.localStorage.setItem("test-key", JSON.stringify("existing"));

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("existing");
  });

  it("should handle complex objects", () => {
    const complexObject = { name: "Test", count: 42, active: true };
    const { result } = renderHook(() => useLocalStorage("test-object", complexObject));

    expect(result.current[0]).toEqual(complexObject);

    const updatedObject = { name: "Updated", count: 100, active: false };
    act(() => {
      result.current[1](updatedObject);
    });

    expect(result.current[0]).toEqual(updatedObject);
    expect(JSON.parse(window.localStorage.getItem("test-object") || "{}")).toEqual(updatedObject);
  });

  it("should handle arrays", () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage("test-array", initialArray));

    expect(result.current[0]).toEqual(initialArray);

    act(() => {
      result.current[1]([4, 5, 6]);
    });

    expect(result.current[0]).toEqual([4, 5, 6]);
  });

  it("should support functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("test-counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 10);
    });

    expect(result.current[0]).toBe(11);
  });

  it("should handle invalid JSON in localStorage gracefully", () => {
    // Mock console.error to suppress expected error output
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty - suppressing console.error during test
    });

    window.localStorage.setItem("test-key", "invalid-json{");

    const { result } = renderHook(() => useLocalStorage("test-key", "fallback"));

    expect(result.current[0]).toBe("fallback");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  // Note: Testing localStorage quota errors is complex in a test environment
  // The hook has error handling in place (try-catch with console.error)
  // but mocking Storage.prototype methods in happy-dom is unreliable

  it("should handle multiple instances with the same key", () => {
    const { result: result1 } = renderHook(() => useLocalStorage("shared-key", 0));
    // result2 is intentionally unused - testing that multiple instances can coexist
    const { result: _result2 } = renderHook(() => useLocalStorage("shared-key", 0));

    act(() => {
      result1.current[1](42);
    });

    // Both hooks should read from the same localStorage
    const storedValue = window.localStorage.getItem("shared-key");
    expect(storedValue).toBe(JSON.stringify(42));

    // Note: result2 won't automatically update unless we add storage event listeners
    // This is expected behavior for this simple implementation
  });

  it("should work with different data types", () => {
    // String
    const { result: stringResult } = renderHook(() => useLocalStorage("string-key", "test"));
    expect(stringResult.current[0]).toBe("test");

    // Number
    const { result: numberResult } = renderHook(() => useLocalStorage("number-key", 42));
    expect(numberResult.current[0]).toBe(42);

    // Boolean
    const { result: boolResult } = renderHook(() => useLocalStorage("bool-key", true));
    expect(boolResult.current[0]).toBe(true);

    // Null
    const { result: nullResult } = renderHook(() => useLocalStorage("null-key", null));
    expect(nullResult.current[0]).toBe(null);
  });
});
