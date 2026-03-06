function normalizeBase64(b64: string): string {
  if (!b64 || typeof b64 !== "string") return "";
  // Strip whitespace and replace base64url characters
  let s = b64.trim().replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");

  // Remove any characters that are not valid base64
  s = s.replace(/[^A-Za-z0-9+/]/g, (match, offset) => {
    // Keep padding if it's at the end
    if (match === "=" && offset >= s.length - 2) return "=";
    return "";
  });

  const pad = s.length % 4;
  if (pad === 1) {
    // Length % 4 == 1 is invalid for base64. 
    // This usually means the last character is extra or the string is truncated.
    s = s.slice(0, -1);
  } else if (pad > 1) {
    s += "=".repeat(4 - pad);
  }
  return s;
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const normalized = normalizeBase64(b64);
  if (!normalized) {
    return new ArrayBuffer(0);
  }

  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("base64ToBuffer failed:", error, "input:", b64, "normalized:", normalized);
    return new ArrayBuffer(0);
  }
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export async function verifyPassword(
  passwordHash: string,
  storedHash: ArrayBuffer,
  storedSalt: ArrayBuffer,
  iterations: number,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBuffer(passwordHash),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: storedSalt, iterations, hash: "SHA-256" },
    key,
    256,
  );

  return timingSafeEqual(new Uint8Array(derived), new Uint8Array(storedHash));
}

export async function hashPassword(
  passwordHash: string,
  salt: ArrayBuffer,
  iterations: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBuffer(passwordHash),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function generateSalt(length: number = 32): ArrayBuffer {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt.buffer;
}

export function generateNumericCode(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => String(b % 10)).join("");
}

export async function verifyAdminToken(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$argon2")) {
    const inputBytes = new TextEncoder().encode(input);
    const storedBytes = new TextEncoder().encode(stored);
    return timingSafeEqual(inputBytes, storedBytes);
  }
  return timingSafeEqual(
    new TextEncoder().encode(input),
    new TextEncoder().encode(stored),
  );
}
