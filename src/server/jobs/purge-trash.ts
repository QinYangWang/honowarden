import type { Env } from "../env";
import { createDb } from "../db/client";
import { ciphers, favorites, ciphersCollections, foldersCiphers, attachments } from "../db/schema";
import { lte, eq } from "drizzle-orm";
import { getConfig } from "../services/config.service";

export async function purgeTrash(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const days = await getConfig<number>(env, "trash_auto_delete_days", 30);
  const cutoff = new Date(Date.now() - days * 86400_000);

  const trashed = await db
    .select()
    .from(ciphers)
    .where(lte(ciphers.deletedAt, cutoff));

  for (const ci of trashed) {
    await db.delete(favorites).where(eq(favorites.cipherUuid, ci.uuid));
    await db.delete(ciphersCollections).where(eq(ciphersCollections.cipherUuid, ci.uuid));
    await db.delete(foldersCiphers).where(eq(foldersCiphers.cipherUuid, ci.uuid));

    const atts = await db.select().from(attachments).where(eq(attachments.cipherUuid, ci.uuid));
    for (const att of atts) {
      await env.ATTACHMENTS.delete(`${ci.uuid}/${att.id}`);
    }
    await db.delete(attachments).where(eq(attachments.cipherUuid, ci.uuid));
    await db.delete(ciphers).where(eq(ciphers.uuid, ci.uuid));
  }

  console.log(`Purged ${trashed.length} trashed ciphers`);
}
