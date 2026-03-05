import { Hono } from "hono";
import { eq, count } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../db/client";
import { users, organizations } from "../db/schema";
import { adminGuard } from "../middleware/guards";
import { verifyAdminToken } from "../auth/password";
import { generateAdminToken } from "../auth/jwt";
import { initializeKeys } from "../auth/crypto";
import { getAllConfig, setConfig, resetAllConfig, validateConfig } from "../services/config.service";

const admin = new Hono<{ Bindings: Env }>();

admin.post("/login", async (c) => {
  const body = await c.req.json();
  await initializeKeys(c.env);

  const valid = await verifyAdminToken(body.token || body.password, c.env.ADMIN_TOKEN);
  if (!valid) {
    return c.json({ error: "Invalid admin token" }, 401);
  }

  const domain = new URL(c.req.url).origin;
  const now = Math.floor(Date.now() / 1000);
  const jwt = await generateAdminToken(domain, now);

  c.header("Set-Cookie", `VW_ADMIN=${jwt}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=1200`);
  return c.json({ token: jwt });
});

admin.post("/logout", (c) => {
  c.header("Set-Cookie", "VW_ADMIN=; Path=/admin; HttpOnly; Max-Age=0");
  return c.json(null, 200);
});

admin.get("/users", adminGuard, async (c) => {
  const db = createDb(c.env.DB);
  const result = await db.select().from(users);
  return c.json(
    result.map((u) => ({
      id: u.uuid,
      email: u.email,
      name: u.name,
      enabled: u.enabled,
      emailVerified: !!u.verifiedAt,
      createdAt: u.createdAt?.toISOString(),
      twoFactorEnabled: false,
    })),
  );
});

admin.post("/users/:id/enable", adminGuard, async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  await db.update(users).set({ enabled: true }).where(eq(users.uuid, id));
  return c.json(null, 200);
});

admin.post("/users/:id/disable", adminGuard, async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  await db.update(users).set({ enabled: false }).where(eq(users.uuid, id));
  return c.json(null, 200);
});

admin.delete("/users/:id", adminGuard, async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  await db.delete(users).where(eq(users.uuid, id));
  return c.json(null, 200);
});

admin.get("/organizations", adminGuard, async (c) => {
  const db = createDb(c.env.DB);
  const result = await db.select().from(organizations);
  return c.json(
    result.map((o) => ({
      id: o.uuid,
      name: o.name,
      billingEmail: o.billingEmail,
    })),
  );
});

admin.delete("/organizations/:id", adminGuard, async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  await db.delete(organizations).where(eq(organizations.uuid, id));
  return c.json(null, 200);
});

admin.get("/config", adminGuard, async (c) => {
  const config = await getAllConfig(c.env);
  return c.json(config);
});

admin.post("/config", adminGuard, async (c) => {
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    if (validateConfig(key, value)) {
      await setConfig(c.env, key, value);
    }
  }
  const config = await getAllConfig(c.env);
  return c.json(config);
});

admin.post("/config/reset", adminGuard, async (c) => {
  await resetAllConfig(c.env);
  return c.json(null, 200);
});

admin.get("/diagnostics", adminGuard, async (c) => {
  const db = createDb(c.env.DB);
  const userCount = await db.select({ count: count() }).from(users);
  const orgCount = await db.select({ count: count() }).from(organizations);

  return c.json({
    userCount: userCount[0]?.count || 0,
    orgCount: orgCount[0]?.count || 0,
    version: "2025.1.0",
    serverTime: new Date().toISOString(),
  });
});

export { admin };
