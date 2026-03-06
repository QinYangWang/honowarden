import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  timingSafeEqual,
  generateNumericCode,
  base64ToBuffer,
  bufferToBase64,
} from "../src/server/auth/password";

describe("Password Utils", () => {
  it("generates salt of correct length", () => {
    const salt = generateSalt(32);
    expect(new Uint8Array(salt).length).toBe(32);
  });

  it("hashes and verifies password", async () => {
    const salt = generateSalt();
    const passwordHash = "dGVzdC1wYXNzd29yZC1oYXNo";
    const hash = await hashPassword(passwordHash, salt, 100);
    const valid = await verifyPassword(passwordHash, hash, salt, 100);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const salt = generateSalt();
    const correctB64 = "Y29ycmVjdC1oYXNo";
    const wrongB64 = "d3JvbmctaGFzaA==";
    const hash = await hashPassword(correctB64, salt, 100);
    const valid = await verifyPassword(wrongB64, hash, salt, 100);
    expect(valid).toBe(false);
  });

  it("timing safe equal works", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  it("generates numeric codes", () => {
    const code = generateNumericCode(6);
    expect(code.length).toBe(6);
    expect(/^\d+$/.test(code)).toBe(true);
  });

  it("base64 roundtrip", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const b64 = bufferToBase64(original.buffer);
    const decoded = new Uint8Array(base64ToBuffer(b64));
    expect(decoded).toEqual(original);
  });

  it("caps PBKDF2 iterations to 100,000", async () => {
    const salt = generateSalt();
    const passwordHash = "dGVzdA==";

    // This should not throw even if the value is large, 
    // because we cap it internally (Cloudflare Workers only support up to 100k)
    const hash = await hashPassword(passwordHash, salt, 200000);
    const valid = await verifyPassword(passwordHash, hash, salt, 200000);

    expect(valid).toBe(true);
    expect(hash.byteLength).toBe(32);
  });
});
