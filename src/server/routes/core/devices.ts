import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { devices } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";

const devicesRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

devicesRoute.use("*", authMiddleware);

devicesRoute.get("/", async (c) => {
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

devicesRoute.get("/knowndevice", async (c) => {
  c.get("auth");
  return c.json({
    knownDevice: true,
    object: "knownDevice",
  });
});

devicesRoute.get("/:id", async (c) => {
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const device = await db
    .select()
    .from(devices)
    .where(eq(devices.uuid, id))
    .get();

  if (!device || device.userUuid !== user.uuid) {
    return c.json({ error: "Device not found" }, 404);
  }

  return c.json({
    id: device.uuid,
    name: device.name,
    type: device.atype,
    identifier: device.uuid,
    creationDate: device.createdAt?.toISOString(),
    object: "device",
  });
});

export { devicesRoute };
