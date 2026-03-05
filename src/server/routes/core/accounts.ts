import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { users, devices } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { hashPassword, generateSalt, verifyPassword } from "../../auth/password";
import { generateUuid } from "../../utils/id";

const accounts = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

accounts.use("*", authMiddleware);

accounts.get("/profile", async (c) => {
  const { user } = c.get("auth");
  return c.json({
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
    organizations: [],
    providers: [],
    providerOrganizations: [],
    forcePasswordReset: false,
    avatarColor: user.avatarColor,
    creationDate: user.createdAt?.toISOString(),
    object: "profile",
  });
});

accounts.put("/profile", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(users)
    .set({
      name: body.name || user.name,
      updatedAt: new Date(),
    })
    .where(eq(users.uuid, user.uuid));

  const updated = await db.select().from(users).where(eq(users.uuid, user.uuid)).get();
  return c.json({
    id: updated!.uuid,
    name: updated!.name,
    email: updated!.email,
    emailVerified: !!updated!.verifiedAt,
    premium: true,
    object: "profile",
  });
});

accounts.put("/avatar", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(users)
    .set({ avatarColor: body.avatarColor, updatedAt: new Date() })
    .where(eq(users.uuid, user.uuid));

  return c.json({ id: user.uuid, avatarColor: body.avatarColor, object: "profile" });
});

accounts.get("/revision-date", async (c) => {
  const { user } = c.get("auth");
  return c.json(user.updatedAt?.getTime() || Date.now());
});

accounts.post("/password", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const valid = await verifyPassword(
    body.masterPasswordHash,
    user.passwordHash,
    user.salt,
    user.passwordIterations,
  );
  if (!valid) {
    return c.json({ error: "invalid_password", error_description: "Invalid password." }, 400);
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(body.newMasterPasswordHash, newSalt, user.passwordIterations);

  await db
    .update(users)
    .set({
      passwordHash: Buffer.from(newHash),
      salt: Buffer.from(newSalt),
      passwordHint: body.masterPasswordHint || null,
      akey: body.key,
      securityStamp: generateUuid(),
      updatedAt: new Date(),
    })
    .where(eq(users.uuid, user.uuid));

  return c.json(null, 200);
});

accounts.post("/kdf", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const valid = await verifyPassword(
    body.masterPasswordHash,
    user.passwordHash,
    user.salt,
    user.passwordIterations,
  );
  if (!valid) {
    return c.json({ error: "invalid_password" }, 400);
  }

  const newSalt = generateSalt();
  const iterations = body.kdfIterations || 600000;
  const newHash = await hashPassword(body.newMasterPasswordHash, newSalt, iterations);

  await db
    .update(users)
    .set({
      passwordHash: Buffer.from(newHash),
      salt: Buffer.from(newSalt),
      passwordIterations: iterations,
      clientKdfType: body.kdf ?? 0,
      clientKdfIter: iterations,
      clientKdfMemory: body.kdfMemory ?? null,
      clientKdfParallelism: body.kdfParallelism ?? null,
      akey: body.key,
      securityStamp: generateUuid(),
      updatedAt: new Date(),
    })
    .where(eq(users.uuid, user.uuid));

  return c.json(null, 200);
});

accounts.post("/keys", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(users)
    .set({
      publicKey: body.publicKey,
      privateKey: body.encryptedPrivateKey,
      updatedAt: new Date(),
    })
    .where(eq(users.uuid, user.uuid));

  return c.json(null, 200);
});

accounts.post("/verify-password", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();

  const valid = await verifyPassword(
    body.masterPasswordHash,
    user.passwordHash,
    user.salt,
    user.passwordIterations,
  );

  if (!valid) {
    return c.json({ error: "invalid_password" }, 400);
  }

  return c.json(null, 200);
});

accounts.post("/security-stamp", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const valid = await verifyPassword(
    body.masterPasswordHash,
    user.passwordHash,
    user.salt,
    user.passwordIterations,
  );
  if (!valid) {
    return c.json({ error: "invalid_password" }, 400);
  }

  await db
    .update(users)
    .set({ securityStamp: generateUuid(), updatedAt: new Date() })
    .where(eq(users.uuid, user.uuid));

  return c.json(null, 200);
});

accounts.get("/devices", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const result = await db.select().from(devices).where(eq(devices.userUuid, user.uuid));
  return c.json({
    data: result.map((d) => ({
      id: d.uuid,
      name: d.name,
      type: d.atype,
      identifier: d.uuid,
      creationDate: d.createdAt?.toISOString(),
      object: "device",
    })),
    object: "list",
    continuationToken: null,
  });
});

export { accounts };
