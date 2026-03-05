import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { emergencyAccess, users } from "../../db/schema";
import { EmergencyAccessStatus, EmergencyAccessType } from "../../db/schema/enums";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { generateUuid } from "../../utils/id";

const emergencyAccessRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

emergencyAccessRoute.use("*", authMiddleware);

emergencyAccessRoute.get("/trusted", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const result = await db
    .select()
    .from(emergencyAccess)
    .where(eq(emergencyAccess.grantorUuid, user.uuid));

  return c.json({
    data: result.map((ea) => ({
      id: ea.uuid,
      grantorId: ea.grantorUuid,
      granteeId: ea.granteeUuid,
      email: ea.email,
      type: ea.atype,
      status: ea.status,
      waitTimeDays: ea.waitTimeDays,
      creationDate: ea.createdAt?.toISOString(),
      revisionDate: ea.updatedAt?.toISOString(),
      object: "emergencyAccessGranteeDetails",
    })),
    object: "list",
    continuationToken: null,
  });
});

emergencyAccessRoute.get("/granted", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const result = await db
    .select()
    .from(emergencyAccess)
    .where(eq(emergencyAccess.granteeUuid, user.uuid));

  return c.json({
    data: result.map((ea) => ({
      id: ea.uuid,
      grantorId: ea.grantorUuid,
      granteeId: ea.granteeUuid,
      email: ea.email,
      type: ea.atype,
      status: ea.status,
      waitTimeDays: ea.waitTimeDays,
      creationDate: ea.createdAt?.toISOString(),
      revisionDate: ea.updatedAt?.toISOString(),
      object: "emergencyAccessGrantorDetails",
    })),
    object: "list",
    continuationToken: null,
  });
});

emergencyAccessRoute.post("/invite", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const now = new Date();

  const grantee = body.email
    ? await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).get()
    : null;

  await db.insert(emergencyAccess).values({
    uuid: generateUuid(),
    grantorUuid: user.uuid,
    granteeUuid: grantee?.uuid || null,
    email: body.email,
    atype: body.type ?? EmergencyAccessType.View,
    status: EmergencyAccessStatus.Invited,
    waitTimeDays: body.waitTimeDays ?? 7,
    createdAt: now,
    updatedAt: now,
  });

  return c.json(null, 200);
});

emergencyAccessRoute.post("/:id/accept", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const ea = await db.select().from(emergencyAccess).where(eq(emergencyAccess.uuid, id)).get();
  if (!ea) return c.json({ error: "Not found" }, 404);

  await db
    .update(emergencyAccess)
    .set({
      granteeUuid: user.uuid,
      status: EmergencyAccessStatus.Accepted,
      updatedAt: new Date(),
    })
    .where(eq(emergencyAccess.uuid, id));

  return c.json(null, 200);
});

emergencyAccessRoute.post("/:id/confirm", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(emergencyAccess)
    .set({
      status: EmergencyAccessStatus.Confirmed,
      keyEncrypted: body.key || null,
      updatedAt: new Date(),
    })
    .where(eq(emergencyAccess.uuid, id));

  return c.json(null, 200);
});

emergencyAccessRoute.post("/:id/initiate", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db
    .update(emergencyAccess)
    .set({
      status: EmergencyAccessStatus.RecoveryInitiated,
      recoveryInitiatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emergencyAccess.uuid, id));

  return c.json(null, 200);
});

emergencyAccessRoute.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db
    .update(emergencyAccess)
    .set({
      status: EmergencyAccessStatus.RecoveryApproved,
      updatedAt: new Date(),
    })
    .where(eq(emergencyAccess.uuid, id));

  return c.json(null, 200);
});

emergencyAccessRoute.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db
    .update(emergencyAccess)
    .set({
      status: EmergencyAccessStatus.Confirmed,
      recoveryInitiatedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(emergencyAccess.uuid, id));

  return c.json(null, 200);
});

emergencyAccessRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db.delete(emergencyAccess).where(eq(emergencyAccess.uuid, id));
  return c.json(null, 200);
});

export { emergencyAccessRoute };
