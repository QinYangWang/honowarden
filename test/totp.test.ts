import { describe, it, expect } from "vitest";
import { generateSecret, generateOtpauthUri } from "../src/server/auth/two-factor/totp";

describe("TOTP", () => {
  it("generates a secret", () => {
    const secret = generateSecret();
    expect(secret.length).toBeGreaterThan(10);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("generates otpauth URI", () => {
    const uri = generateOtpauthUri("JBSWY3DPEHPK3PXP", "user@example.com");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=HonoWarden");
  });
});
