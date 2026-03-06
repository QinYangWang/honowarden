import type { Env } from "../env";
import { purgeSends } from "./purge-sends";
import { purgeTrash } from "./purge-trash";
import { purgeAuthRequests } from "./purge-auth-requests";
import { eventCleanup } from "./event-cleanup";

async function runScheduledTasks(env: Env): Promise<void> {
  const now = new Date();
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();

  await purgeAuthRequests(env);

  if (minute === 5) {
    await purgeSends(env);
    if (hour === 0) await purgeTrash(env);
  }
  if (minute === 10 && hour === 0) {
    await eventCleanup(env);
  }
}

export async function handleScheduled(
  _event: ScheduledEvent,
  env: Env,
): Promise<void> {
  await runScheduledTasks(env);
}
