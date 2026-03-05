import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, verifyRecoveryCode } from "../src/server/auth/two-factor/recovery";

describe("Recovery Codes", () => {
  it("generates codes", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes.length).toBe(8);
    codes.forEach((c) => expect(c.length).toBe(8));
  });

  it("verifies valid code", () => {
    const codes = generateRecoveryCodes(4);
    const result = verifyRecoveryCode(codes, codes[0]);
    expect(result.valid).toBe(true);
    expect(result.remaining.length).toBe(3);
  });

  it("rejects invalid code", () => {
    const codes = generateRecoveryCodes(4);
    const result = verifyRecoveryCode(codes, "invalid");
    expect(result.valid).toBe(false);
    expect(result.remaining.length).toBe(4);
  });
});
