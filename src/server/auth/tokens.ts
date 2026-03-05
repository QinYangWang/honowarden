export const TOKEN_EXPIRY = {
  login: 7200,
  admin: 1200,
  invite: 432000,
  emergencyInvite: 432000,
  deleteAccount: 432000,
  verifyEmail: 86400,
  fileDownload: 300,
  registerVerify: 86400,
} as const;

export const ISSUER_SUFFIX = {
  login: "login",
  admin: "admin",
  invite: "invite",
  emergencyInvite: "emergencyaccessinvite",
  deleteAccount: "delete",
  verifyEmail: "verifyemail",
  sendAccess: "send",
  orgApiKey: "api.organization",
  fileDownload: "file_download",
  registerVerify: "register_verify",
} as const;

export function makeIssuer(domain: string, suffix: string): string {
  return `${domain}|${suffix}`;
}
