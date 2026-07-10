import { describe, it, expect, vi } from "vitest";
import { signSession, verifySession } from "./session";
import { SESSION_TTL_MS } from "../../src/lib/constants/auth";

describe("Session signing and verification", () => {
  it("should securely sign a session and retrieve the correct user id", () => {
    const userId = "user_test_123456";
    const token = signSession(userId);
    
    expect(token).toContain(userId);
    expect(token.split(".")).toHaveLength(3);

    const verifiedUserId = verifySession(token);
    expect(verifiedUserId).toBe(userId);
  });

  it("should return null for tampered session tokens", () => {
    const userId = "user_test_123456";
    const token = signSession(userId);
    
    // Tamper the signature part
    const parts = token.split(".");
    parts[2] = parts[2].substring(0, parts[2].length - 4) + "beef";
    const tamperedToken = parts.join(".");

    expect(verifySession(tamperedToken)).toBeNull();
  });

  it("should return null for malformed tokens", () => {
    expect(verifySession("invalid-token-format")).toBeNull();
    expect(verifySession("")).toBeNull();
  });

  it("should return null for expired session tokens", () => {
    const userId = "user_test_123456";
    const baseTime = 1700000000000;
    const spy = vi.spyOn(Date, "now").mockReturnValue(baseTime);

    const token = signSession(userId);

    // Mock Date.now to after SESSION_TTL_MS has passed
    spy.mockReturnValue(baseTime + SESSION_TTL_MS + 1000);

    expect(verifySession(token)).toBeNull();
    spy.mockRestore();
  });

  it("should succeed for nearly expired but valid sessions", () => {
    const userId = "user_test_123456";
    const baseTime = 1700000000000;
    const spy = vi.spyOn(Date, "now").mockReturnValue(baseTime);

    const token = signSession(userId);

    // Mock Date.now to just before SESSION_TTL_MS
    spy.mockReturnValue(baseTime + SESSION_TTL_MS - 1000);

    expect(verifySession(token)).toBe(userId);
    spy.mockRestore();
  });
});
