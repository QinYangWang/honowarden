import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { sends } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { generateUuid } from "../../utils/id";
import { hashPassword, generateSalt } from "../../auth/password";

const sendsRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

function toSendJson(s: typeof sends.$inferSelect) {
  return {
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
    password: s.passwordHash ? true : null,
    text: s.atype === 0 ? JSON.parse(s.data) : null,
    file: s.atype === 1 ? JSON.parse(s.data) : null,
    object: "send",
  };
}

sendsRoute.use("*", authMiddleware);

sendsRoute.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const result = await db.select().from(sends).where(eq(sends.userUuid, user.uuid));
  return c.json({ data: result.map(toSendJson), object: "list", continuationToken: null });
});

sendsRoute.get("/:id", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const send = await db
    .select()
    .from(sends)
    .where(and(eq(sends.uuid, id), eq(sends.userUuid, user.uuid)))
    .get();

  if (!send) return c.json({ error: "Not found" }, 404);
  return c.json(toSendJson(send));
});

sendsRoute.post("/", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const uuid = generateUuid();
  const now = new Date();

  let passwordHash: Buffer | null = null;
  let passwordSalt: Buffer | null = null;
  if (body.password) {
    const salt = generateSalt();
    const hash = await hashPassword(body.password, salt, 100000);
    passwordHash = Buffer.from(hash);
    passwordSalt = Buffer.from(salt);
  }

  const data = body.text || body.file || {};

  await db.insert(sends).values({
    uuid,
    userUuid: user.uuid,
    name: body.name,
    notes: body.notes || null,
    atype: body.type,
    data: JSON.stringify(data),
    akey: body.key,
    passwordHash,
    passwordSalt,
    passwordIter: body.password ? 100000 : null,
    maxAccessCount: body.maxAccessCount || null,
    accessCount: 0,
    creationDate: now,
    revisionDate: now,
    expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
    deletionDate: new Date(body.deletionDate),
    disabled: body.disabled || false,
    hideEmail: body.hideEmail ?? null,
  });

  const created = await db.select().from(sends).where(eq(sends.uuid, uuid)).get();
  return c.json(toSendJson(created!));
});

sendsRoute.put("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const send = await db
    .select()
    .from(sends)
    .where(and(eq(sends.uuid, id), eq(sends.userUuid, user.uuid)))
    .get();

  if (!send) return c.json({ error: "Not found" }, 404);

  const data = body.text || body.file || {};

  await db
    .update(sends)
    .set({
      name: body.name,
      notes: body.notes || null,
      data: JSON.stringify(data),
      akey: body.key || send.akey,
      maxAccessCount: body.maxAccessCount ?? send.maxAccessCount,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : send.expirationDate,
      deletionDate: body.deletionDate ? new Date(body.deletionDate) : send.deletionDate,
      disabled: body.disabled ?? send.disabled,
      hideEmail: body.hideEmail ?? send.hideEmail,
      revisionDate: new Date(),
    })
    .where(eq(sends.uuid, id));

  const updated = await db.select().from(sends).where(eq(sends.uuid, id)).get();
  return c.json(toSendJson(updated!));
});

sendsRoute.delete("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db.delete(sends).where(and(eq(sends.uuid, id), eq(sends.userUuid, user.uuid)));
  return c.json(null, 200);
});

export { sendsRoute };
