import { createMiddleware } from "hono/factory";
import type { Env } from "../env";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix: string;
}

export const rateLimiter = (config?: Partial<RateLimitConfig>) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || "unknown";
    const path = new URL(c.req.url).pathname;

    const limitConfig = getRouteRateLimit(path, config);
    if (!limitConfig) {
      await next();
      return;
    }

    const key = `rate:${ip}:${limitConfig.keyPrefix}`;
    const current = await c.env.RATE_LIMIT.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limitConfig.maxRequests) {
      return c.json(
        {
          error: "Too many requests",
          error_description: "Rate limit exceeded. Try again later.",
        },
        429,
      );
    }

    await c.env.RATE_LIMIT.put(key, String(count + 1), {
      expirationTtl: limitConfig.windowSeconds,
    });

    c.header("X-RateLimit-Limit", String(limitConfig.maxRequests));
    c.header("X-RateLimit-Remaining", String(limitConfig.maxRequests - count - 1));

    await next();
  });

function getRouteRateLimit(
  path: string,
  override?: Partial<RateLimitConfig>,
): RateLimitConfig | null {
  if (override) {
    return {
      maxRequests: override.maxRequests || 10,
      windowSeconds: override.windowSeconds || 60,
      keyPrefix: override.keyPrefix || "default",
    };
  }

  if (path.startsWith("/identity/connect/token")) {
    return { maxRequests: 10, windowSeconds: 60, keyPrefix: "login" };
  }
  if (path.startsWith("/identity/accounts/register")) {
    return { maxRequests: 3, windowSeconds: 3600, keyPrefix: "register" };
  }
  if (path.includes("/two-factor/send-email")) {
    return { maxRequests: 5, windowSeconds: 300, keyPrefix: "2fa-email" };
  }
  if (path.startsWith("/admin") && path !== "/admin/logout") {
    return { maxRequests: 10, windowSeconds: 300, keyPrefix: "admin" };
  }
  if (path.includes("password-hint")) {
    return { maxRequests: 3, windowSeconds: 3600, keyPrefix: "hint" };
  }
  if (path.includes("/sends/access/")) {
    return { maxRequests: 30, windowSeconds: 60, keyPrefix: "send-access" };
  }

  return null;
}
