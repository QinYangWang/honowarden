export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    codes.push(hex);
  }
  return codes;
}

export function verifyRecoveryCode(storedCodes: string[], code: string): { valid: boolean; remaining: string[] } {
  const idx = storedCodes.indexOf(code.toLowerCase());
  if (idx === -1) return { valid: false, remaining: storedCodes };
  const remaining = [...storedCodes];
  remaining.splice(idx, 1);
  return { valid: true, remaining };
}
