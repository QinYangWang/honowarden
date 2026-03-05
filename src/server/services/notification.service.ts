import type { Env } from "../env";

export enum NotificationType {
  SyncCipherUpdate = 0,
  SyncCipherCreate = 1,
  SyncLoginDelete = 2,
  SyncFolderDelete = 3,
  SyncCiphers = 4,
  SyncVault = 5,
  SyncOrgKeys = 6,
  SyncFolderCreate = 7,
  SyncFolderUpdate = 8,
  SyncCipherDelete = 9,
  SyncSettings = 10,
  LogOut = 11,
  SyncSendCreate = 12,
  SyncSendUpdate = 13,
  SyncSendDelete = 14,
  AuthRequest = 15,
  AuthRequestResponse = 16,
}

export async function sendUserNotification(
  env: Env,
  userId: string,
  type: NotificationType,
  payload: unknown,
): Promise<void> {
  const id = env.USER_HUB.idFromName("global");
  const stub = env.USER_HUB.get(id);

  await stub.fetch(new Request("https://internal/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type, payload }),
  }));
}

export async function sendCipherUpdate(env: Env, userId: string, cipherId: string): Promise<void> {
  await sendUserNotification(env, userId, NotificationType.SyncCipherUpdate, {
    id: cipherId,
    userId,
    organizationId: null,
    revisionDate: new Date().toISOString(),
  });
}

export async function sendFolderUpdate(env: Env, userId: string, folderId: string): Promise<void> {
  await sendUserNotification(env, userId, NotificationType.SyncFolderUpdate, {
    id: folderId,
    userId,
    revisionDate: new Date().toISOString(),
  });
}

export async function sendSyncVault(env: Env, userId: string): Promise<void> {
  await sendUserNotification(env, userId, NotificationType.SyncVault, {});
}

export async function sendLogout(env: Env, userId: string): Promise<void> {
  await sendUserNotification(env, userId, NotificationType.LogOut, {});
}
