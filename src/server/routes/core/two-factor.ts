import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../db/client";
import { twofactor } from "../../db/schema";
import { TwoFactorType } from "../../db/schema/enums";
import { authMiddleware, type AuthContext } from "../../middleware/auth";
import { generateUuid } from "../../utils/id";
import { generateSecret, verifyTotp, generateOtpauthUri } from "../../auth/two-factor/totp";
import { generateRecoveryCodes } from "../../auth/two-factor/recovery";

const twoFactorRoute = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

twoFactorRoute.use("*", authMiddleware);

twoFactorRoute.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const factors = await db.select().from(twofactor).where(eq(twofactor.userUuid, user.uuid));
  return c.json({
    data: factors.map((f) => ({
      enabled: f.enabled,
      type: f.atype,
      object: "twoFactorProvider",
    })),
    object: "list",
    continuationToken: null,
  });
});

twoFactorRoute.post("/get-authenticator", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const existing = await db
    .select()
    .from(twofactor)
    .where(and(eq(twofactor.userUuid, user.uuid), eq(twofactor.atype, TwoFactorType.Authenticator)))
    .get();

  if (existing) {
    const data = JSON.parse(existing.data);
    return c.json({ enabled: existing.enabled, key: data.secret, object: "twoFactorAuthenticator" });
  }

  const secret = generateSecret();
  return c.json({ enabled: false, key: secret, object: "twoFactorAuthenticator" });
});

twoFactorRoute.put("/authenticator", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const isValid = await verifyTotp(body.key, body.token);
  if (!isValid) {
    return c.json({ error: "Invalid token" }, 400);
  }

  const existing = await db
    .select()
    .from(twofactor)
    .where(and(eq(twofactor.userUuid, user.uuid), eq(twofactor.atype, TwoFactorType.Authenticator)))
    .get();

  if (existing) {
    await db
      .update(twofactor)
      .set({ enabled: true, data: JSON.stringify({ secret: body.key }) })
      .where(eq(twofactor.uuid, existing.uuid));
  } else {
    await db.insert(twofactor).values({
      uuid: generateUuid(),
      userUuid: user.uuid,
      atype: TwoFactorType.Authenticator,
      enabled: true,
      data: JSON.stringify({ secret: body.key }),
    });
  }

  return c.json({ enabled: true, key: body.key, object: "twoFactorAuthenticator" });
});

twoFactorRoute.put("/disable", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  await db
    .update(twofactor)
    .set({ enabled: false })
    .where(and(eq(twofactor.userUuid, user.uuid), eq(twofactor.atype, body.type)));

  return c.json({ enabled: false, type: body.type, object: "twoFactorProvider" });
});

twoFactorRoute.post("/get-recover", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);

  const existing = await db
    .select()
    .from(twofactor)
    .where(and(eq(twofactor.userUuid, user.uuid), eq(twofactor.atype, TwoFactorType.Remember)))
    .get();

  if (existing) {
    return c.json({ code: existing.data, object: "twoFactorRecover" });
  }

  const codes = generateRecoveryCodes();
  await db.insert(twofactor).values({
    uuid: generateUuid(),
    userUuid: user.uuid,
    atype: TwoFactorType.Remember,
    enabled: true,
    data: JSON.stringify(codes),
  });

  return c.json({ code: JSON.stringify(codes), object: "twoFactorRecover" });
});

twoFactorRoute.post("/recover", async (c) => {
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  return c.json({ error: "Recovery code verification" }, 501);
});

export { twoFactorRoute };
