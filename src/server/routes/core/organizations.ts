import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import {
  organizations,
  usersOrganizations,
  organizationApiKey,
  collections,
  usersCollections,
  ciphers,
  orgPolicies,
} from "../../db/schema";
import { MembershipType, MembershipStatus } from "../../db/schema/enums";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { orgMemberGuard, orgAdminGuard, orgOwnerGuard } from "../../middleware/guards";
import { generateUuid } from "../../utils/id";

const organizationsRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
}>();

organizationsRoute.use("*", authMiddleware);

organizationsRoute.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const memberships = await db
    .select()
    .from(usersOrganizations)
    .where(eq(usersOrganizations.userUuid, user.uuid));

  const orgIds = memberships.map((m) => m.orgUuid);
  const orgs =
    orgIds.length > 0
      ? await Promise.all(
          orgIds.map((id) =>
            db.select().from(organizations).where(eq(organizations.uuid, id)).get(),
          ),
        )
      : [];

  return c.json({
    data: orgs.filter(Boolean).map((org) => {
      const m = memberships.find((m2) => m2.orgUuid === org!.uuid);
      return {
        id: org!.uuid,
        name: org!.name,
        billingEmail: org!.billingEmail,
        status: m?.status,
        type: m?.atype,
        enabled: true,
        usePolicies: true,
        useGroups: false,
        useEvents: false,
        useTotp: true,
        use2fa: true,
        useApi: true,
        useResetPassword: false,
        useSso: false,
        selfHost: true,
        seats: null,
        maxCollections: null,
        maxStorageGb: null,
        key: m?.akey,
        hasPublicAndPrivateKeys: !!org!.publicKey,
        object: "profileOrganization",
      };
    }),
    object: "list",
    continuationToken: null,
  });
});

organizationsRoute.post("/", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const orgUuid = generateUuid();
  const memberUuid = generateUuid();

  await db.insert(organizations).values({
    uuid: orgUuid,
    name: body.name,
    billingEmail: body.billingEmail || user.email,
    publicKey: body.keys?.publicKey || null,
    privateKey: body.keys?.encryptedPrivateKey || null,
  });

  await db.insert(usersOrganizations).values({
    uuid: memberUuid,
    userUuid: user.uuid,
    orgUuid: orgUuid,
    accessAll: true,
    akey: body.key || "",
    status: MembershipStatus.Confirmed,
    atype: MembershipType.Owner,
  });

  if (body.collectionName) {
    await db.insert(collections).values({
      uuid: generateUuid(),
      orgUuid: orgUuid,
      name: body.collectionName,
    });
  }

  const org = await db.select().from(organizations).where(eq(organizations.uuid, orgUuid)).get();
  return c.json({
    id: org!.uuid,
    name: org!.name,
    billingEmail: org!.billingEmail,
    object: "organization",
  });
});

organizationsRoute.get("/:orgId", orgMemberGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const org = await db.select().from(organizations).where(eq(organizations.uuid, orgId)).get();
  if (!org) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: org.uuid,
    name: org.name,
    billingEmail: org.billingEmail,
    hasPublicAndPrivateKeys: !!org.publicKey,
    object: "organization",
  });
});

organizationsRoute.put("/:orgId", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(organizations)
    .set({ name: body.name, billingEmail: body.billingEmail })
    .where(eq(organizations.uuid, orgId));

  const org = await db.select().from(organizations).where(eq(organizations.uuid, orgId)).get();
  return c.json({ id: org!.uuid, name: org!.name, object: "organization" });
});

organizationsRoute.delete("/:orgId", orgMemberGuard(), orgOwnerGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  await db.delete(orgPolicies).where(eq(orgPolicies.orgUuid, orgId));
  await db.delete(usersOrganizations).where(eq(usersOrganizations.orgUuid, orgId));
  await db.delete(collections).where(eq(collections.orgUuid, orgId));
  await db.delete(organizations).where(eq(organizations.uuid, orgId));

  return c.json(null, 200);
});

organizationsRoute.get("/:orgId/keys", orgMemberGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const org = await db.select().from(organizations).where(eq(organizations.uuid, orgId)).get();
  return c.json({ publicKey: org!.publicKey, encryptedPrivateKey: org!.privateKey, object: "organizationKeys" });
});

organizationsRoute.get("/:orgId/collections", orgMemberGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const result = await db
    .select()
    .from(collections)
    .where(eq(collections.orgUuid, orgId));

  return c.json({
    data: result.map((col) => ({
      id: col.uuid,
      organizationId: col.orgUuid,
      name: col.name,
      externalId: col.externalId,
      object: "collection",
    })),
    object: "list",
    continuationToken: null,
  });
});

organizationsRoute.post("/:orgId/collections", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const uuid = generateUuid();

  await db.insert(collections).values({
    uuid,
    orgUuid: orgId,
    name: body.name,
    externalId: body.externalId || null,
  });

  return c.json({
    id: uuid,
    organizationId: orgId,
    name: body.name,
    object: "collection",
  });
});

organizationsRoute.get("/:orgId/users", orgMemberGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const members = await db
    .select()
    .from(usersOrganizations)
    .where(eq(usersOrganizations.orgUuid, orgId));

  return c.json({
    data: members.map((m) => ({
      id: m.uuid,
      userId: m.userUuid,
      type: m.atype,
      status: m.status,
      accessAll: m.accessAll,
      externalId: m.externalId,
      resetPasswordEnrolled: false,
      object: "organizationUserUserDetails",
    })),
    object: "list",
    continuationToken: null,
  });
});

organizationsRoute.post("/:orgId/users/invite", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const uuid = generateUuid();

  for (const email of body.emails || [body.email]) {
    await db.insert(usersOrganizations).values({
      uuid: generateUuid(),
      userUuid: "",
      orgUuid: orgId,
      invitedByEmail: email,
      accessAll: body.accessAll || false,
      akey: "",
      status: MembershipStatus.Invited,
      atype: body.type ?? MembershipType.User,
    });
  }

  return c.json(null, 200);
});

organizationsRoute.post("/:orgId/users/:userId/confirm", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const userId = c.req.param("userId");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(usersOrganizations)
    .set({ status: MembershipStatus.Confirmed, akey: body.key || "" })
    .where(eq(usersOrganizations.uuid, userId));

  return c.json(null, 200);
});

organizationsRoute.delete("/:orgId/users/:userId", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const userId = c.req.param("userId");
  const db = createDb(c.env.DB);

  await db.delete(usersOrganizations).where(eq(usersOrganizations.uuid, userId));
  return c.json(null, 200);
});

organizationsRoute.get("/:orgId/policies", orgMemberGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const policies = await db
    .select()
    .from(orgPolicies)
    .where(eq(orgPolicies.orgUuid, orgId));

  return c.json({
    data: policies.map((p) => ({
      id: p.uuid,
      organizationId: p.orgUuid,
      type: p.atype,
      enabled: p.enabled,
      data: p.data ? JSON.parse(p.data) : null,
      object: "policy",
    })),
    object: "list",
    continuationToken: null,
  });
});

organizationsRoute.put("/:orgId/policies/:type", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const policyType = parseInt(c.req.param("type"), 10);
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const existing = await db
    .select()
    .from(orgPolicies)
    .where(and(eq(orgPolicies.orgUuid, orgId), eq(orgPolicies.atype, policyType)))
    .get();

  if (existing) {
    await db
      .update(orgPolicies)
      .set({ enabled: body.enabled, data: JSON.stringify(body.data || {}) })
      .where(eq(orgPolicies.uuid, existing.uuid));
  } else {
    await db.insert(orgPolicies).values({
      uuid: generateUuid(),
      orgUuid: orgId,
      atype: policyType,
      enabled: body.enabled,
      data: JSON.stringify(body.data || {}),
    });
  }

  return c.json({ type: policyType, enabled: body.enabled, object: "policy" });
});

export { organizationsRoute };
