import type { Env } from "../../env";
import { generateNumericCode } from "../password";

const EMAIL_CODE_EXPIRY = 600;

export async function generateEmailCode(env: Env, userId: string): Promise<string> {
  const code = generateNumericCode(6);
  await env.RATE_LIMIT.put(`2fa_email:${userId}`, code, { expirationTtl: EMAIL_CODE_EXPIRY });
  return code;
}

export async function verifyEmailCode(env: Env, userId: string, code: string): Promise<boolean> {
  const stored = await env.RATE_LIMIT.get(`2fa_email:${userId}`);
  if (!stored) return false;
  if (stored !== code) return false;
  await env.RATE_LIMIT.delete(`2fa_email:${userId}`);
  return true;
}
