import type { Env } from "../env";
import { generateUuid } from "../utils/id";

export interface EventData {
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
}

export async function logEvent(env: Env, data: EventData): Promise<void> {
  await env.EVENT_QUEUE.send({
    uuid: generateUuid(),
    ...data,
    eventDate: new Date().toISOString(),
  });
}
