import crypto from "crypto";

let argon2: any = null;
let argon2Loaded = false;

async function getArgon2() {
  if (argon2Loaded) return argon2;
  argon2Loaded = true;
  try {
    const mod = await import("argon2");
    if (mod && mod.default) {
      argon2 = mod.default;
    } else {
      argon2 = mod;
    }
  } catch (err) {
    console.warn("Argon2 native library failed to load, falling back to scrypt:", err);
    argon2 = null;
  }
  return argon2;
}

// Safe hashing utility using Argon2 with automatic built-in Node.js scrypt fallback
export async function safeHash(password: string): Promise<string> {
  try {
    const alg = await getArgon2();
    if (alg) {
      return await alg.hash(password.trim(), { type: alg.argon2id });
    }
    throw new Error("Argon2 not available");
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
      const alg = await getArgon2();
      if (alg) {
        return await alg.verify(storedHash, passwordToVerify.trim());
      }
      console.warn("Argon2 verification requested but Argon2 module is not loaded.");
      return false;
    } catch (err) {
      console.warn("Argon2 verification failed/crashed, check fallback scrypt:", err);
      return false;
    }
  } else if (storedHash.startsWith("$scrypt$")) {
    const parts = storedHash.split("$");
    // storedHash is "$scrypt$default$salt$hash" or potentially "$scrypt$salt$hash"
    // parts[0] = ""
    // parts[1] = "scrypt"
    let saltVal = parts[2];
    let hashVal = parts[3];
    if (parts[2] === "default") {
      saltVal = parts[3];
      hashVal = parts[4];
    }
    
    if (!saltVal || !hashVal) {
      console.error("Invalid scrypt hash format:", storedHash);
      return false;
    }

    const verifyHash = crypto.scryptSync(passwordToVerify.trim(), saltVal, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hashVal, "hex"), Buffer.from(verifyHash, "hex"));
  } else {
    return storedHash === passwordToVerify.trim();
  }
}
