import type { Env } from "../env";
import { createDb } from "../db/client";
import { sends } from "../db/schema";
import { lte } from "drizzle-orm";

export async function purgeSends(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const now = new Date();

  const expired = await db.select().from(sends).where(lte(sends.deletionDate, now));

  for (const send of expired) {
    if (send.atype === 1) {
      try {
        await env.SENDS.delete(`${send.uuid}`);
      } catch {}
    }
  }

  await db.delete(sends).where(lte(sends.deletionDate, now));
  console.log(`Purged ${expired.length} expired sends`);
}
