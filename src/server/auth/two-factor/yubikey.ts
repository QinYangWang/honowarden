import type { Env } from "../../env";

const YUBICO_API_URL = "https://api.yubico.com/wsapi/2.0/verify";

export function isYubiKeyEnabled(env: Env): boolean {
  return !!(env.YUBICO_CLIENT_ID && env.YUBICO_SECRET_KEY);
}

export async function verifyYubiKeyOtp(env: Env, otp: string): Promise<boolean> {
  if (!isYubiKeyEnabled(env)) return false;

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const clientId = env.YUBICO_CLIENT_ID!;

  const url = `${YUBICO_API_URL}?id=${clientId}&nonce=${nonce}&otp=${otp}`;
  const response = await fetch(url);
  const text = await response.text();

  return text.includes("status=OK");
}

export function extractYubiKeyId(otp: string): string {
  return otp.substring(0, otp.length - 32);
}
