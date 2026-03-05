# 数据库设计

## 概述

HonoWarden 使用 Cloudflare D1 (SQLite) 作为主数据库，通过 Drizzle ORM 实现类型安全的数据库操作。完整 Schema 包含 27 张表，完全兼容 Vaultwarden 的数据模型。

## Drizzle 客户端初始化

```typescript
// src/server/db/client.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

## Schema 定义

### users - 用户表

```typescript
// src/server/db/schema/users.ts
import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  uuid: text("uuid").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  verifiedAt: integer("verified_at", { mode: "timestamp" }),
  lastVerifyingAt: integer("last_verifying_at", { mode: "timestamp" }),
  loginVerifyCount: integer("login_verify_count").notNull().default(0),
  email: text("email").notNull().unique(),
  emailNew: text("email_new"),
  emailNewToken: text("email_new_token"),
  name: text("name").notNull(),
  passwordHash: blob("password_hash", { mode: "buffer" }).notNull(),
  salt: blob("salt", { mode: "buffer" }).notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  passwordHint: text("password_hint"),
  akey: text("akey").notNull(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  totpSecret: text("totp_secret"),
  totpRecover: text("totp_recover"),
  securityStamp: text("security_stamp").notNull(),
  stampException: text("stamp_exception"),
  equivalentDomains: text("equivalent_domains").notNull().default("[]"),
  excludedGlobals: text("excluded_globals").notNull().default("[]"),
  clientKdfType: integer("client_kdf_type").notNull().default(0),
  clientKdfIter: integer("client_kdf_iter").notNull().default(600000),
  clientKdfMemory: integer("client_kdf_memory"),
  clientKdfParallelism: integer("client_kdf_parallelism"),
  apiKey: text("api_key"),
  avatarColor: text("avatar_color"),
  externalId: text("external_id"),
});
```

### ciphers - 密码库条目表

```typescript
// src/server/db/schema/ciphers.ts
export const ciphers = sqliteTable("ciphers", {
  uuid: text("uuid").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").references(() => users.uuid),
  organizationUuid: text("organization_uuid").references(() => organizations.uuid),
  key: text("key"),
  atype: integer("atype").notNull(),    // 1=Login, 2=SecureNote, 3=Card, 4=Identity, 5=SshKey
  name: text("name").notNull(),
  notes: text("notes"),
  fields: text("fields"),               // JSON string of encrypted fields
  data: text("data").notNull(),          // JSON string of encrypted type-specific data
  passwordHistory: text("password_history"),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  reprompt: integer("reprompt"),
});

export const ciphersCollections = sqliteTable("ciphers_collections", {
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  collectionUuid: text("collection_uuid").notNull().references(() => collections.uuid),
}, (table) => ({
  pk: primaryKey({ columns: [table.cipherUuid, table.collectionUuid] }),
}));
```

### organizations - 组织表

```typescript
// src/server/db/schema/organizations.ts
export const organizations = sqliteTable("organizations", {
  uuid: text("uuid").primaryKey(),
  name: text("name").notNull(),
  billingEmail: text("billing_email").notNull(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
});

export const usersOrganizations = sqliteTable("users_organizations", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  invitedByEmail: text("invited_by_email"),
  accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
  akey: text("akey").notNull().default(""),
  status: integer("status").notNull(),       // 0=Invited, 1=Accepted, 2=Confirmed, -1=Revoked
  atype: integer("atype").notNull(),         // 0=Owner, 1=Admin, 2=User, 3=Manager
  resetPasswordKey: text("reset_password_key"),
  externalId: text("external_id"),
});

export const organizationApiKey = sqliteTable("organization_api_key", {
  uuid: text("uuid").notNull(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  atype: integer("atype").notNull(),
  apiKey: text("api_key").notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.uuid, table.orgUuid] }),
}));
```

### collections - 集合表

```typescript
// src/server/db/schema/collections.ts
export const collections = sqliteTable("collections", {
  uuid: text("uuid").primaryKey(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  name: text("name").notNull(),
  externalId: text("external_id"),
});

export const usersCollections = sqliteTable("users_collections", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  collectionUuid: text("collection_uuid").notNull().references(() => collections.uuid),
  readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
  hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
  manage: integer("manage", { mode: "boolean" }).notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.userUuid, table.collectionUuid] }),
}));
```

### groups - 分组表

```typescript
// src/server/db/schema/groups.ts
export const groups = sqliteTable("groups", {
  uuid: text("uuid").primaryKey(),
  organizationsUuid: text("organizations_uuid").notNull().references(() => organizations.uuid),
  name: text("name").notNull(),
  accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
  externalId: text("external_id"),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
});

export const groupsUsers = sqliteTable("groups_users", {
  groupsUuid: text("groups_uuid").notNull().references(() => groups.uuid),
  usersOrganizationsUuid: text("users_organizations_uuid").notNull()
    .references(() => usersOrganizations.uuid),
}, (table) => ({
  pk: primaryKey({ columns: [table.groupsUuid, table.usersOrganizationsUuid] }),
}));

export const collectionsGroups = sqliteTable("collections_groups", {
  collectionsUuid: text("collections_uuid").notNull().references(() => collections.uuid),
  groupsUuid: text("groups_uuid").notNull().references(() => groups.uuid),
  readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
  hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
  manage: integer("manage", { mode: "boolean" }).notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.collectionsUuid, table.groupsUuid] }),
}));
```

### devices - 设备表

```typescript
// src/server/db/schema/devices.ts
export const devices = sqliteTable("devices", {
  uuid: text("uuid").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  name: text("name").notNull(),
  atype: integer("atype").notNull(),
  pushUuid: text("push_uuid"),
  pushToken: text("push_token"),
  refreshToken: text("refresh_token").notNull(),
  twofactorRemember: text("twofactor_remember"),
}, (table) => ({
  pk: primaryKey({ columns: [table.uuid, table.userUuid] }),
}));
```

### folders - 文件夹表

```typescript
// src/server/db/schema/folders.ts
export const folders = sqliteTable("folders", {
  uuid: text("uuid").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  name: text("name").notNull(),
});

export const foldersCiphers = sqliteTable("folders_ciphers", {
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  folderUuid: text("folder_uuid").notNull().references(() => folders.uuid),
}, (table) => ({
  pk: primaryKey({ columns: [table.cipherUuid, table.folderUuid] }),
}));
```

### attachments - 附件表

```typescript
// src/server/db/schema/attachments.ts
export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  akey: text("akey"),
});
```

### sends - 发送表

```typescript
// src/server/db/schema/sends.ts
export const sends = sqliteTable("sends", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").references(() => users.uuid),
  organizationUuid: text("organization_uuid").references(() => organizations.uuid),
  name: text("name").notNull(),
  notes: text("notes"),
  atype: integer("atype").notNull(),       // 0=Text, 1=File
  data: text("data").notNull(),
  akey: text("akey").notNull(),
  passwordHash: blob("password_hash", { mode: "buffer" }),
  passwordSalt: blob("password_salt", { mode: "buffer" }),
  passwordIter: integer("password_iter"),
  maxAccessCount: integer("max_access_count"),
  accessCount: integer("access_count").notNull().default(0),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
  expirationDate: integer("expiration_date", { mode: "timestamp" }),
  deletionDate: integer("deletion_date", { mode: "timestamp" }).notNull(),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  hideEmail: integer("hide_email", { mode: "boolean" }),
});
```

### twofactor - 双因素认证表

```typescript
// src/server/db/schema/two-factor.ts
export const twofactor = sqliteTable("twofactor", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  atype: integer("atype").notNull(),       // 0=Authenticator, 1=Email, 2=Duo, 3=YubiKey, 5=Remember, 7=WebAuthn
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  data: text("data").notNull(),
  lastUsed: integer("last_used").notNull().default(0),
});

export const twofactorIncomplete = sqliteTable("twofactor_incomplete", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  deviceUuid: text("device_uuid").notNull(),
  deviceName: text("device_name").notNull(),
  deviceType: integer("device_type").notNull(),
  loginTime: integer("login_time", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userUuid, table.deviceUuid] }),
}));

export const twofactorDuoCtx = sqliteTable("twofactor_duo_ctx", {
  state: text("state").primaryKey(),
  userEmail: text("user_email").notNull(),
  nonce: text("nonce").notNull(),
  exp: integer("exp").notNull(),
});
```

### emergency_access - 紧急访问表

```typescript
// src/server/db/schema/emergency-access.ts
export const emergencyAccess = sqliteTable("emergency_access", {
  uuid: text("uuid").primaryKey(),
  grantorUuid: text("grantor_uuid").notNull().references(() => users.uuid),
  granteeUuid: text("grantee_uuid").references(() => users.uuid),
  email: text("email"),
  keyEncrypted: text("key_encrypted"),
  atype: integer("atype").notNull(),       // 0=View, 1=Takeover
  status: integer("status").notNull(),     // 0=Invited, 1=Accepted, 2=Confirmed, 3=RecoveryInitiated, 4=RecoveryApproved
  waitTimeDays: integer("wait_time_days").notNull(),
  recoveryInitiatedAt: integer("recovery_initiated_at", { mode: "timestamp" }),
  lastNotificationAt: integer("last_notification_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### org_policies - 组织策略表

```typescript
// src/server/db/schema/org-policies.ts
export const orgPolicies = sqliteTable("org_policies", {
  uuid: text("uuid").primaryKey(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  atype: integer("atype").notNull(),
  // 0=TwoFactorAuthentication, 1=MasterPassword, 2=PasswordGenerator,
  // 3=SingleOrg, 4=RequireSSO, 5=PersonalOwnership, 6=DisableSend,
  // 7=SendOptions, 8=ResetPassword
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  data: text("data").notNull().default("{}"),
});
```

### event - 事件日志表

```typescript
// src/server/db/schema/events.ts
export const event = sqliteTable("event", {
  uuid: text("uuid").primaryKey(),
  eventType: integer("event_type").notNull(),
  userUuid: text("user_uuid"),
  orgUuid: text("org_uuid"),
  cipherUuid: text("cipher_uuid"),
  collectionUuid: text("collection_uuid"),
  groupUuid: text("group_uuid"),
  orgUserUuid: text("org_user_uuid"),
  actUserUuid: text("act_user_uuid"),
  deviceType: integer("device_type"),
  ipAddress: text("ip_address"),
  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  policyUuid: text("policy_uuid"),
  providerUuid: text("provider_uuid"),
  providerUserUuid: text("provider_user_uuid"),
  providerOrgUuid: text("provider_org_uuid"),
});
```

### favorites - 收藏表

```typescript
// src/server/db/schema/favorites.ts
export const favorites = sqliteTable("favorites", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
}, (table) => ({
  pk: primaryKey({ columns: [table.userUuid, table.cipherUuid] }),
}));
```

### invitations - 邀请表

```typescript
// src/server/db/schema/invitations.ts
export const invitations = sqliteTable("invitations", {
  email: text("email").primaryKey(),
});
```

### auth_requests - 认证请求表

```typescript
// src/server/db/schema/auth-requests.ts
export const authRequests = sqliteTable("auth_requests", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  organizationUuid: text("organization_uuid"),
  requestDeviceIdentifier: text("request_device_identifier").notNull(),
  deviceType: integer("device_type").notNull(),
  requestIp: text("request_ip").notNull(),
  responseDeviceId: text("response_device_id"),
  accessCode: text("access_code").notNull(),
  publicKey: text("public_key").notNull(),
  encKey: text("enc_key"),
  masterPasswordHash: text("master_password_hash"),
  approved: integer("approved", { mode: "boolean" }),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  responseDate: integer("response_date", { mode: "timestamp" }),
  authenticationDate: integer("authentication_date", { mode: "timestamp" }),
});
```

### sso - SSO 相关表

```typescript
// src/server/db/schema/sso.ts
export const ssoAuth = sqliteTable("sso_auth", {
  state: text("state").primaryKey(),
  clientChallenge: text("client_challenge").notNull(),
  nonce: text("nonce").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeResponse: text("code_response"),
  authResponse: text("auth_response"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const ssoUsers = sqliteTable("sso_users", {
  userUuid: text("user_uuid").primaryKey().references(() => users.uuid),
  identifier: text("identifier").notNull(),
});
```

## 索引策略

```typescript
// 在各 schema 文件中定义索引
import { index } from "drizzle-orm/sqlite-core";

// users 表索引
// email 已通过 .unique() 自动创建唯一索引

// ciphers 表索引
export const ciphersUserIdx = index("idx_ciphers_user_uuid").on(ciphers.userUuid);
export const ciphersOrgIdx = index("idx_ciphers_org_uuid").on(ciphers.organizationUuid);
export const ciphersDeletedIdx = index("idx_ciphers_deleted_at").on(ciphers.deletedAt);

// devices 表索引
export const devicesUserIdx = index("idx_devices_user_uuid").on(devices.userUuid);
export const devicesRefreshIdx = index("idx_devices_refresh_token").on(devices.refreshToken);

// users_organizations 表索引
export const usersOrgsUserIdx = index("idx_users_orgs_user").on(usersOrganizations.userUuid);
export const usersOrgsOrgIdx = index("idx_users_orgs_org").on(usersOrganizations.orgUuid);

// sends 表索引
export const sendsUserIdx = index("idx_sends_user_uuid").on(sends.userUuid);
export const sendsDeletionIdx = index("idx_sends_deletion_date").on(sends.deletionDate);

// event 表索引
export const eventDateIdx = index("idx_event_date").on(event.eventDate);
export const eventOrgIdx = index("idx_event_org_uuid").on(event.orgUuid);

// emergency_access 表索引
export const emergencyGrantorIdx = index("idx_emergency_grantor").on(emergencyAccess.grantorUuid);
export const emergencyGranteeIdx = index("idx_emergency_grantee").on(emergencyAccess.granteeUuid);
export const emergencyStatusIdx = index("idx_emergency_status").on(emergencyAccess.status);

// twofactor 表索引
export const twofactorUserIdx = index("idx_twofactor_user").on(twofactor.userUuid);
```

## Drizzle Relations 定义

```typescript
// src/server/db/schema/relations.ts
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  ciphers: many(ciphers),
  devices: many(devices),
  folders: many(folders),
  sends: many(sends),
  memberships: many(usersOrganizations),
  collections: many(usersCollections),
  favorites: many(favorites),
  twofactors: many(twofactor),
  emergencyAccessGranted: many(emergencyAccess, { relationName: "grantor" }),
  authRequests: many(authRequests),
}));

export const ciphersRelations = relations(ciphers, ({ one, many }) => ({
  user: one(users, { fields: [ciphers.userUuid], references: [users.uuid] }),
  organization: one(organizations, { fields: [ciphers.organizationUuid], references: [organizations.uuid] }),
  attachments: many(attachments),
  collections: many(ciphersCollections),
  folders: many(foldersCiphers),
  favorites: many(favorites),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(usersOrganizations),
  collections: many(collections),
  ciphers: many(ciphers),
  groups: many(groups),
  policies: many(orgPolicies),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  organization: one(organizations, { fields: [collections.orgUuid], references: [organizations.uuid] }),
  users: many(usersCollections),
  ciphers: many(ciphersCollections),
  groups: many(collectionsGroups),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  organization: one(organizations, { fields: [groups.organizationsUuid], references: [organizations.uuid] }),
  users: many(groupsUsers),
  collections: many(collectionsGroups),
}));
```

## 迁移策略

### 初始迁移生成

```bash
npx drizzle-kit generate --name init
```

### 迁移应用

```bash
# 本地开发
npx wrangler d1 migrations apply honowarden-db --local

# 生产环境
npx wrangler d1 migrations apply honowarden-db --remote
```

### Drizzle 配置

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
```

### 从 Vaultwarden 迁移数据

对于从现有 Vaultwarden SQLite 数据库迁移的场景：

1. 导出 Vaultwarden SQLite 数据
2. 转换时间戳格式（Vaultwarden 使用 ISO 字符串，D1 使用 Unix 时间戳）
3. 转换 Binary 字段编码
4. 使用 `wrangler d1 execute` 批量导入

迁移脚本位于 `util/import-vaultwarden.ts`。

## 关键查询模式

### Cipher 访问控制查询

```typescript
// src/server/db/queries/cipher.queries.ts
async function findAccessibleCiphers(db: Database, userId: string) {
  // 1. 个人 Cipher
  const personal = await db.select()
    .from(ciphers)
    .where(eq(ciphers.userUuid, userId));

  // 2. 组织 Cipher (通过 membership + access_all 或 collection)
  const orgCiphers = await db.select()
    .from(ciphers)
    .innerJoin(usersOrganizations, eq(ciphers.organizationUuid, usersOrganizations.orgUuid))
    .where(and(
      eq(usersOrganizations.userUuid, userId),
      eq(usersOrganizations.status, 2),  // Confirmed
    ));

  return [...personal, ...orgCiphers];
}
```

### 全量同步查询

```typescript
// src/server/db/queries/sync.queries.ts
async function getSyncData(db: Database, userId: string) {
  const [user, userCiphers, folders, collections, sends, policies] = await Promise.all([
    db.select().from(users).where(eq(users.uuid, userId)).get(),
    findAccessibleCiphers(db, userId),
    db.select().from(folders).where(eq(folders.userUuid, userId)),
    findAccessibleCollections(db, userId),
    db.select().from(sends).where(eq(sends.userUuid, userId)),
    findApplicablePolicies(db, userId),
  ]);

  return { user, ciphers: userCiphers, folders, collections, sends, policies };
}
```

## 枚举常量

```typescript
// src/server/db/schema/enums.ts

export const CipherType = {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
} as const;

export const MembershipType = {
  Owner: 0,
  Admin: 1,
  User: 2,
  Manager: 3,
} as const;

export const MembershipStatus = {
  Revoked: -1,
  Invited: 0,
  Accepted: 1,
  Confirmed: 2,
} as const;

export const SendType = {
  Text: 0,
  File: 1,
} as const;

export const EmergencyAccessType = {
  View: 0,
  Takeover: 1,
} as const;

export const EmergencyAccessStatus = {
  Invited: 0,
  Accepted: 1,
  Confirmed: 2,
  RecoveryInitiated: 3,
  RecoveryApproved: 4,
} as const;

export const TwoFactorType = {
  Authenticator: 0,
  Email: 1,
  Duo: 2,
  YubiKey: 3,
  Remember: 5,
  WebAuthn: 7,
} as const;

export const OrgPolicyType = {
  TwoFactorAuthentication: 0,
  MasterPassword: 1,
  PasswordGenerator: 2,
  SingleOrg: 3,
  RequireSSO: 4,
  PersonalOwnership: 5,
  DisableSend: 6,
  SendOptions: 7,
  ResetPassword: 8,
} as const;

export const KdfType = {
  PBKDF2_SHA256: 0,
  Argon2id: 1,
} as const;
```
