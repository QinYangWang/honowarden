import type { Env } from "../env";

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  await env.EMAIL_QUEUE.send({ to, subject, html });
}
