import { Hono } from "hono";
import type { Env } from "../env";
import { getIcon } from "../services/icon.service";
import { validateDomain } from "../utils/validation";

const icons = new Hono<{ Bindings: Env }>();

icons.get("/:domain/icon.png", async (c) => {
  const domain = c.req.param("domain");

  if (!validateDomain(domain)) {
    return c.json({ error: "Invalid domain" }, 400);
  }

  return getIcon(c.env, domain);
});

export { icons };
