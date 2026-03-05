import type { Env } from "../env";
import { purgeSends } from "./purge-sends";
import { purgeTrash } from "./purge-trash";
import { purgeAuthRequests } from "./purge-auth-requests";
import { eventCleanup } from "./event-cleanup";

const CRON_MAP: Record<string, (env: Env) => Promise<void>> = {
  "5 * * * *": purgeSends,
  "5 0 * * *": purgeTrash,
  "*/1 * * * *": purgeAuthRequests,
  "10 0 * * *": eventCleanup,
};

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
): Promise<void> {
  const handler = CRON_MAP[event.cron];
  if (handler) {
    await handler(env);
  } else {
    console.log(`No handler for cron: ${event.cron}`);
  }
}
