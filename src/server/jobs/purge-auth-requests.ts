import type { Env } from "../env";
import { createDb } from "../db/client";
import { authRequests } from "../db/schema";
import { sql } from "drizzle-orm";

export async function purgeAuthRequests(env: Env): Promise<void> {
  const db = createDb(env.DB);
  await db
    .delete(authRequests)
    .where(sql`${authRequests.creationDate} <= unixepoch('now', '-15 minutes')`);
}
