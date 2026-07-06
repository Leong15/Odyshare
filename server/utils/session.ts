import crypto from "crypto";

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
 * Sign session for a user by appending a secure HMAC-SHA256 signature to their userId.
 */
export function signSession(userId: string): string {
  const secret = getSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(userId)
    .digest("hex");
  return `${userId}.${signature}`;
}

/**
 * Verify session token. Returns the userId if valid, or null if invalid.
 */
export function verifySession(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, signature] = parts;
  const secret = getSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(userId)
    .digest("hex");

  try {
    const buf1 = Buffer.from(signature, "hex");
    const buf2 = Buffer.from(expectedSignature, "hex");
    if (buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2)) {
      return userId;
    }
  } catch {
    return null;
  }
  return null;
}
