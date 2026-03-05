import { SignJWT, jwtVerify } from "jose";
import { getPrivateKey, getPublicKey } from "./crypto";

export interface LoginClaims {
  nbf: number;
  exp: number;
  iss: string;
  sub: string;
  premium: boolean;
  name: string;
  email: string;
  email_verified: boolean;
  sstamp: string;
  device: string;
  scope: string[];
  amr: string[];
  orgowner?: string[];
  orgadmin?: string[];
  orguser?: string[];
  orgmanager?: string[];
}

export async function generateLoginToken(
  domain: string,
  userId: string,
  email: string,
  name: string,
  emailVerified: boolean,
  securityStamp: string,
  deviceUuid: string,
  scope: string[],
  now: number,
  orgOwner: string[] = [],
  orgAdmin: string[] = [],
  orgUser: string[] = [],
  orgManager: string[] = [],
): Promise<string> {
  const claims: Record<string, unknown> = {
    nbf: now,
    exp: now + 7200,
    iss: `${domain}|login`,
    sub: userId,
    premium: true,
    name,
    email,
    email_verified: emailVerified,
    sstamp: securityStamp,
    device: deviceUuid,
    scope,
    amr: ["Application"],
  };

  if (orgOwner.length > 0) claims.orgowner = orgOwner;
  if (orgAdmin.length > 0) claims.orgadmin = orgAdmin;
  if (orgUser.length > 0) claims.orguser = orgUser;
  if (orgManager.length > 0) claims.orgmanager = orgManager;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateRefreshToken(): Promise<string> {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generateAdminToken(domain: string, now: number): Promise<string> {
  return new SignJWT({ nbf: now, exp: now + 1200, iss: `${domain}|admin` })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateInviteToken(
  domain: string,
  email: string,
  orgUuid: string,
  memberUuid: string,
  now: number,
): Promise<string> {
  return new SignJWT({
    nbf: now,
    exp: now + 432000,
    iss: `${domain}|invite`,
    sub: email,
    org: orgUuid,
    member: memberUuid,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateEmergencyInviteToken(
  domain: string,
  email: string,
  emergencyId: string,
  now: number,
): Promise<string> {
  return new SignJWT({
    nbf: now,
    exp: now + 432000,
    iss: `${domain}|emergencyaccessinvite`,
    sub: email,
    eid: emergencyId,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateDeleteToken(
  domain: string,
  userId: string,
  now: number,
): Promise<string> {
  return new SignJWT({
    nbf: now,
    exp: now + 432000,
    iss: `${domain}|delete`,
    sub: userId,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateVerifyEmailToken(
  domain: string,
  userId: string,
  now: number,
): Promise<string> {
  return new SignJWT({
    nbf: now,
    exp: now + 86400,
    iss: `${domain}|verifyemail`,
    sub: userId,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function generateFileDownloadToken(
  domain: string,
  cipherId: string,
  attachmentId: string,
  now: number,
): Promise<string> {
  return new SignJWT({
    nbf: now,
    exp: now + 300,
    iss: `${domain}|file_download`,
    sub: cipherId,
    file: attachmentId,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(getPrivateKey());
}

export async function verifyToken(token: string, expectedIssuer: string) {
  const { payload } = await jwtVerify(token, getPublicKey(), {
    issuer: expectedIssuer,
    algorithms: ["RS256"],
  });
  return payload;
}
