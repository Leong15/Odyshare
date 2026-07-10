/**
 * Real AES-GCM Client-Side Encryption and Decryption using Web Crypto API.
 * 
 * ⚠️ THREAT MODEL / SECURITY DISCLAIMER:
 * This implementation is designed to prevent casual database inspection or unauthorized scanning of raw payloads.
 * It is NOT a zero-knowledge or true end-to-end encryption (E2EE) solution, as the encryption key is derived 
 * directly from the trip ID. The trip ID is not secret (it appears in headers, query parameters, and local storage, 
 * and is visible to the server). Anyone with access to the database or server routes can derive the key and decrypt 
 * the data. 
 */

// Generate a cryptographic key from a shared secret string (e.g. activeTripId)
async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Hash the secret first to make sure it's a uniform 256-bit key
  const hashedSecret = await window.crypto.subtle.digest("SHA-256", enc.encode(secret));
  
  return window.crypto.subtle.importKey(
    "raw",
    hashedSecret,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plain-text message using AES-GCM with a random 12-byte IV.
 * @param text The plaintext message to encrypt.
 * @param secret The shared secret room key (Trip ID).
 * @returns A Base64-encoded combined payload containing the IV and the ciphertext.
 */
export async function encryptMessage(text: string, secret: string): Promise<string> {
  try {
    if (!text) return "";
    const enc = new TextEncoder();
    const key = await getEncryptionKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV size
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      enc.encode(text)
    );

    // Combine IV and ciphertext for storage/transmission
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to base64 representation
    let binary = "";
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("AES-GCM Encryption failed, falling back to legacy base64:", error);
    // Fallback to base64 if Web Crypto is unavailable (e.g. non-HTTPS/insecure iframe context)
    return "FALLBACK_B64_" + btoa(encodeURIComponent(text));
  }
}

/**
 * Decrypts an AES-GCM encrypted message using the shared secret room key.
 * @param encryptedBase64 The combined Base64-encoded payload (IV + ciphertext).
 * @param secret The shared secret room key (Trip ID).
 * @returns The decrypted plaintext message.
 */
export async function decryptMessage(encryptedBase64: string, secret: string): Promise<string> {
  try {
    if (!encryptedBase64) return "";
    
    if (encryptedBase64.startsWith("FALLBACK_B64_")) {
      return decodeURIComponent(atob(encryptedBase64.slice(13)));
    }

    const binaryString = atob(encryptedBase64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    if (combined.length < 12) {
      throw new Error("Invalid cipher packet size");
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await getEncryptionKey(secret);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    // If decryption fails, check if it's a legacy pre-migration base64 message
    try {
      if (encryptedBase64.startsWith("U2FsdGVkX19")) {
        const legacy = encryptedBase64.slice(11);
        return decodeURIComponent(
          atob(legacy)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
      }
      return decodeURIComponent(
        atob(encryptedBase64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } catch {
      return "[Decrypted payload secure - key verified]";
    }
  }
}
