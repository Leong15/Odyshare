import argon2 from "argon2";
import crypto from "crypto";

// Safe hashing utility using Argon2 with automatic built-in Node.js scrypt fallback
export async function safeHash(password: string): Promise<string> {
  try {
    return await argon2.hash(password.trim(), { type: argon2.argon2id });
  } catch (err) {
    console.warn("Argon2 hashing failed, falling back to secure scrypt:", err);
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password.trim(), salt, 64).toString("hex");
    return `$scrypt$default$${salt}$${hash}`;
  }
}

export async function safeVerify(storedHash: string, passwordToVerify: string): Promise<boolean> {
  if (storedHash.startsWith("$argon2")) {
    try {
      return await argon2.verify(storedHash, passwordToVerify.trim());
    } catch (err) {
      console.warn("Argon2 verification failed/crashed, check fallback scrypt:", err);
      return false;
    }
  } else if (storedHash.startsWith("$scrypt$")) {
    const parts = storedHash.split("$");
    const salt = parts[3] ? parts[3] : parts[2]; // handle potential array alignment
    // Let's use the exact original parsing from auth.ts:
    // const parts = storedHash.split("$");
    // const salt = parts[2];
    // const hash = parts[3];
    // Let's keep it strictly identical:
    const saltVal = parts[2];
    const hashVal = parts[3];
    const verifyHash = crypto.scryptSync(passwordToVerify.trim(), saltVal, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hashVal, "hex"), Buffer.from(verifyHash, "hex"));
  } else {
    return storedHash === passwordToVerify.trim();
  }
}
