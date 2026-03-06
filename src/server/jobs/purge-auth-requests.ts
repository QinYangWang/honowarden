import type { Env } from "../env";

export async function purgeAuthRequests(env: Env): Promise<void> {
  const cutoff = Math.floor((Date.now() - 15 * 60_000) / 1000);
  await env.DB.prepare("DELETE FROM auth_requests WHERE creation_date <= ?")
    .bind(cutoff)
    .run();
}
