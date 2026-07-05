import { describe, it, expect } from "vitest";
import { safeHash, safeVerify } from "./crypto";

describe("Crypto Utility Hashing and Verification", () => {
  it("should successfully hash a password and verify it correctly", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await safeHash(password);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");

    const isValid = await safeVerify(hash, password);
    expect(isValid).toBe(true);
  });

  it("should fail verification for incorrect passwords", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await safeHash(password);
    
    const isValid = await safeVerify(hash, "WrongPasswordHere");
    expect(isValid).toBe(false);
  });

  it("should fall back to standard cleartext matching if not formatted as a hash", async () => {
    const clearTextPassword = "JustPlaintextHere";
    const isValid = await safeVerify(clearTextPassword, clearTextPassword);
    expect(isValid).toBe(true);

    const isInvalid = await safeVerify(clearTextPassword, "AnotherOne");
    expect(isInvalid).toBe(false);
  });
});
