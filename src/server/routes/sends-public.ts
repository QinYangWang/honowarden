import { Hono } from "hono";
import { eq, and, isNull, gt } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../db/client";
import { sends } from "../db/schema";
import { verifyPassword } from "../auth/password";

const sendsPublic = new Hono<{ Bindings: Env }>();

sendsPublic.post("/access/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const db = createDb(c.env.DB);

  const send = await db.select().from(sends).where(eq(sends.uuid, id)).get();

  if (!send) return c.json({ error: "Send not found" }, 404);

  const now = new Date();
  if (send.deletionDate && send.deletionDate <= now) {
    return c.json({ error: "Send has been deleted" }, 404);
  }
  if (send.expirationDate && send.expirationDate <= now) {
    return c.json({ error: "Send has expired" }, 404);
  }
  if (send.disabled) {
    return c.json({ error: "Send is disabled" }, 404);
  }
  if (send.maxAccessCount && send.accessCount >= send.maxAccessCount) {
    return c.json({ error: "Max access count reached" }, 404);
  }

  if (send.passwordHash && send.passwordSalt) {
    const password = body.password;
    if (!password) {
      return c.json({ error: "Password required", object: "error" }, 401);
    }
    const valid = await verifyPassword(
      password,
      send.passwordHash,
      send.passwordSalt,
      send.passwordIter || 100000,
    );
    if (!valid) {
      return c.json({ error: "Invalid password" }, 401);
    }
  }

  await db
    .update(sends)
    .set({ accessCount: send.accessCount + 1 })
    .where(eq(sends.uuid, id));

  return c.json({
    id: send.uuid,
    type: send.atype,
    name: send.name,
    key: send.akey,
    text: send.atype === 0 ? JSON.parse(send.data) : null,
    file: send.atype === 1 ? JSON.parse(send.data) : null,
    object: "send-access",
  });
});

export { sendsPublic };
