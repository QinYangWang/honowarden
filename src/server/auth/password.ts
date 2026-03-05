export function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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
