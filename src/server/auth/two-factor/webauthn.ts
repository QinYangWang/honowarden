export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  name: string;
  createdAt: string;
}

export function generateWebAuthnChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function createRegistrationOptions(
  domain: string,
  userId: string,
  userName: string,
  existingCredentials: WebAuthnCredential[] = [],
) {
  return {
    challenge: generateWebAuthnChallenge(),
    rp: { id: new URL(domain).hostname, name: "HonoWarden" },
    user: {
      id: userId,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "cross-platform",
      requireResidentKey: false,
      userVerification: "discouraged",
    },
    excludeCredentials: existingCredentials.map((c) => ({ id: c.id, type: "public-key" })),
  };
}

export function createAuthenticationOptions(credentials: WebAuthnCredential[]) {
  return {
    challenge: generateWebAuthnChallenge(),
    timeout: 60000,
    rpId: "",
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      type: "public-key",
    })),
    userVerification: "discouraged",
  };
}
