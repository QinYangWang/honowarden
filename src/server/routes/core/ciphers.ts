import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { ciphers, favorites, ciphersCollections, foldersCiphers } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { generateUuid } from "../../utils/id";

const ciphersRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

ciphersRoute.use("*", authMiddleware);

function toCipherJson(ci: typeof ciphers.$inferSelect, isFavorite = false) {
  return {
    id: ci.uuid,
    organizationId: ci.organizationUuid,
    type: ci.atype,
    name: ci.name,
    notes: ci.notes,
    fields: ci.fields ? JSON.parse(ci.fields) : null,
    login: ci.atype === 1 ? JSON.parse(ci.data) : null,
    card: ci.atype === 3 ? JSON.parse(ci.data) : null,
    identity: ci.atype === 4 ? JSON.parse(ci.data) : null,
    secureNote: ci.atype === 2 ? JSON.parse(ci.data) : null,
    sshKey: ci.atype === 5 ? JSON.parse(ci.data) : null,
    favorite: isFavorite,
    reprompt: ci.reprompt || 0,
    key: ci.key,
    attachments: null,
    collectionIds: [],
    revisionDate: ci.updatedAt?.toISOString(),
    creationDate: ci.createdAt?.toISOString(),
    deletedDate: ci.deletedAt?.toISOString() || null,
    passwordHistory: ci.passwordHistory ? JSON.parse(ci.passwordHistory) : null,
    object: "cipher",
  };
}

ciphersRoute.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const result = await db
    .select()
    .from(ciphers)
    .where(and(eq(ciphers.userUuid, user.uuid), isNull(ciphers.deletedAt)));

  const favs = await db.select().from(favorites).where(eq(favorites.userUuid, user.uuid));
  const favIds = new Set(favs.map((f) => f.cipherUuid));

  return c.json({
    data: result.map((ci) => toCipherJson(ci, favIds.has(ci.uuid))),
    object: "list",
    continuationToken: null,
  });
});

ciphersRoute.get("/:id", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const cipher = await db.select().from(ciphers).where(eq(ciphers.uuid, id)).get();
  if (!cipher || (cipher.userUuid !== user.uuid && !cipher.organizationUuid)) {
    return c.json({ error: "Cipher not found" }, 404);
  }

  const fav = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userUuid, user.uuid), eq(favorites.cipherUuid, id)))
    .get();

  return c.json(toCipherJson(cipher, !!fav));
});

ciphersRoute.post("/", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const now = new Date();
  const uuid = generateUuid();

  const typeData = body.login || body.card || body.identity || body.secureNote || body.sshKey || {};

  await db.insert(ciphers).values({
    uuid,
    createdAt: now,
    updatedAt: now,
    userUuid: body.organizationId ? null : user.uuid,
    organizationUuid: body.organizationId || null,
    atype: body.type,
    name: body.name,
    notes: body.notes || null,
    fields: body.fields ? JSON.stringify(body.fields) : null,
    data: JSON.stringify(typeData),
    key: body.key || null,
    reprompt: body.reprompt || null,
    passwordHistory: body.passwordHistory ? JSON.stringify(body.passwordHistory) : null,
  });

  if (body.favorite) {
    await db.insert(favorites).values({ userUuid: user.uuid, cipherUuid: uuid });
  }

  if (body.folderId) {
    await db.insert(foldersCiphers).values({ cipherUuid: uuid, folderUuid: body.folderId });
  }

  if (body.collectionIds?.length) {
    for (const colId of body.collectionIds) {
      await db.insert(ciphersCollections).values({ cipherUuid: uuid, collectionUuid: colId });
    }
  }

  const created = await db.select().from(ciphers).where(eq(ciphers.uuid, uuid)).get();
  return c.json(toCipherJson(created!, body.favorite));
});

ciphersRoute.put("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const cipher = await db.select().from(ciphers).where(eq(ciphers.uuid, id)).get();
  if (!cipher) return c.json({ error: "Not found" }, 404);

  const typeData = body.login || body.card || body.identity || body.secureNote || body.sshKey || {};

  await db
    .update(ciphers)
    .set({
      name: body.name,
      notes: body.notes || null,
      fields: body.fields ? JSON.stringify(body.fields) : null,
      data: JSON.stringify(typeData),
      key: body.key || cipher.key,
      reprompt: body.reprompt ?? cipher.reprompt,
      passwordHistory: body.passwordHistory ? JSON.stringify(body.passwordHistory) : cipher.passwordHistory,
      updatedAt: new Date(),
    })
    .where(eq(ciphers.uuid, id));

  if (body.favorite !== undefined) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userUuid, user.uuid), eq(favorites.cipherUuid, id)));
    if (body.favorite) {
      await db.insert(favorites).values({ userUuid: user.uuid, cipherUuid: id });
    }
  }

  const updated = await db.select().from(ciphers).where(eq(ciphers.uuid, id)).get();
  return c.json(toCipherJson(updated!, !!body.favorite));
});

ciphersRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db.update(ciphers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(ciphers.uuid, id));
  return c.json(null, 200);
});

ciphersRoute.put("/:id/delete", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db.update(ciphers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(ciphers.uuid, id));
  return c.json(null, 200);
});

ciphersRoute.put("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await db.update(ciphers).set({ deletedAt: null, updatedAt: new Date() }).where(eq(ciphers.uuid, id));

  const cipher = await db.select().from(ciphers).where(eq(ciphers.uuid, id)).get();
  return c.json(toCipherJson(cipher!));
});

export { ciphersRoute };
