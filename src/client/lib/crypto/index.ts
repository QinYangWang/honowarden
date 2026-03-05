export async function deriveKey(
  password: string,
  email: string,
  kdf: number,
  kdfIterations: number,
  kdfMemory?: number | null,
  kdfParallelism?: number | null,
): Promise<ArrayBuffer> {
  const emailNorm = email.trim().toLowerCase();
  const salt = new TextEncoder().encode(emailNorm);

  if (kdf === 0) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    return crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: kdfIterations, hash: "SHA-256" },
      key,
      256,
    );
  }

  throw new Error("Argon2id requires argon2-browser, call from the login page directly");
}

export async function hashPassword(
  masterKey: ArrayBuffer,
  password: string,
): Promise<string> {
  const key = await crypto.subtle.importKey("raw", masterKey, "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(password),
      iterations: 1,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function makeEncKey(masterKey: ArrayBuffer): Promise<{
  encKey: string;
  publicKey: string;
  encPrivateKey: string;
}> {
  const aesKey = crypto.getRandomValues(new Uint8Array(64));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const importedKey = await crypto.subtle.importKey(
    "raw",
    masterKey,
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    importedKey,
    aesKey,
  );

  const encKey =
    "2." + btoa(String.fromCharCode(...iv)) + "|" + btoa(String.fromCharCode(...new Uint8Array(encrypted)));

  const rsaKeyPair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-1" },
    true,
    ["encrypt", "decrypt"],
  );

  const publicKeyBuf = await crypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuf)));

  const privateKeyBuf = await crypto.subtle.exportKey("pkcs8", rsaKeyPair.privateKey);
  const encKeyForPrivate = await crypto.subtle.importKey(
    "raw",
    aesKey.slice(0, 32),
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );
  const privateIv = crypto.getRandomValues(new Uint8Array(16));
  const encPrivateKeyBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: privateIv },
    encKeyForPrivate,
    privateKeyBuf,
  );

  const encPrivateKey =
    "2." +
    btoa(String.fromCharCode(...privateIv)) +
    "|" +
    btoa(String.fromCharCode(...new Uint8Array(encPrivateKeyBuf)));

  return { encKey, publicKey, encPrivateKey };
}
