import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import type { Env } from "../env";
import { verifyToken } from "../auth/jwt";
import { createDb } from "../db/client";
import { users, devices } from "../db/schema";

interface StampException {
  route: string;
  security_stamp: string;
  expire: number;
}

export interface AuthContext {
  user: typeof users.$inferSelect;
  device: typeof devices.$inferSelect;
  claims: Record<string, unknown>;
}

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const domain = new URL(c.req.url).origin;

  try {
    const claims = await verifyToken(token, `${domain}|login`);
    const db = createDb(c.env.DB);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.uuid, claims.sub as string))
      .get();

    if (!user || !user.enabled) {
      return c.json({ error: "User not found or disabled" }, 401);
    }

    if (user.securityStamp !== claims.sstamp) {
      const exception = user.stampException
        ? (JSON.parse(user.stampException) as StampException)
        : null;

      if (
        !exception ||
        exception.expire < Date.now() / 1000 ||
        exception.security_stamp !== claims.sstamp
      ) {
        return c.json({ error: "Security stamp mismatch" }, 401);
      }
    }

    const device = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.uuid, claims.device as string),
          eq(devices.userUuid, user.uuid),
        ),
      )
      .get();

    if (!device) {
      return c.json({ error: "Device not found" }, 401);
    }

    c.set("auth", { user, device, claims: claims as Record<string, unknown> });
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
