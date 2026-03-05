import { cors } from "hono/cors";

export const corsMiddleware = (domain: string) =>
  cors({
    origin: domain,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "Accept",
      "Device-Type",
      "Bitwarden-Client-Name",
      "Bitwarden-Client-Version",
    ],
    exposeHeaders: [],
    credentials: true,
    maxAge: 86400,
  });
