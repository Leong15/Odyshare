import crypto from "crypto";
import { SESSION_TTL_MS } from "../../src/lib/constants/auth.js";

const getSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in production environment!");
    }
    console.warn("WARNING: SESSION_SECRET is missing. Falling back to default local development secret. (DO NOT use this in production)");
    return "default_local_dev_session_secret_xyz123";
  }
  return secret;
};

/**
 * Sign session for a user by appending a secure HMAC-SHA256 signature to their userId and issuance timestamp.
 */
export function signSession(userId: string): string {
  const issuedAtEpochMs = Date.now();
  const secret = getSecret();
  const dataToSign = `${userId}.${issuedAtEpochMs}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("hex");
  return `${userId}.${issuedAtEpochMs}.${signature}`;
}

/**
 * Detailed verification that returns specific error codes.
 */
export function verifySessionDetailed(token: string): { userId: string | null; error?: "SESSION_EXPIRED" | "INVALID" } {
  if (!token) return { userId: null, error: "INVALID" };
  const parts = token.split(".");
  if (parts.length !== 3) return { userId: null, error: "INVALID" };
  const [userId, issuedAtStr, signature] = parts;
  const secret = getSecret();
  const dataToSign = `${userId}.${issuedAtStr}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("hex");

  try {
    const buf1 = Buffer.from(signature, "hex");
    const buf2 = Buffer.from(expectedSignature, "hex");
    if (buf1.length !== buf2.length || !crypto.timingSafeEqual(buf1, buf2)) {
      return { userId: null, error: "INVALID" };
    }
  } catch {
    return { userId: null, error: "INVALID" };
  }

  const issuedAtEpochMs = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAtEpochMs)) return { userId: null, error: "INVALID" };

  if (Date.now() - issuedAtEpochMs > SESSION_TTL_MS) {
    return { userId, error: "SESSION_EXPIRED" };
  }

  return { userId };
}

/**
 * Verify session token. Returns the userId if valid, or null if invalid or expired.
 */
export function verifySession(token: string): string | null {
  const result = verifySessionDetailed(token);
  if (result.error) return null;
  return result.userId;
}
