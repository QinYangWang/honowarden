import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import type { Env } from "../env";
import { users, devices } from "../db/schema";
import { MembershipType, MembershipStatus } from "../db/schema/enums";
import { usersOrganizations } from "../db/schema/organizations";
import { verifyPassword } from "../auth/password";
import { generateLoginToken, generateRefreshToken } from "../auth/jwt";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  Key: string;
  PrivateKey: string | null;
  Kdf: number;
  KdfIterations: number;
  KdfMemory: number | null;
  KdfParallelism: number | null;
  MasterPasswordPolicy: Record<string, unknown>;
  ForcePasswordReset: boolean;
  ResetMasterPassword: boolean;
  UserDecryptionOptions: Record<string, unknown>;
}

export async function handlePasswordGrant(
  db: Database,
  _env: Env,
  domain: string,
  email: string,
  passwordHash: string,
  scope: string,
  _clientId: string,
  deviceType: number,
  deviceIdentifier: string,
  deviceName: string,
): Promise<TokenResponse> {
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (!user) {
    throw new Error("invalid_grant:Username or password is incorrect.");
  }

  if (!user.enabled) {
    throw new Error("invalid_grant:This user has been disabled.");
  }

  const valid = await verifyPassword(
    passwordHash,
    user.passwordHash,
    user.salt,
    user.passwordIterations,
  );

  if (!valid) {
    throw new Error("invalid_grant:Username or password is incorrect.");
  }

  const orgMemberships = await db
    .select()
    .from(usersOrganizations)
    .where(
      and(
        eq(usersOrganizations.userUuid, user.uuid),
        eq(usersOrganizations.status, MembershipStatus.Confirmed),
      ),
    );

  const orgOwner = orgMemberships
    .filter((m) => m.atype === MembershipType.Owner)
    .map((m) => m.orgUuid);
  const orgAdmin = orgMemberships
    .filter((m) => m.atype === MembershipType.Admin)
    .map((m) => m.orgUuid);
  const orgUser = orgMemberships
    .filter((m) => m.atype === MembershipType.User)
    .map((m) => m.orgUuid);
  const orgManager = orgMemberships
    .filter((m) => m.atype === MembershipType.Manager)
    .map((m) => m.orgUuid);

  const now = Math.floor(Date.now() / 1000);

  let device = await db
    .select()
    .from(devices)
    .where(and(eq(devices.uuid, deviceIdentifier), eq(devices.userUuid, user.uuid)))
    .get();

  const refreshToken = await generateRefreshToken();
  const nowDate = new Date();

  if (device) {
    await db
      .update(devices)
      .set({
        name: deviceName,
        atype: deviceType,
        refreshToken,
        updatedAt: nowDate,
      })
      .where(and(eq(devices.uuid, deviceIdentifier), eq(devices.userUuid, user.uuid)));
  } else {
    await db.insert(devices).values({
      uuid: deviceIdentifier,
      createdAt: nowDate,
      updatedAt: nowDate,
      userUuid: user.uuid,
      name: deviceName,
      atype: deviceType,
      refreshToken,
    });
    device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.uuid, deviceIdentifier), eq(devices.userUuid, user.uuid)))
      .get();
  }

  const scopeArray = scope.split(" ");
  const accessToken = await generateLoginToken(
    domain,
    user.uuid,
    user.email,
    user.name,
    !!user.verifiedAt,
    user.securityStamp,
    deviceIdentifier,
    scopeArray,
    now,
    orgOwner,
    orgAdmin,
    orgUser,
    orgManager,
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 7200,
    token_type: "Bearer",
    scope,
    Key: user.akey,
    PrivateKey: user.privateKey,
    Kdf: user.clientKdfType,
    KdfIterations: user.clientKdfIter,
    KdfMemory: user.clientKdfMemory,
    KdfParallelism: user.clientKdfParallelism,
    MasterPasswordPolicy: {},
    ForcePasswordReset: false,
    ResetMasterPassword: false,
    UserDecryptionOptions: {},
  };
}

export async function handleRefreshGrant(
  db: Database,
  _env: Env,
  domain: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const device = await db
    .select()
    .from(devices)
    .where(eq(devices.refreshToken, refreshToken))
    .get();

  if (!device) {
    throw new Error("invalid_grant:Invalid refresh token.");
  }

  const user = await db.select().from(users).where(eq(users.uuid, device.userUuid)).get();
  if (!user || !user.enabled) {
    throw new Error("invalid_grant:User not found or disabled.");
  }

  const orgMemberships = await db
    .select()
    .from(usersOrganizations)
    .where(
      and(
        eq(usersOrganizations.userUuid, user.uuid),
        eq(usersOrganizations.status, MembershipStatus.Confirmed),
      ),
    );

  const now = Math.floor(Date.now() / 1000);
  const accessToken = await generateLoginToken(
    domain,
    user.uuid,
    user.email,
    user.name,
    !!user.verifiedAt,
    user.securityStamp,
    device.uuid,
    ["api", "offline_access"],
    now,
    orgMemberships.filter((m) => m.atype === MembershipType.Owner).map((m) => m.orgUuid),
    orgMemberships.filter((m) => m.atype === MembershipType.Admin).map((m) => m.orgUuid),
    orgMemberships.filter((m) => m.atype === MembershipType.User).map((m) => m.orgUuid),
    orgMemberships.filter((m) => m.atype === MembershipType.Manager).map((m) => m.orgUuid),
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 7200,
    token_type: "Bearer",
    scope: "api offline_access",
    Key: user.akey,
    PrivateKey: user.privateKey,
    Kdf: user.clientKdfType,
    KdfIterations: user.clientKdfIter,
    KdfMemory: user.clientKdfMemory,
    KdfParallelism: user.clientKdfParallelism,
    MasterPasswordPolicy: {},
    ForcePasswordReset: false,
    ResetMasterPassword: false,
    UserDecryptionOptions: {},
  };
}
