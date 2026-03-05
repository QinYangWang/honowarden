import { importPKCS8, exportJWK } from "jose";
import type { Env } from "../env";

let privateKey: CryptoKey;
let publicKey: CryptoKey;

export async function initializeKeys(env: Env) {
  const pemData = env.RSA_PRIVATE_KEY;
  privateKey = await importPKCS8(pemData, "RS256");

  const jwk = await exportJWK(privateKey);
  delete jwk.d;
  delete jwk.p;
  delete jwk.q;
  delete jwk.dp;
  delete jwk.dq;
  delete jwk.qi;

  publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"]
  );
}

export function getPrivateKey(): CryptoKey {
  return privateKey;
}

export function getPublicKey(): CryptoKey {
  return publicKey;
}
