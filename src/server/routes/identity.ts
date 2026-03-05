import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import { initializeKeys } from "../auth/crypto";
import { hashPassword, generateSalt } from "../auth/password";
import { generateUuid } from "../utils/id";
import { handlePasswordGrant, handleRefreshGrant } from "../services/auth.service";
import { getConfig } from "../services/config.service";
import { AppError } from "../middleware/error-handler";

const identity = new Hono<{ Bindings: Env }>();

identity.use("*", async (c, next) => {
  await initializeKeys(c.env);
  await next();
});

identity.post("/connect/token", async (c) => {
  const contentType = c.req.header("Content-Type") || "";
  let body: Record<string, string>;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await c.req.parseBody();
    body = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, String(v)]),
    );
  } else {
    body = await c.req.json();
  }

  const db = createDb(c.env.DB);
  const domain = new URL(c.req.url).origin;
  const grantType = body.grant_type;

  try {
    if (grantType === "password") {
      const result = await handlePasswordGrant(
        db,
        c.env,
        domain,
        body.username,
        body.password,
        body.scope || "api offline_access",
        body.client_id || "web",
        parseInt(body.deviceType || "0", 10),
        body.deviceIdentifier || generateUuid(),
        body.deviceName || "Unknown",
      );
      return c.json(result);
    }

    if (grantType === "refresh_token") {
      const result = await handleRefreshGrant(db, c.env, domain, body.refresh_token);
      return c.json(result);
    }

    if (grantType === "client_credentials") {
      throw new AppError(400, "unsupported_grant_type", "Client credentials not yet implemented.");
    }

    throw new AppError(400, "unsupported_grant_type", `Unsupported grant type: ${grantType}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.startsWith("invalid_grant:")) {
      return c.json(
        { error: "invalid_grant", error_description: msg.replace("invalid_grant:", "") },
        400,
      );
    }
    throw error;
  }
});

identity.post("/accounts/prelogin", async (c) => {
  const { email } = await c.req.json();
  const db = createDb(c.env.DB);

  const user = await db
    .select({
      clientKdfType: users.clientKdfType,
      clientKdfIter: users.clientKdfIter,
      clientKdfMemory: users.clientKdfMemory,
      clientKdfParallelism: users.clientKdfParallelism,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (user) {
    return c.json({
      kdf: user.clientKdfType,
      kdfIterations: user.clientKdfIter,
      kdfMemory: user.clientKdfMemory,
      kdfParallelism: user.clientKdfParallelism,
    });
  }

  return c.json({
    kdf: 0,
    kdfIterations: 600000,
    kdfMemory: null,
    kdfParallelism: null,
  });
});

identity.post("/accounts/register", async (c) => {
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const signupsAllowed = await getConfig<boolean>(c.env, "signups_allowed", true);
  if (!signupsAllowed) {
    throw new AppError(400, "registration_disabled", "Registration is disabled.");
  }

  const email = body.email?.toLowerCase();
  if (!email) {
    throw new AppError(400, "invalid_email", "Email is required.");
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    throw new AppError(400, "email_exists", "Email is already registered.");
  }

  const iterations = body.kdfIterations || 600000;
  const salt = generateSalt();
  const passwordHashResult = await hashPassword(body.masterPasswordHash, salt, iterations);

  const uuid = generateUuid();
  const now = new Date();

  await db.insert(users).values({
    uuid,
    email,
    name: body.name || email.split("@")[0],
    passwordHash: Buffer.from(passwordHashResult),
    salt: Buffer.from(salt),
    passwordIterations: iterations,
    passwordHint: body.masterPasswordHint || null,
    akey: body.key || "",
    privateKey: body.keys?.encryptedPrivateKey || null,
    publicKey: body.keys?.publicKey || null,
    securityStamp: generateUuid(),
    clientKdfType: body.kdf ?? 0,
    clientKdfIter: iterations,
    clientKdfMemory: body.kdfMemory ?? null,
    clientKdfParallelism: body.kdfParallelism ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json(null, 200);
});

export { identity };
