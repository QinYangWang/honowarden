import type { Env } from "../env";
import { createDb } from "../db/client";
import { event } from "../db/schema";

interface EventMessage {
  uuid: string;
  eventType: number;
  userUuid?: string;
  orgUuid?: string;
  cipherUuid?: string;
  collectionUuid?: string;
  groupUuid?: string;
  orgUserUuid?: string;
  actUserUuid?: string;
  deviceType?: number;
  ipAddress?: string;
  eventDate: string;
}

export async function processEventQueue(
  batch: MessageBatch,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    try {
      const data = msg.body as EventMessage;

      await db.insert(event).values({
        uuid: data.uuid,
        eventType: data.eventType,
        userUuid: data.userUuid || null,
        orgUuid: data.orgUuid || null,
        cipherUuid: data.cipherUuid || null,
        collectionUuid: data.collectionUuid || null,
        groupUuid: data.groupUuid || null,
        orgUserUuid: data.orgUserUuid || null,
        actUserUuid: data.actUserUuid || null,
        deviceType: data.deviceType || null,
        ipAddress: data.ipAddress || null,
        eventDate: new Date(data.eventDate),
      });

      msg.ack();
    } catch (error) {
      console.error("Event processing error:", error);
      msg.retry();
    }
  }
}
