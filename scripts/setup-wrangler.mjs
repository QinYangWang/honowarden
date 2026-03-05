#!/usr/bin/env node
/**
 * Generate wrangler.json from wrangler.template.json.
 *
 * With CLOUDFLARE_API_TOKEN:
 *   Looks up (or creates) D1 databases, KV namespaces, R2 buckets, and Queues
 *   on Cloudflare, then writes wrangler.json with real resource IDs.
 *
 * Without CLOUDFLARE_API_TOKEN:
 *   Writes wrangler.json with placeholder IDs (works for local miniflare dev).
 *
 * Environment variables:
 *   CLOUDFLARE_API_TOKEN   – (optional) Cloudflare API token
 *   CLOUDFLARE_ACCOUNT_ID  – (optional) auto-detected if not set
 *   DEPLOY_DOMAIN          – (optional) production domain override
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TEMPLATE = resolve(ROOT, "wrangler.template.json");
const OUTPUT = resolve(ROOT, "wrangler.json");
const API_BASE = "https://api.cloudflare.com/client/v4";

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// ── Cloudflare API helpers ───────────────────────────────────────────────────

async function cf(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const json = await res.json();
  if (!json.success) {
    const msgs = (json.errors || []).map((e) => e.message).join("; ");
    throw new Error(`CF API ${method} ${path}: ${msgs}`);
  }
  return json.result;
}

async function getAccountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const accounts = await cf("GET", "/accounts?per_page=5");
  if (!accounts || accounts.length === 0) throw new Error("No Cloudflare accounts found for this API token");
  if (accounts.length > 1) {
    console.log("⚠️  Multiple accounts found. Set CLOUDFLARE_ACCOUNT_ID to pick one.");
    console.log(accounts.map((a) => `   ${a.id} — ${a.name}`).join("\n"));
  }
  return accounts[0].id;
}

// ── Resource provisioning ────────────────────────────────────────────────────

async function ensureD1(accountId, name) {
  const dbs = await cf("GET", `/accounts/${accountId}/d1/database?name=${encodeURIComponent(name)}&per_page=50`);
  const existing = dbs.find((d) => d.name === name);
  if (existing) {
    console.log(`   D1  "${name}" → ${existing.uuid} (existing)`);
    return existing.uuid;
  }
  const created = await cf("POST", `/accounts/${accountId}/d1/database`, { name });
  console.log(`   D1  "${name}" → ${created.uuid} (created)`);
  return created.uuid;
}

async function ensureKV(accountId, title) {
  const list = await cf("GET", `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  const existing = list.find((ns) => ns.title === title);
  if (existing) {
    console.log(`   KV  "${title}" → ${existing.id} (existing)`);
    return existing.id;
  }
  const created = await cf("POST", `/accounts/${accountId}/storage/kv/namespaces`, { title });
  console.log(`   KV  "${title}" → ${created.id} (created)`);
  return created.id;
}

async function ensureR2(accountId, bucketName) {
  try {
    await cf("GET", `/accounts/${accountId}/r2/buckets/${bucketName}`);
    console.log(`   R2  "${bucketName}" (existing)`);
  } catch {
    await cf("POST", `/accounts/${accountId}/r2/buckets`, { name: bucketName });
    console.log(`   R2  "${bucketName}" (created)`);
  }
}

async function ensureQueue(accountId, queueName) {
  const list = await cf("GET", `/accounts/${accountId}/queues?per_page=100`);
  const existing = (list.queues || list || []).find?.((q) => q.queue_name === queueName);
  if (existing) {
    console.log(`   Queue "${queueName}" (existing)`);
    return;
  }
  try {
    await cf("POST", `/accounts/${accountId}/queues`, { queue_name: queueName });
    console.log(`   Queue "${queueName}" (created)`);
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log(`   Queue "${queueName}" (existing)`);
    } else {
      throw err;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const config = JSON.parse(readFileSync(TEMPLATE, "utf-8"));
  const workerName = config.name || "honowarden";

  if (!TOKEN) {
    if (process.env.DEPLOY_DOMAIN) {
      config.vars = config.vars || {};
      config.vars.DOMAIN = process.env.DEPLOY_DOMAIN;
    }
    writeFileSync(OUTPUT, JSON.stringify(config, null, "\t") + "\n", "utf-8");
    console.log("✅ wrangler.json generated (local dev — placeholder IDs retained)");
    return;
  }

  console.log("🔑 Cloudflare API token detected — provisioning resources...\n");
  const accountId = await getAccountId();
  console.log(`   Account: ${accountId}\n`);

  // D1 databases
  for (const db of config.d1_databases || []) {
    db.database_id = await ensureD1(accountId, db.database_name);
  }

  // KV namespaces — use "{workerName}-{BINDING}" as the title
  for (const kv of config.kv_namespaces || []) {
    const title = `${workerName}-${kv.binding}`;
    kv.id = await ensureKV(accountId, title);
  }

  // R2 buckets
  for (const r2 of config.r2_buckets || []) {
    await ensureR2(accountId, r2.bucket_name);
  }

  // Queues — deduplicate producer + consumer queue names
  const queueNames = new Set();
  for (const p of config.queues?.producers || []) queueNames.add(p.queue);
  for (const c of config.queues?.consumers || []) queueNames.add(c.queue);
  if (config.queues?.consumers) {
    for (const c of config.queues.consumers) {
      if (c.dead_letter_queue) queueNames.add(c.dead_letter_queue);
    }
  }
  for (const name of queueNames) {
    await ensureQueue(accountId, name);
  }

  // Domain override
  if (process.env.DEPLOY_DOMAIN) {
    config.vars = config.vars || {};
    config.vars.DOMAIN = process.env.DEPLOY_DOMAIN;
  }

  console.log("");
  writeFileSync(OUTPUT, JSON.stringify(config, null, "\t") + "\n", "utf-8");
  console.log("✅ wrangler.json generated with real resource IDs");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
