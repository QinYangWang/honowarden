#!/usr/bin/env node
/**
 * E2E test: Register → Login → Sync → CRUD
 *
 * Usage: node scripts/e2e-test.mjs [base_url]
 */
import { webcrypto } from "node:crypto";

const BASE = process.argv[2] || "http://localhost:5174";
const EMAIL = "Test1@Test.com";
const PASSWORD = "TestPassword123!@#";
const NAME = "Test User";

const encoder = new TextEncoder();

async function deriveKey(password, email, iterations) {
  const salt = encoder.encode(email.trim().toLowerCase());
  const key = await webcrypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return webcrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
}

async function hashPassword(masterKey, password) {
  const key = await webcrypto.subtle.importKey("raw", masterKey, "PBKDF2", false, ["deriveBits"]);
  const hash = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(password), iterations: 1, hash: "SHA-256" },
    key,
    256,
  );
  return Buffer.from(hash).toString("base64");
}

async function makeEncKey(masterKey) {
  const aesKey = webcrypto.getRandomValues(new Uint8Array(64));
  const iv = webcrypto.getRandomValues(new Uint8Array(16));
  const importedKey = await webcrypto.subtle.importKey("raw", masterKey, { name: "AES-CBC", length: 256 }, false, [
    "encrypt",
  ]);
  const encrypted = await webcrypto.subtle.encrypt({ name: "AES-CBC", iv }, importedKey, aesKey);
  const encKey =
    "2." + Buffer.from(iv).toString("base64") + "|" + Buffer.from(encrypted).toString("base64");

  const rsaKeyPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-1" },
    true,
    ["encrypt", "decrypt"],
  );
  const publicKeyBuf = await webcrypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
  const publicKey = Buffer.from(publicKeyBuf).toString("base64");

  const privateKeyBuf = await webcrypto.subtle.exportKey("pkcs8", rsaKeyPair.privateKey);
  const encKeyForPrivate = await webcrypto.subtle.importKey(
    "raw",
    aesKey.slice(0, 32),
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );
  const privateIv = webcrypto.getRandomValues(new Uint8Array(16));
  const encPrivateKeyBuf = await webcrypto.subtle.encrypt(
    { name: "AES-CBC", iv: privateIv },
    encKeyForPrivate,
    privateKeyBuf,
  );
  const encPrivateKey =
    "2." + Buffer.from(privateIv).toString("base64") + "|" + Buffer.from(encPrivateKeyBuf).toString("base64");

  return { encKey, publicKey, encPrivateKey };
}

async function api(method, path, body, headers = {}) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) {
    if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
      opts.body = body;
    } else {
      opts.body = JSON.stringify(body);
    }
  }
  console.log(`\n→ ${method} ${path}`);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  const status = `${res.status} ${res.statusText}`;
  if (res.ok) {
    console.log(`  ✅ ${status}`);
  } else {
    console.log(`  ❌ ${status}`);
  }
  console.log(`  Body:`, typeof json === "string" ? json.slice(0, 500) : JSON.stringify(json, null, 2).slice(0, 800));
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  console.log(`🧪 E2E Test — ${BASE}`);
  console.log(`   Email: ${EMAIL}\n`);

  // Step 1: Health check
  console.log("═══ Step 1: Health Check ═══");
  const alive = await api("GET", "/api/alive");
  if (!alive.ok) {
    console.log("❌ Server not healthy. Aborting.");
    process.exit(1);
  }

  // Step 2: Prelogin
  console.log("\n═══ Step 2: Prelogin ═══");
  const prelogin = await api("POST", "/identity/accounts/prelogin", { email: EMAIL });

  const kdfIterations = prelogin.json?.kdfIterations || 600000;
  console.log(`  KDF iterations: ${kdfIterations}`);

  // Step 3: Derive keys & register
  console.log("\n═══ Step 3: Register ═══");
  const masterKey = await deriveKey(PASSWORD, EMAIL, kdfIterations);
  const masterPasswordHash = await hashPassword(masterKey, PASSWORD);
  const keys = await makeEncKey(masterKey);

  const registerResult = await api("POST", "/identity/accounts/register", {
    email: EMAIL,
    name: NAME,
    masterPasswordHash,
    masterPasswordHint: "test hint",
    key: keys.encKey,
    kdf: 0,
    kdfIterations,
    keys: {
      publicKey: keys.publicKey,
      encryptedPrivateKey: keys.encPrivateKey,
    },
  });

  if (!registerResult.ok) {
    console.log("❌ Registration failed. Attempting login with existing account...");
  }

  // Step 4: Login
  console.log("\n═══ Step 4: Login ═══");
  const loginBody = new URLSearchParams({
    grant_type: "password",
    username: EMAIL,
    password: masterPasswordHash,
    scope: "api offline_access",
    client_id: "web",
    deviceType: "9",
    deviceIdentifier: webcrypto.randomUUID(),
    deviceName: "E2E Test Script",
  }).toString();

  const loginResult = await api("POST", "/identity/connect/token", loginBody, {
    "Content-Type": "application/x-www-form-urlencoded",
  });

  if (!loginResult.ok) {
    console.log("❌ Login failed. Aborting.");
    process.exit(1);
  }

  const accessToken = loginResult.json.access_token;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // Step 5: Sync
  console.log("\n═══ Step 5: Sync ═══");
  const syncResult = await api("GET", "/api/sync", null, authHeaders);

  // Step 6: Create cipher
  console.log("\n═══ Step 6: Create Cipher ═══");
  const cipherData = {
    type: 1,
    name: "2.dGVzdA==|testEncrypted|testMac",
    notes: null,
    login: {
      uri: "2.dGVzdA==|testEncrypted|testMac",
      username: "2.dGVzdA==|testEncrypted|testMac",
      password: "2.dGVzdA==|testEncrypted|testMac",
    },
  };
  const createCipher = await api("POST", "/api/ciphers", cipherData, authHeaders);

  if (createCipher.ok && createCipher.json?.id) {
    const cipherId = createCipher.json.id;

    // Step 7: Get cipher
    console.log("\n═══ Step 7: Get Cipher ═══");
    await api("GET", `/api/ciphers/${cipherId}`, null, authHeaders);

    // Step 8: Delete cipher
    console.log("\n═══ Step 8: Delete Cipher ═══");
    await api("DELETE", `/api/ciphers/${cipherId}`, null, authHeaders);
  }

  // Step 9: Create folder
  console.log("\n═══ Step 9: Create Folder ═══");
  const createFolder = await api("POST", "/api/folders", { name: "2.dGVzdA==|testEncrypted|testMac" }, authHeaders);

  if (createFolder.ok && createFolder.json?.id) {
    const folderId = createFolder.json.id;

    // Step 10: Delete folder
    console.log("\n═══ Step 10: Delete Folder ═══");
    await api("DELETE", `/api/folders/${folderId}`, null, authHeaders);
  }

  console.log("\n═══ Summary ═══");
  console.log("✅ E2E test completed.");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
