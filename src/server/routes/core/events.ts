import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { event } from "../../db/schema";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { orgMemberGuard, orgAdminGuard } from "../../middleware/guards";
import { usersOrganizations } from "../../db/schema/organizations";

const eventsRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext; membership: typeof usersOrganizations.$inferSelect };
}>();

eventsRoute.use("*", authMiddleware);

eventsRoute.get("/organizations/:orgId", orgMemberGuard(), orgAdminGuard(), async (c) => {
  const orgId = c.req.param("orgId");
  const db = createDb(c.env.DB);

  const query = db.select().from(event).where(eq(event.orgUuid, orgId)).orderBy(desc(event.eventDate));

  const events = await query;
  return c.json({
    data: events.map((e) => ({
      type: e.eventType,
      userId: e.userUuid,
      organizationId: e.orgUuid,
      cipherId: e.cipherUuid,
      collectionId: e.collectionUuid,
      groupId: e.groupUuid,
      actingUserId: e.actUserUuid,
      date: e.eventDate?.toISOString(),
      deviceType: e.deviceType,
      ipAddress: e.ipAddress,
      object: "event",
    })),
    object: "list",
    continuationToken: null,
  });
});

export { eventsRoute };
