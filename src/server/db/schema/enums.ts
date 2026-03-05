export const CipherType = {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
} as const;

export const MembershipType = {
  Owner: 0,
  Admin: 1,
  User: 2,
  Manager: 3,
} as const;

export const MembershipStatus = {
  Revoked: -1,
  Invited: 0,
  Accepted: 1,
  Confirmed: 2,
} as const;

export const SendType = {
  Text: 0,
  File: 1,
} as const;

export const EmergencyAccessType = {
  View: 0,
  Takeover: 1,
} as const;

export const EmergencyAccessStatus = {
  Invited: 0,
  Accepted: 1,
  Confirmed: 2,
  RecoveryInitiated: 3,
  RecoveryApproved: 4,
} as const;

export const TwoFactorType = {
  Authenticator: 0,
  Email: 1,
  Duo: 2,
  YubiKey: 3,
  Remember: 5,
  WebAuthn: 7,
} as const;

export const OrgPolicyType = {
  TwoFactorAuthentication: 0,
  MasterPassword: 1,
  PasswordGenerator: 2,
  SingleOrg: 3,
  RequireSSO: 4,
  PersonalOwnership: 5,
  DisableSend: 6,
  SendOptions: 7,
  ResetPassword: 8,
} as const;

export const KdfType = {
  PBKDF2_SHA256: 0,
  Argon2id: 1,
} as const;
