import { Hono } from "hono";
import type { Env } from "../../env";
import { accounts } from "./accounts";
import { sync } from "./sync";
import { ciphersRoute } from "./ciphers";
import { foldersRoute } from "./folders";
import { organizationsRoute } from "./organizations";
import { sendsRoute } from "./sends";
import { twoFactorRoute } from "./two-factor";
import { emergencyAccessRoute } from "./emergency-access";
import { eventsRoute } from "./events";
import { devicesRoute } from "./devices";
import { getConfig } from "../../services/config.service";

const core = new Hono<{ Bindings: Env }>();

core.route("/accounts", accounts);
core.route("/devices", devicesRoute);
core.route("/sync", sync);
core.route("/ciphers", ciphersRoute);
core.route("/folders", foldersRoute);
core.route("/organizations", organizationsRoute);
core.route("/sends", sendsRoute);
core.route("/two-factor", twoFactorRoute);
core.route("/emergency-access", emergencyAccessRoute);
core.route("/events", eventsRoute);

core.get("/config", async (c) => {
  const domain = c.env.DOMAIN;
  const ssoEnabled = await getConfig(c.env, "sso_enabled", false);

  return c.json({
    version: "2025.1.0",
    gitHash: "",
    server: { name: "HonoWarden", url: "https://github.com/honowarden" },
    environment: {
      vault: domain,
      api: `${domain}/api`,
      identity: `${domain}/identity`,
      notifications: `${domain}/notifications`,
      sso: ssoEnabled ? `${domain}/identity` : "",
    },
    featureStates: {
      "autofill-v2": true,
      "fido2-vault-credentials": true,
    },
    object: "config",
  });
});

core.get("/alive", (c) => c.json({ status: "ok" }));

core.get("/version", (c) => c.json({ version: "2025.1.0" }));

export { core };
