import type { Env } from "../env";
import { createDb } from "../db/client";
import { authRequests } from "../db/schema";
import { lte } from "drizzle-orm";

export async function purgeAuthRequests(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const cutoff = new Date(Date.now() - 15 * 60_000);
  await db.delete(authRequests).where(lte(authRequests.creationDate, cutoff));
}
