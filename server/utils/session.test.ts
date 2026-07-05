import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

describe("Session signing and verification", () => {
  it("should securely sign a session and retrieve the correct user id", () => {
    const userId = "user_test_123456";
    const token = signSession(userId);
    
    expect(token).toContain(userId);
    expect(token.split(".")).toHaveLength(2);

    const verifiedUserId = verifySession(token);
    expect(verifiedUserId).toBe(userId);
  });

  it("should return null for tampered session tokens", () => {
    const userId = "user_test_123456";
    const token = signSession(userId);
    
    // Tamper the signature part
    const parts = token.split(".");
    parts[1] = parts[1].substring(0, parts[1].length - 4) + "beef";
    const tamperedToken = parts.join(".");

    expect(verifySession(tamperedToken)).toBeNull();
  });

  it("should return null for malformed tokens", () => {
    expect(verifySession("invalid-token-format")).toBeNull();
    expect(verifySession("")).toBeNull();
  });
});
