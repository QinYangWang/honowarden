#!/usr/bin/env node
import { generateKeyPair, randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { resolve } from "node:path";

const generateKeyPairAsync = promisify(generateKeyPair);
const DEV_VARS_PATH = resolve(import.meta.dirname, "..", ".dev.vars");

async function main() {
  const force = process.argv.includes("--force");

  if (existsSync(DEV_VARS_PATH)) {
    const existing = readFileSync(DEV_VARS_PATH, "utf-8");
    const hasKey = existing.includes("RSA_PRIVATE_KEY") && !existing.includes("YOUR_RSA_PRIVATE_KEY_HERE");
    const hasToken = existing.includes("ADMIN_TOKEN") && !existing.includes("admin_password_for_dev");

    if ((hasKey || hasToken) && !force) {
      console.log("⚠️  .dev.vars already contains real RSA_PRIVATE_KEY or ADMIN_TOKEN.");
      console.log("   Run with --force to overwrite.");
      process.exit(1);
    }
  }

  // RSA 2048-bit PKCS#8 PEM — compatible with jose's importPKCS8()
  const { privateKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const adminToken = randomBytes(48).toString("base64url");

  // Preserve RESEND_API_KEY and DOMAIN if already set
  let resendKey = "re_test_your_key_here";
  let domain = "http://localhost:8787";

  if (existsSync(DEV_VARS_PATH)) {
    const existing = readFileSync(DEV_VARS_PATH, "utf-8");
    const resendMatch = existing.match(/^RESEND_API_KEY="(.+)"$/m);
    if (resendMatch && resendMatch[1] !== "re_test_your_key_here") {
      resendKey = resendMatch[1];
    }
    const domainMatch = existing.match(/^DOMAIN="(.+)"$/m);
    if (domainMatch) {
      domain = domainMatch[1];
    }
  }

  const content = [
    `RSA_PRIVATE_KEY="${privateKey.trim()}"`,
    `ADMIN_TOKEN="${adminToken}"`,
    `RESEND_API_KEY="${resendKey}"`,
    `DOMAIN="${domain}"`,
    "",
  ].join("\n");

  writeFileSync(DEV_VARS_PATH, content, "utf-8");

  console.log("✅ RSA private key generated (PKCS#8, 2048-bit RS256)");
  console.log(`✅ Admin token generated: ${adminToken.slice(0, 12)}...`);
  console.log(`✅ Written to .dev.vars`);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
