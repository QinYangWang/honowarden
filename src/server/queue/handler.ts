import type { Env } from "../env";
import { processEmailQueue } from "./email.consumer";
import { processPushQueue } from "./push.consumer";
import { processEventQueue } from "./event.consumer";

export async function handleQueue(
  batch: MessageBatch,
  env: Env,
): Promise<void> {
  const queueName = batch.queue;

  if (queueName.includes("email")) {
    await processEmailQueue(batch, env);
  } else if (queueName.includes("push")) {
    await processPushQueue(batch, env);
  } else if (queueName.includes("events")) {
    await processEventQueue(batch, env);
  }
}
