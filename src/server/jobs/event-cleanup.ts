import type { Env } from "../env";
import { createDb } from "../db/client";
import { event } from "../db/schema";
import { lte } from "drizzle-orm";
import { getConfig } from "../services/config.service";

export async function eventCleanup(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const days = await getConfig<number>(env, "events_days_retain", 365);
  const cutoff = new Date(Date.now() - days * 86400_000);
  await db.delete(event).where(lte(event.eventDate, cutoff));
}
