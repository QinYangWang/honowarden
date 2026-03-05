import { Hono } from "hono";
import type { Env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import { securityHeaders } from "./middleware/security-headers";
import { corsMiddleware } from "./middleware/cors";
import { rateLimiter } from "./middleware/rate-limit";
import { initializeKeys } from "./auth/crypto";
import { identity } from "./routes/identity";
import { core } from "./routes/core";
import { admin } from "./routes/admin";
import { sendsPublic } from "./routes/sends-public";
import { notifications } from "./routes/notifications";
import { icons } from "./routes/icons";
import { handleQueue } from "./queue/handler";
import { handleScheduled } from "./jobs/handler";

export { UserNotificationHub } from "./durable-objects/user-hub";
export { AnonymousNotificationHub } from "./durable-objects/anonymous-hub";

const app = new Hono<{ Bindings: Env }>();

app.use("*", errorHandler);
app.use("*", securityHeaders());
app.use("*", rateLimiter());

app.use("*", async (c, next) => {
  const origin = c.env.DOMAIN || new URL(c.req.url).origin;
  return corsMiddleware(origin)(c, next);
});

app.use("*", async (c, next) => {
  await initializeKeys(c.env);
  await next();
});

app.route("/identity", identity);
app.route("/api", core);
app.route("/admin", admin);
app.route("/api/sends", sendsPublic);
app.route("/notifications", notifications);
app.route("/icons", icons);

app.get("/", (c) => c.redirect("/api/alive"));

export default {
  fetch: app.fetch,
  queue: handleQueue,
  scheduled: handleScheduled,
};
