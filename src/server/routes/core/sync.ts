import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import {
  ciphers,
  folders,
  sends,
  favorites,
  usersOrganizations,
  collections,
  orgPolicies,
} from "../../db/schema";
import { MembershipStatus } from "../../db/schema/enums";
import { authMiddleware, type AuthContext } from "../../middleware/auth";

const sync = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

sync.use("*", authMiddleware);

sync.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const [userFolders, userSends, userFavorites, memberships] = await Promise.all([
    db.select().from(folders).where(eq(folders.userUuid, user.uuid)),
    db.select().from(sends).where(eq(sends.userUuid, user.uuid)),
    db.select().from(favorites).where(eq(favorites.userUuid, user.uuid)),
    db
      .select()
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.userUuid, user.uuid),
          eq(usersOrganizations.status, MembershipStatus.Confirmed),
        ),
      ),
  ]);

  const favoriteIds = new Set(userFavorites.map((f) => f.cipherUuid));

  const personalCiphers = await db
    .select()
    .from(ciphers)
    .where(and(eq(ciphers.userUuid, user.uuid), isNull(ciphers.deletedAt)));

  const orgCiphers: (typeof ciphers.$inferSelect)[] = [];
  for (const m of memberships) {
    const oc = await db
      .select()
      .from(ciphers)
      .where(and(eq(ciphers.organizationUuid, m.orgUuid), isNull(ciphers.deletedAt)));
    orgCiphers.push(...oc);
  }

  const trashedCiphers = await db
    .select()
    .from(ciphers)
    .where(eq(ciphers.userUuid, user.uuid));

  const allCiphers = [
    ...personalCiphers,
    ...orgCiphers,
    ...trashedCiphers.filter((c2) => c2.deletedAt),
  ];

  const uniqueCiphers = Array.from(new Map(allCiphers.map((c2) => [c2.uuid, c2])).values());

  const userCollections: (typeof collections.$inferSelect)[] = [];
  for (const m of memberships) {
    const cols = await db
      .select()
      .from(collections)
      .where(eq(collections.orgUuid, m.orgUuid));
    userCollections.push(...cols);
  }

  const allPolicies: (typeof orgPolicies.$inferSelect)[] = [];
  for (const m of memberships) {
    const pols = await db
      .select()
      .from(orgPolicies)
      .where(eq(orgPolicies.orgUuid, m.orgUuid));
    allPolicies.push(...pols);
  }

  return c.json({
    object: "sync",
    profile: {
      id: user.uuid,
      name: user.name,
      email: user.email,
      emailVerified: !!user.verifiedAt,
      premium: true,
      masterPasswordHint: user.passwordHint,
      culture: "en-US",
      twoFactorEnabled: false,
      key: user.akey,
      privateKey: user.privateKey,
      securityStamp: user.securityStamp,
      organizations: memberships.map((m) => ({
        id: m.orgUuid,
        userId: m.userUuid,
        type: m.atype,
        status: m.status,
        accessAll: m.accessAll,
        key: m.akey,
        object: "profileOrganization",
      })),
      object: "profile",
    },
    folders: userFolders.map((f) => ({
      id: f.uuid,
      name: f.name,
      revisionDate: f.updatedAt?.toISOString(),
      object: "folder",
    })),
    collections: userCollections.map((col) => ({
      id: col.uuid,
      organizationId: col.orgUuid,
      name: col.name,
      externalId: col.externalId,
      readOnly: false,
      hidePasswords: false,
      manage: false,
      object: "collectionDetails",
    })),
    ciphers: uniqueCiphers.map((ci) => ({
      id: ci.uuid,
      organizationId: ci.organizationUuid,
      folderId: null,
      type: ci.atype,
      name: ci.name,
      notes: ci.notes,
      fields: ci.fields ? JSON.parse(ci.fields) : null,
      login: ci.atype === 1 ? JSON.parse(ci.data) : null,
      card: ci.atype === 3 ? JSON.parse(ci.data) : null,
      identity: ci.atype === 4 ? JSON.parse(ci.data) : null,
      secureNote: ci.atype === 2 ? JSON.parse(ci.data) : null,
      sshKey: ci.atype === 5 ? JSON.parse(ci.data) : null,
      favorite: favoriteIds.has(ci.uuid),
      reprompt: ci.reprompt || 0,
      key: ci.key,
      attachments: null,
      collectionIds: [],
      revisionDate: ci.updatedAt?.toISOString(),
      creationDate: ci.createdAt?.toISOString(),
      deletedDate: ci.deletedAt?.toISOString() || null,
      passwordHistory: ci.passwordHistory ? JSON.parse(ci.passwordHistory) : null,
      object: "cipherDetails",
    })),
    domains: {
      equivalentDomains: user.equivalentDomains ? JSON.parse(user.equivalentDomains) : [],
      globalEquivalentDomains: [],
      object: "domains",
    },
    policies: allPolicies.map((p) => ({
      id: p.uuid,
      organizationId: p.orgUuid,
      type: p.atype,
      enabled: p.enabled,
      data: p.data ? JSON.parse(p.data) : null,
      object: "policy",
    })),
    sends: userSends.map((s) => ({
      id: s.uuid,
      accessId: s.uuid,
      type: s.atype,
      name: s.name,
      notes: s.notes,
      key: s.akey,
      maxAccessCount: s.maxAccessCount,
      accessCount: s.accessCount,
      revisionDate: s.revisionDate?.toISOString(),
      expirationDate: s.expirationDate?.toISOString() || null,
      deletionDate: s.deletionDate?.toISOString(),
      disabled: s.disabled,
      hideEmail: s.hideEmail,
      object: "send",
    })),
  });
});

export { sync };
