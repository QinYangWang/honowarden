import { importPKCS8, exportJWK } from "jose";
import type { Env } from "../env";

let privateKey: CryptoKey;
let publicKey: CryptoKey;

export async function initializeKeys(env: Env) {
  if (privateKey && publicKey) return;

  const pemData = env.RSA_PRIVATE_KEY?.trim();
  if (!pemData) {
    throw new Error("RSA_PRIVATE_KEY is missing from environment");
  }

  try {
    privateKey = await importPKCS8(pemData, "RS256", { extractable: true });
  } catch (error) {
    console.error("Failed to import RSA_PRIVATE_KEY:", error);
    throw new Error("Invalid RSA_PRIVATE_KEY format. Expected PKCS8 PEM string.");
  }

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
