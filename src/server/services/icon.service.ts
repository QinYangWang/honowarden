import type { Env } from "../env";
import { isBlockedDomain, isValidIconContentType } from "../utils/domain";
import { getConfig } from "./config.service";

const DEFAULT_NEGATIVE_TTL = 259200;

export async function getIcon(env: Env, domain: string): Promise<Response> {
  if (isBlockedDomain(domain)) {
    return new Response(null, { status: 404 });
  }

  const enabled = await getConfig<boolean>(env, "icon_download_enabled", true);
  if (!enabled) {
    return new Response(null, { status: 404 });
  }

  const cacheKey = `icon:${domain}`;
  const cached = await env.ICONS.get(cacheKey);
  if (cached) {
    const contentType = cached.httpMetadata?.contentType || "image/x-icon";
    const headers = new Headers({ "Content-Type": contentType });
    headers.set("Cache-Control", "public, max-age=2592000");
    return new Response(cached.body, { headers });
  }

  const negativeCacheKey = `icon_neg:${domain}`;
  const negCached = await env.CONFIG.get(negativeCacheKey);
  if (negCached) {
    return new Response(null, { status: 404 });
  }

  try {
    const iconUrl = await findIconUrl(domain);
    if (!iconUrl) {
      await env.CONFIG.put(negativeCacheKey, "1", { expirationTtl: DEFAULT_NEGATIVE_TTL });
      return new Response(null, { status: 404 });
    }

    const response = await fetch(iconUrl, {
      headers: { "User-Agent": "HonoWarden/1.0" },
      redirect: "follow",
    });

    if (!response.ok || !isValidIconContentType(response.headers.get("Content-Type") || "")) {
      await env.CONFIG.put(negativeCacheKey, "1", { expirationTtl: DEFAULT_NEGATIVE_TTL });
      return new Response(null, { status: 404 });
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > 500_000) {
      return new Response(null, { status: 404 });
    }

    await env.ICONS.put(cacheKey, body, {
      httpMetadata: { contentType: response.headers.get("Content-Type") || "image/x-icon" },
    });

    return new Response(body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/x-icon",
        "Cache-Control": "public, max-age=2592000",
      },
    });
  } catch {
    await env.CONFIG.put(negativeCacheKey, "1", { expirationTtl: DEFAULT_NEGATIVE_TTL });
    return new Response(null, { status: 404 });
  }
}

async function findIconUrl(domain: string): Promise<string | null> {
  const candidates = [
    `https://${domain}/favicon.ico`,
    `https://${domain}/apple-touch-icon.png`,
  ];

  for (const url of candidates) {
    try {
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (resp.ok && isValidIconContentType(resp.headers.get("Content-Type") || "")) {
        return url;
      }
    } catch { /* HEAD probe may fail, try next candidate */ }
  }

  try {
    const html = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "HonoWarden/1.0" },
    });
    const text = await html.text();
    const match = text.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (match?.[1]) {
      const href = match[1];
      if (href.startsWith("http")) return href;
      if (href.startsWith("//")) return `https:${href}`;
      return `https://${domain}${href.startsWith("/") ? "" : "/"}${href}`;
    }
  } catch { /* HTML fetch may fail for unreachable domains */ }

  return null;
}
