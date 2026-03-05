export function createTestUser(overrides?: Record<string, unknown>) {
  return {
    uuid: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    name: "Test User",
    passwordHash: Buffer.from(new Uint8Array(32)),
    salt: Buffer.from(new Uint8Array(32)),
    passwordIterations: 100000,
    passwordHint: null,
    akey: "test-enc-key",
    privateKey: null,
    publicKey: null,
    securityStamp: crypto.randomUUID(),
    clientKdfType: 0,
    clientKdfIter: 100000,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestCipher(userUuid: string, overrides?: Record<string, unknown>) {
  return {
    uuid: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userUuid,
    organizationUuid: null,
    atype: 1,
    name: "Test Login",
    notes: null,
    fields: null,
    data: JSON.stringify({ username: "user", password: "pass", uris: [] }),
    key: null,
    reprompt: null,
    passwordHistory: null,
    deletedAt: null,
    ...overrides,
  };
}

export function createTestFolder(userUuid: string, overrides?: Record<string, unknown>) {
  return {
    uuid: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userUuid,
    name: "Test Folder",
    ...overrides,
  };
}
