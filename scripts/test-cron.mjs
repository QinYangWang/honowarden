#!/usr/bin/env node
/**
 * Trigger the scheduled (cron) handler locally for testing.
 *
 * Per Cloudflare docs (workers/configuration/cron-triggers):
 *   - Path: /cdn-cgi/handler/scheduled
 *   - Works with wrangler dev OR Cloudflare Vite plugin (npm run dev)
 *
 * Prerequisites:
 *   1. npm run db:migrate:local
 *   2. npm run dev  OR  npm run cf-dev:cron  (in another terminal)
 *
 * Usage:
 *   node scripts/test-cron.mjs [base_url]
 *
 * Default base_url: http://localhost:8787 (wrangler) or http://localhost:5174 (vite)
 */
const base = process.argv[2] || "http://localhost:8787";
const cron = "*%2F1+*+*+*+*";
const path = "/cdn-cgi/handler/scheduled";
const url = `${base.replace(/\/$/, "")}${path}?cron=${cron}`;

console.log("Triggering cron handler...");
console.log("  URL:", url);

let res;
try {
  res = await fetch(url);
} catch (e) {
  console.error("\nFailed to connect. Ensure dev server is running:");
  console.error("  npm run dev  (vite, port 5174)  OR  npm run cf-dev:cron  (wrangler, port 8787)");
  process.exit(1);
}

const text = await res.text();
console.log("  Status:", res.status, res.statusText);
if (text) console.log("  Body:", text.slice(0, 500));

if (res.status === 404) {
  console.error("\n404: Ensure dev server is running (npm run dev or npm run cf-dev:cron).");
  process.exit(1);
}

process.exit(res.ok ? 0 : 1);
