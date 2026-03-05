import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { folders, foldersCiphers } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { generateUuid } from "../../utils/id";

const foldersRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

foldersRoute.use("*", authMiddleware);

foldersRoute.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const result = await db.select().from(folders).where(eq(folders.userUuid, user.uuid));
  return c.json({
    data: result.map((f) => ({
      id: f.uuid,
      name: f.name,
      revisionDate: f.updatedAt?.toISOString(),
      object: "folder",
    })),
    object: "list",
    continuationToken: null,
  });
});

foldersRoute.get("/:id", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const folder = await db
    .select()
    .from(folders)
    .where(eq(folders.uuid, id))
    .get();

  if (!folder || folder.userUuid !== user.uuid) {
    return c.json({ error: "Folder not found" }, 404);
  }

  return c.json({
    id: folder.uuid,
    name: folder.name,
    revisionDate: folder.updatedAt?.toISOString(),
    object: "folder",
  });
});

foldersRoute.post("/", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);
  const uuid = generateUuid();
  const now = new Date();

  await db.insert(folders).values({
    uuid,
    createdAt: now,
    updatedAt: now,
    userUuid: user.uuid,
    name: body.name,
  });

  return c.json({
    id: uuid,
    name: body.name,
    revisionDate: now.toISOString(),
    object: "folder",
  });
});

foldersRoute.put("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const folder = await db.select().from(folders).where(eq(folders.uuid, id)).get();
  if (!folder || folder.userUuid !== user.uuid) {
    return c.json({ error: "Not found" }, 404);
  }

  const now = new Date();
  await db.update(folders).set({ name: body.name, updatedAt: now }).where(eq(folders.uuid, id));

  return c.json({
    id,
    name: body.name,
    revisionDate: now.toISOString(),
    object: "folder",
  });
});

foldersRoute.delete("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const folder = await db.select().from(folders).where(eq(folders.uuid, id)).get();
  if (!folder || folder.userUuid !== user.uuid) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(foldersCiphers).where(eq(foldersCiphers.folderUuid, id));
  await db.delete(folders).where(eq(folders.uuid, id));

  return c.json(null, 200);
});

export { foldersRoute };
