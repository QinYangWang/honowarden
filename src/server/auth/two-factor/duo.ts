import type { Env } from "../../env";

export function isDuoEnabled(env: Env): boolean {
  return !!(env.DUO_IKEY && env.DUO_SKEY && env.DUO_HOST);
}

export async function initiateDuoAuth(env: Env, email: string, state: string): Promise<string> {
  const host = env.DUO_HOST!;
  const clientId = env.DUO_IKEY!;
  const redirectUri = `${env.DOMAIN}/identity/two-factor/duo-callback`;
  const url = `https://${host}/oauth/v1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&login_hint=${encodeURIComponent(email)}`;
  return url;
}

export async function verifyDuoCallback(env: Env, code: string): Promise<boolean> {
  if (!isDuoEnabled(env)) return false;

  const host = env.DUO_HOST!;
  const clientId = env.DUO_IKEY!;
  const clientSecret = env.DUO_SKEY!;

  const response = await fetch(`https://${host}/oauth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(`${env.DOMAIN}/identity/two-factor/duo-callback`)}`,
  });

  return response.ok;
}
