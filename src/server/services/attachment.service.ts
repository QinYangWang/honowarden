import type { Env } from "../env";
import { createDb } from "../db/client";
import { attachments, ciphers } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateUuid } from "../utils/id";

export async function uploadAttachment(
  env: Env,
  cipherUuid: string,
  fileName: string,
  data: ArrayBuffer,
  key?: string,
): Promise<{ id: string }> {
  const id = generateUuid();
  const db = createDb(env.DB);

  await env.ATTACHMENTS.put(`${cipherUuid}/${id}`, data);

  await db.insert(attachments).values({
    id,
    cipherUuid,
    fileName,
    fileSize: data.byteLength,
    akey: key || null,
  });

  await db
    .update(ciphers)
    .set({ updatedAt: new Date() })
    .where(eq(ciphers.uuid, cipherUuid));

  return { id };
}

export async function downloadAttachment(
  env: Env,
  cipherUuid: string,
  attachmentId: string,
): Promise<R2ObjectBody | null> {
  return env.ATTACHMENTS.get(`${cipherUuid}/${attachmentId}`);
}

export async function deleteAttachment(
  env: Env,
  cipherUuid: string,
  attachmentId: string,
): Promise<void> {
  const db = createDb(env.DB);
  await env.ATTACHMENTS.delete(`${cipherUuid}/${attachmentId}`);
  await db.delete(attachments).where(eq(attachments.id, attachmentId));
}

export async function getAttachmentMeta(env: Env, attachmentId: string) {
  const db = createDb(env.DB);
  return db.select().from(attachments).where(eq(attachments.id, attachmentId)).get();
}
