# 后台任务设计

## 概述

Vaultwarden 使用 `job_scheduler_ng` 在独立线程中运行 cron 任务。HonoWarden 使用 Cloudflare 的两种异步处理机制替代：

- **Cron Triggers** - 定时任务，替代 cron scheduler
- **Queues** - 异步消息处理，替代同步的邮件/Push 调用

## Cron Triggers

### 免费版限制

Cloudflare Workers 免费版每账号最多 **5 个** Cron Triggers（[官方限制](https://developers.cloudflare.com/workers/platform/limits/)）。为满足此限制，HonoWarden 使用 **1 个 cron**（`*/1 * * * *` 每分钟触发），在 handler 内按当前 UTC 时间分发执行各任务。

### 任务映射

| 任务 | Vaultwarden Cron | HonoWarden 触发条件 | 功能描述 |
|------|-----------------|---------------------|---------|
| Auth Request 清理 | `30 * * * * *` | 每分钟 | 删除过期的无密码登录请求（15 分钟） |
| Send 清理 | `0 5 * * * *` | minute === 5 | 删除过期 Send 及其 R2 文件 |
| 回收站清理 | `0 5 0 * * *` | minute === 5 && hour === 0 | 硬删超期软删 Cipher (默认 30 天) |
| 事件清理 | `0 10 0 * * *` | minute === 10 && hour === 0 | 删除超过保留期的事件日志 |
| 未完成 2FA 通知 | `30 * * * * *` | （待实现） | 邮件通知有未完成 2FA 登录的用户 |
| Emergency 超时 | `0 7 * * * *` | （待实现） | 自动批准超过等待期的紧急访问 |
| Emergency 提醒 | `0 3 * * * *` | （待实现） | 提醒授权人有待处理的恢复请求 |
| Duo Context 清理 | `30 * * * * *` | （待实现） | 清理过期 Duo 认证上下文 |
| SSO 清理 | `0 20 0 * * *` | （待实现） | 清理未完成的 SSO 认证数据 |

> Vaultwarden 使用 6 位 cron（含秒），Cloudflare Cron Triggers 使用标准 5 位 cron（不含秒）。

### wrangler.template.json 配置

```json
"triggers": {
  "crons": ["*/1 * * * *"]
}
```

单一 cron 每分钟触发，handler 根据 `minute`、`hour` 决定执行哪些任务。

### Cron Handler

```typescript
// src/server/jobs/handler.ts
async function runScheduledTasks(env: Env): Promise<void> {
  const now = new Date();
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();

  await purgeAuthRequests(env);

  if (minute === 5) {
    await purgeSends(env);
    if (hour === 0) await purgeTrash(env);
  }
  if (minute === 10 && hour === 0) {
    await eventCleanup(env);
  }
}

export async function handleScheduled(
  _event: ScheduledEvent,
  env: Env,
): Promise<void> {
  await runScheduledTasks(env);
}

```

### 任务实现

#### Send 清理

```typescript
// src/server/jobs/purge-sends.ts
export async function purgeSends(db: Database, env: Env): Promise<void> {
  const now = new Date();

  // Find expired sends
  const expired = await db.select()
    .from(sends)
    .where(lte(sends.deletionDate, now));

  for (const send of expired) {
    // Delete files from R2 if file type
    if (send.atype === SendType.File) {
      await deleteSendFiles(env, send.uuid);
    }
  }

  // Delete from database
  await db.delete(sends)
    .where(lte(sends.deletionDate, now));
}
```

#### 回收站清理

```typescript
// src/server/jobs/purge-trash.ts
export async function purgeTrash(db: Database, env: Env): Promise<void> {
  const trashAutoDeleteDays = await getConfig(env, "trash_auto_delete_days", 30);
  const cutoff = new Date(Date.now() - trashAutoDeleteDays * 86400_000);

  // Find ciphers in trash past retention period
  const trashed = await db.select()
    .from(ciphers)
    .where(and(
      isNotNull(ciphers.deletedAt),
      lte(ciphers.deletedAt, cutoff)
    ));

  for (const cipher of trashed) {
    await deleteCipherWithAttachments(env, db, cipher.uuid);
  }
}
```

#### 未完成 2FA 通知

```typescript
// src/server/jobs/incomplete-2fa.ts
export async function notifyIncomplete2fa(db: Database, env: Env): Promise<void> {
  const records = await db.select()
    .from(twofactorIncomplete)
    .innerJoin(users, eq(twofactorIncomplete.userUuid, users.uuid));

  for (const record of records) {
    await env.EMAIL_QUEUE.send({
      type: "incomplete-2fa",
      to: record.users.email,
      data: {
        userName: record.users.name,
        deviceName: record.twofactor_incomplete.deviceName,
        deviceType: record.twofactor_incomplete.deviceType,
        loginTime: record.twofactor_incomplete.loginTime,
        ipAddress: record.twofactor_incomplete.ipAddress,
      },
    });
  }

  // Delete processed records
  if (records.length > 0) {
    await db.delete(twofactorIncomplete);
  }
}
```

#### Emergency Access 超时

```typescript
// src/server/jobs/emergency-timeout.ts
export async function emergencyTimeout(db: Database, env: Env): Promise<void> {
  // Find recovery requests past their wait period
  const pending = await db.select()
    .from(emergencyAccess)
    .innerJoin(users, eq(emergencyAccess.grantorUuid, users.uuid))
    .where(eq(emergencyAccess.status, EmergencyAccessStatus.RecoveryInitiated));

  const now = Date.now();

  for (const record of pending) {
    const ea = record.emergency_access;
    if (!ea.recoveryInitiatedAt) continue;

    const waitMs = ea.waitTimeDays * 86400_000;
    const deadline = new Date(ea.recoveryInitiatedAt).getTime() + waitMs;

    if (now >= deadline) {
      // Auto-approve
      await db.update(emergencyAccess)
        .set({
          status: EmergencyAccessStatus.RecoveryApproved,
          updatedAt: new Date(),
        })
        .where(eq(emergencyAccess.uuid, ea.uuid));

      // Notify grantee
      await env.EMAIL_QUEUE.send({
        type: "emergency-access-approved",
        to: ea.email!,
        data: { grantorName: record.users.name },
      });
    }
  }
}
```

#### Emergency Access 提醒

```typescript
// src/server/jobs/emergency-reminder.ts
export async function emergencyReminder(db: Database, env: Env): Promise<void> {
  const pending = await db.select()
    .from(emergencyAccess)
    .innerJoin(users, eq(emergencyAccess.grantorUuid, users.uuid))
    .where(eq(emergencyAccess.status, EmergencyAccessStatus.RecoveryInitiated));

  const now = Date.now();
  const oneDayMs = 86400_000;

  for (const record of pending) {
    const ea = record.emergency_access;
    const lastNotified = ea.lastNotificationAt
      ? new Date(ea.lastNotificationAt).getTime()
      : 0;

    // Send reminder every 24 hours
    if (now - lastNotified >= oneDayMs) {
      await env.EMAIL_QUEUE.send({
        type: "emergency-access-reminder",
        to: record.users.email,
        data: {
          granteeEmail: ea.email,
          waitTimeDays: ea.waitTimeDays,
        },
      });

      await db.update(emergencyAccess)
        .set({ lastNotificationAt: new Date() })
        .where(eq(emergencyAccess.uuid, ea.uuid));
    }
  }
}
```

#### Auth Request 清理

```typescript
// src/server/jobs/purge-auth-requests.ts
export async function purgeAuthRequests(env: Env): Promise<void> {
  const db = createDb(env.DB);
  await db
    .delete(authRequests)
    .where(sql`${authRequests.creationDate} <= cast(strftime('%s', datetime('now', '-15 minutes')) as integer)`);
}
```

> 使用 `strftime` + `datetime` 在数据库端计算 cutoff，避免 D1 参数绑定问题；`unixepoch` 在 D1 的 SQLite 版本中可能不可用。

#### 事件清理

```typescript
// src/server/jobs/event-cleanup.ts
export async function cleanupEvents(db: Database, env: Env): Promise<void> {
  const retainDays = await getConfig(env, "events_days_retain", 365);
  const cutoff = new Date(Date.now() - retainDays * 86400_000);

  await db.delete(event)
    .where(lte(event.eventDate, cutoff));
}
```

#### SSO 清理

```typescript
// src/server/jobs/purge-sso.ts
export async function purgeSsoAuth(db: Database): Promise<void> {
  const expiry = new Date(Date.now() - 10 * 60_000); // 10 minutes

  await db.delete(ssoAuth)
    .where(lte(ssoAuth.createdAt, expiry));
}
```

---

## Queues (异步任务)

### Queue 设计

| Queue | Binding | 用途 | 最大批量 | 最大重试 |
|-------|---------|------|---------|---------|
| `honowarden-email` | `EMAIL_QUEUE` | 邮件发送 | 10 | 3 |
| `honowarden-push` | `PUSH_QUEUE` | Push 通知 | 50 | 3 |
| `honowarden-events` | `EVENT_QUEUE` | 事件日志写入 | 100 | 2 |

### Queue Consumer

```typescript
// src/server/queue/handler.ts
export async function handleQueueMessage(
  batch: MessageBatch,
  env: Env
): Promise<void> {
  switch (batch.queue) {
    case "honowarden-email":
      await processEmailBatch(batch, env);
      break;
    case "honowarden-push":
      await processPushBatch(batch, env);
      break;
    case "honowarden-events":
      await processEventBatch(batch, env);
      break;
  }
}
```

### 邮件队列消费

```typescript
// src/server/queue/email.consumer.ts
interface EmailMessage {
  type: string;
  to: string;
  data: Record<string, unknown>;
}

export async function processEmailBatch(
  batch: MessageBatch<EmailMessage>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await sendEmail(env, msg.body.type, msg.body.to, msg.body.data);
      msg.ack();
    } catch (error) {
      msg.retry({ delaySeconds: 60 });
    }
  }
}
```

### Push 队列消费

```typescript
// src/server/queue/push.consumer.ts
interface PushMessage {
  type: string;
  userId: string;
  [key: string]: unknown;
}

export async function processPushBatch(
  batch: MessageBatch<PushMessage>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await sendPushNotification(env, msg.body.userId, msg.body.type, msg.body);
      msg.ack();
    } catch (error) {
      msg.retry({ delaySeconds: 30 });
    }
  }
}
```

### 事件队列消费

```typescript
// src/server/queue/event.consumer.ts
interface EventMessage {
  eventType: number;
  userUuid?: string;
  orgUuid?: string;
  cipherUuid?: string;
  ipAddress?: string;
  deviceType?: number;
}

export async function processEventBatch(
  batch: MessageBatch<EventMessage>,
  env: Env
): Promise<void> {
  const db = createDb(env.DB);
  const events = batch.messages.map(msg => ({
    uuid: crypto.randomUUID(),
    ...msg.body,
    eventDate: new Date(),
  }));

  // Batch insert
  if (events.length > 0) {
    await db.insert(event).values(events);
  }

  // Ack all
  for (const msg of batch.messages) {
    msg.ack();
  }
}
```

---

## Worker 入口集成

```typescript
// src/server/index.ts
export default {
  fetch: app.fetch,

  scheduled: handleScheduled,

  queue: handleQueue,
};
```

## 任务监控

### 日志

所有 Cron 和 Queue 任务通过 `console.log` 输出结构化日志，可在 Cloudflare Dashboard 的 Workers Logs 中查看：

```typescript
console.log(JSON.stringify({
  job: "purge-sends",
  deleted: expired.length,
  duration_ms: Date.now() - start,
}));
```

### 失败处理

- Cron 任务失败会在 Dashboard 中显示错误
- Queue 消息失败会自动重试（配置最大重试次数）
- 超过重试次数的消息进入 Dead Letter Queue（需配置）

### Dead Letter Queue

```toml
# wrangler.template.json
[[queues.consumers]]
queue = "honowarden-email"
max_retries = 3
dead_letter_queue = "honowarden-dlq"
```
