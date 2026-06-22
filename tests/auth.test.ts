import { describe, it, expect } from "vitest";
import { checkPassphrase } from "../lib/auth";

describe("checkPassphrase", () => {
  it("accepts an exact match", () => {
    expect(checkPassphrase("hunter2", "hunter2")).toBe(true);
  });
  it("rejects a mismatch", () => {
    expect(checkPassphrase("hunter2", "nope")).toBe(false);
  });
  it("rejects empty or missing values", () => {
    expect(checkPassphrase("", "hunter2")).toBe(false);
    expect(checkPassphrase("hunter2", "")).toBe(false);
    expect(checkPassphrase(null, null)).toBe(false);
    expect(checkPassphrase(undefined, undefined)).toBe(false);
  });
});
