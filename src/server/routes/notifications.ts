import { Hono } from "hono";
import type { Env } from "../env";

const notifications = new Hono<{ Bindings: Env }>();

notifications.get("/hub", async (c) => {
  const userId = c.req.query("userId") || "";
  const deviceId = c.req.query("deviceId") || "";
  const id = c.env.USER_HUB.idFromName("global");
  const stub = c.env.USER_HUB.get(id);

  const url = new URL(c.req.url);
  url.pathname = "/websocket";
  url.searchParams.set("userId", userId);
  url.searchParams.set("deviceId", deviceId);

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

notifications.post("/hub/negotiate", async (c) => {
  const id = c.env.USER_HUB.idFromName("global");
  const stub = c.env.USER_HUB.get(id);

  const url = new URL(c.req.url);
  url.pathname = "/negotiate";

  return stub.fetch(new Request(url.toString(), { method: "POST" }));
});

notifications.get("/anonymous-hub", async (c) => {
  const token = c.req.query("token") || "";
  const id = c.env.ANON_HUB.idFromName("global");
  const stub = c.env.ANON_HUB.get(id);

  const url = new URL(c.req.url);
  url.pathname = "/websocket";
  url.searchParams.set("token", token);

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

notifications.post("/anonymous-hub/negotiate", async (c) => {
  const id = c.env.ANON_HUB.idFromName("global");
  const stub = c.env.ANON_HUB.get(id);

  const url = new URL(c.req.url);
  url.pathname = "/negotiate";

  return stub.fetch(new Request(url.toString(), { method: "POST" }));
});

export { notifications };
