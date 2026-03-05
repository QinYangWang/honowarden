import { createMiddleware } from "hono/factory";
import type { Env } from "../env";

export const securityHeaders = () =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    await next();

    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "SAMEORIGIN");
    c.header("X-XSS-Protection", "0");
    c.header("Referrer-Policy", "same-origin");
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'wasm-unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https://haveibeenpwned.com; " +
        "connect-src 'self' wss: https://haveibeenpwned.com; " +
        "frame-ancestors 'self'; " +
        "form-action 'self'",
    );
    c.header(
      "Permissions-Policy",
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), " +
        "magnetometer=(), microphone=(), payment=(), usb=()",
    );
  });
