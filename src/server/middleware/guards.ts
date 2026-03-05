import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import type { Env } from "../env";
import type { AuthContext } from "./auth";
import { verifyToken } from "../auth/jwt";
import { createDb } from "../db/client";
import { usersOrganizations } from "../db/schema";
import { MembershipStatus, MembershipType } from "../db/schema/enums";

export const orgMemberGuard = (orgIdParam = "orgId") =>
  createMiddleware<{
    Bindings: Env;
    Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
  }>(async (c, next) => {
    const orgId = c.req.param(orgIdParam)!;
    const { user } = c.get("auth");
    const db = createDb(c.env.DB);

    const membership = await db
      .select()
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.userUuid, user.uuid),
          eq(usersOrganizations.orgUuid, orgId),
          eq(usersOrganizations.status, MembershipStatus.Confirmed),
        ),
      )
      .get();

    if (!membership) {
      return c.json({ error: "Not a member" }, 403);
    }

    c.set("membership", membership);
    await next();
  });

export const orgAdminGuard = () =>
  createMiddleware<{
    Bindings: Env;
    Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
  }>(async (c, next) => {
    const membership = c.get("membership");
    if (membership.atype > MembershipType.Admin) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  });

export const orgOwnerGuard = () =>
  createMiddleware<{
    Bindings: Env;
    Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
  }>(async (c, next) => {
    const membership = c.get("membership");
    if (membership.atype !== MembershipType.Owner) {
      return c.json({ error: "Owner access required" }, 403);
    }
    await next();
  });

export const orgManagerGuard = () =>
  createMiddleware<{
    Bindings: Env;
    Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
  }>(async (c, next) => {
    const membership = c.get("membership");
    if (membership.atype > MembershipType.Manager) {
      return c.json({ error: "Manager access required" }, 403);
    }
    await next();
  });

export const adminGuard = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const cookie = c.req.header("Cookie");
  const match = cookie?.match(/VW_ADMIN=([^;]+)/);
  if (!match) {
    return c.json({ error: "Admin authentication required" }, 401);
  }

  try {
    const domain = new URL(c.req.url).origin;
    await verifyToken(match[1], `${domain}|admin`);
    await next();
  } catch {
    return c.json({ error: "Invalid admin session" }, 401);
  }
});
