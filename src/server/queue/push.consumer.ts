import type { Env } from "../env";

interface PushMessage {
  userId: string;
  type: number;
  payload: unknown;
}

export async function processPushQueue(
  batch: MessageBatch,
  env: Env,
): Promise<void> {
  if (!env.PUSH_INSTALLATION_ID || !env.PUSH_INSTALLATION_KEY) {
    for (const msg of batch.messages) msg.ack();
    return;
  }

  for (const msg of batch.messages) {
    try {
      const data = msg.body as PushMessage;

      const response = await fetch("https://push.bitwarden.com/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Installation ${env.PUSH_INSTALLATION_ID}:${env.PUSH_INSTALLATION_KEY}`,
        },
        body: JSON.stringify({
          userId: data.userId,
          type: data.type,
          payload: data.payload,
        }),
      });

      if (response.ok) {
        msg.ack();
      } else {
        msg.retry();
      }
    } catch {
      msg.retry();
    }
  }
}
