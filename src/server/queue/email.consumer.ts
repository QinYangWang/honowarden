import type { Env } from "../env";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function processEmailQueue(
  batch: MessageBatch,
  env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      const data = msg.body as EmailMessage;
      if (!env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not set, skipping email");
        msg.ack();
        continue;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HonoWarden <noreply@honowarden.com>",
          to: data.to,
          subject: data.subject,
          html: data.html,
        }),
      });

      if (!response.ok) {
        console.error("Email send failed:", await response.text());
        msg.retry();
      } else {
        msg.ack();
      }
    } catch (error) {
      console.error("Email processing error:", error);
      msg.retry();
    }
  }
}
