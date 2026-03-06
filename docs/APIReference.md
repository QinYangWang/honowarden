# API 参考

## 概述

HonoWarden 实现完整的 Bitwarden Server API，分为以下路由组：

| 路由组 | 路径前缀 | 功能 |
|--------|---------|------|
| Identity | `/identity/`, `/connect/` | 认证、注册、预认证 |
| Core | `/api/` | 密码库、账户、组织、Send、2FA |
| Admin | `/admin/` | 管理面板 |
| Icons | `/icons/` | 网站图标 |
| Notifications | `/notifications/` | WebSocket 实时通信 |
| Web | `/` | Web Vault 静态资源 |

## 通用约定

### 认证

- **Bearer Token**: `Authorization: Bearer <JWT>` 用于大多数 API
- **Admin Cookie**: `VW_ADMIN` cookie 用于 Admin 面板
- **Public**: 部分端点无需认证

### 响应格式

**成功 (列表)**:
```json
{
  "data": [...],
  "object": "list",
  "continuationToken": null
}
```

**成功 (单对象)**:
```json
{
  "id": "uuid",
  "object": "cipher",
  ...
}
```

**错误**:
```json
{
  "error": "invalid_grant",
  "error_description": "Two factor required.",
  "TwoFactorProviders": [0, 1],
  "TwoFactorProviders2": { "0": null, "1": { "Email": "ex***@example.com" } }
}
```

---

## 1. Identity API

### POST /identity/connect/token

主认证端点，支持多种 Grant Type。

**Content-Type**: `application/x-www-form-urlencoded`

#### Grant: password

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| grant_type | string | Y | `password` |
| username | string | Y | 用户邮箱 |
| password | string | Y | Master Password Hash |
| scope | string | Y | `api offline_access` |
| client_id | string | Y | `web`, `browser`, `desktop`, `mobile`, `cli` |
| deviceType | integer | Y | 设备类型编号 |
| deviceIdentifier | string | Y | 设备唯一标识 |
| deviceName | string | Y | 设备名称 |
| twoFactorToken | string | N | 2FA 验证码 |
| twoFactorProvider | integer | N | 2FA Provider ID |
| twoFactorRemember | integer | N | `1` 记住设备 |

**成功响应** (200):
```json
{
  "access_token": "eyJ...",
  "refresh_token": "base64url...",
  "expires_in": 7200,
  "token_type": "Bearer",
  "scope": "api offline_access",
  "Key": "<encrypted_user_key>",
  "PrivateKey": "<encrypted_private_key>",
  "Kdf": 0,
  "KdfIterations": 600000,
  "KdfMemory": null,
  "KdfParallelism": null,
  "MasterPasswordPolicy": {},
  "ForcePasswordReset": false,
  "ResetMasterPassword": false,
  "UserDecryptionOptions": {}
}
```

#### Grant: refresh_token

| 参数 | 类型 | 必填 |
|------|------|------|
| grant_type | string | Y | `refresh_token` |
| refresh_token | string | Y | Refresh Token |
| client_id | string | Y | 客户端标识 |

#### Grant: client_credentials

| 参数 | 类型 | 必填 |
|------|------|------|
| grant_type | string | Y | `client_credentials` |
| client_id | string | Y | `organization.{org_uuid}` |
| client_secret | string | Y | Org API Key |
| scope | string | Y | `api.organization` |

#### Grant: authorization_code (SSO)

| 参数 | 类型 | 必填 |
|------|------|------|
| grant_type | string | Y | `authorization_code` |
| code | string | Y | SSO authorization code |
| code_verifier | string | Y | PKCE code verifier |
| device_* | string | Y | 设备信息 |

### POST /identity/accounts/prelogin

获取用户的 KDF 参数（无需认证）。

**请求**:
```json
{ "email": "user@example.com" }
```

**响应**:
```json
{
  "kdf": 0,
  "kdfIterations": 600000,
  "kdfMemory": null,
  "kdfParallelism": null
}
```

### POST /identity/accounts/register

注册新用户。

**请求**:
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "masterPasswordHash": "base64...",
  "masterPasswordHint": "optional hint",
  "key": "<encrypted_user_key>",
  "kdf": 0,
  "kdfIterations": 600000,
  "keys": {
    "publicKey": "<base64_public_key>",
    "encryptedPrivateKey": "<encrypted_private_key>"
  }
}
```

### POST /identity/accounts/register/send-verification-email

发送注册验证邮件。

### POST /identity/accounts/register/finish

使用验证 Token 完成注册。

### GET /identity/connect/authorize

SSO 授权入口（重定向到 IdP）。

### GET /identity/oidcsignin

SSO 回调端点。

---

## 2. Accounts API

所有端点需要 `Authorization: Bearer <JWT>`（除特别标注外）。

### 账户信息

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/accounts/profile` | Bearer | 获取用户 Profile |
| PUT | `/api/accounts/profile` | Bearer | 更新用户名 |
| PUT | `/api/accounts/avatar` | Bearer | 更新头像颜色 |
| GET | `/api/accounts/revision-date` | Bearer | 获取同步修订时间戳 |
| GET | `/users/{id}/public-key` | Bearer | 获取用户公钥 |

### 密码与密钥

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/password` | Bearer | 修改主密码 |
| POST | `/api/accounts/kdf` | Bearer | 修改 KDF 参数 |
| POST | `/api/accounts/keys` | Bearer | 设置加密密钥对 |
| POST | `/api/accounts/key-management/rotate-user-account-keys` | Bearer | 密钥轮换 |
| POST | `/api/accounts/security-stamp` | Bearer | 重置安全戳 |
| POST | `/api/accounts/set-password` | Bearer | 设置密码 (SSO/Invite) |

### 邮箱管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/email-token` | Bearer | 请求邮箱变更 Token |
| POST | `/api/accounts/email` | Bearer | 执行邮箱变更 |
| POST | `/api/accounts/verify-email` | Bearer | 请求邮箱验证 |
| POST | `/api/accounts/verify-email-token` | None | 验证邮箱 Token |

### 账户删除

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/delete-recover` | None | 请求删除恢复 Token |
| POST | `/api/accounts/delete` | Bearer | 删除账户 |

### 设备管理

| 方法 | 路径 | 认证 | 描述 | 实现 |
|------|------|------|------|------|
| GET | `/api/devices` | Bearer | 列出所有设备 | ✓ |
| GET | `/api/devices/{id}` | Bearer | 获取设备详情 | ✓ |
| GET | `/api/devices/knowndevice` | Bearer | 检查已知设备（Login with Device 流程） | ✓ |
| PUT | `/api/devices/{id}/token` | Bearer | 注册 Push Token | 待实现 |
| PUT | `/api/devices/{id}/clear-token` | Bearer | 清除 Push Token | 待实现 |

> `/api/accounts/devices` 仍保留，与 `/api/devices` 返回相同数据。

### API Key

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/api-key` | Bearer | 获取 API Key |
| POST | `/api/accounts/rotate-api-key` | Bearer | 轮换 API Key |

### Auth Requests (无密码登录)

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/auth-request` | Bearer | 创建认证请求 |
| GET | `/api/accounts/auth-request/{id}` | Bearer | 查询请求状态 |
| PUT | `/api/accounts/auth-request/{id}` | Bearer | 批准/拒绝请求 |
| GET | `/api/accounts/auth-requests/pending` | Bearer | 获取待处理请求 |

### 其他

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/accounts/prelogin` | None | KDF 参数 |
| POST | `/api/accounts/verify-password` | Bearer | 验证当前密码 |
| GET | `/api/accounts/password-hint` | None | 密码提示 (可配置) |

---

## 3. Vault API

### 全量同步

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/sync` | Bearer | 全量 Vault 同步 |

**Sync 响应结构**:
```json
{
  "object": "sync",
  "profile": { /* user profile */ },
  "folders": [ /* folders */ ],
  "collections": [ /* accessible collections */ ],
  "ciphers": [ /* accessible ciphers */ ],
  "domains": { /* equivalent domains */ },
  "policies": [ /* applicable policies */ ],
  "sends": [ /* user's sends */ ]
}
```

### Cipher CRUD

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/ciphers` | Bearer | 列出所有可访问 Cipher |
| GET | `/api/ciphers/{id}` | Bearer | 获取单个 Cipher |
| POST | `/api/ciphers` | Bearer | 创建个人 Cipher |
| POST | `/api/ciphers/create` | Bearer | 创建 Cipher (支持组织) |
| PUT | `/api/ciphers/{id}` | Bearer | 更新 Cipher |
| PUT | `/api/ciphers/{id}/partial` | Bearer | 更新文件夹/收藏 |
| DELETE | `/api/ciphers/{id}` | Bearer | 软删除 (移入回收站) |
| PUT | `/api/ciphers/{id}/delete` | Bearer | 软删除 (别名) |
| PUT | `/api/ciphers/{id}/restore` | Bearer | 从回收站恢复 |
| DELETE | `/api/ciphers/{id}/admin` | Bearer | 硬删除 |
| POST | `/api/ciphers/import` | Bearer | 批量导入 |
| PUT | `/api/ciphers/{id}/share` | Bearer | 共享到组织 |
| POST | `/api/ciphers/{id}/collections` | Bearer | 更新所属集合 |
| PUT | `/api/ciphers/move` | Bearer | 批量移动文件夹 |
| PUT | `/api/ciphers/delete` | Bearer | 批量软删除 |
| PUT | `/api/ciphers/restore` | Bearer | 批量恢复 |

**Cipher 请求体**:
```json
{
  "type": 1,
  "name": "2.encrypted...",
  "notes": "2.encrypted...",
  "favorite": false,
  "folderId": null,
  "organizationId": null,
  "login": {
    "uri": "2.encrypted...",
    "uris": [{ "uri": "2.encrypted...", "match": null }],
    "username": "2.encrypted...",
    "password": "2.encrypted...",
    "totp": "2.encrypted..."
  },
  "fields": [{ "name": "2.encrypted...", "value": "2.encrypted...", "type": 0 }],
  "passwordHistory": [{ "password": "2.encrypted...", "lastUsedDate": "2025-..." }],
  "lastKnownRevisionDate": "2025-01-01T00:00:00.000Z"
}
```

### Attachment

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/ciphers/{id}/attachment/v2` | Bearer | 创建附件记录 |
| POST | `/api/ciphers/{id}/attachment/{attId}` | Bearer | 上传附件数据到 R2 |
| GET | `/api/ciphers/{id}/attachment/{attId}` | Bearer | 获取附件下载 URL |
| DELETE | `/api/ciphers/{id}/attachment/{attId}` | Bearer | 删除附件 |

### Folder

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/folders` | Bearer | 列出文件夹 |
| GET | `/api/folders/{id}` | Bearer | 获取文件夹 |
| POST | `/api/folders` | Bearer | 创建文件夹 |
| PUT | `/api/folders/{id}` | Bearer | 更新文件夹 |
| DELETE | `/api/folders/{id}` | Bearer | 删除文件夹 |

---

## 4. Organizations API

### 组织 CRUD

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/organizations/{orgId}` | OrgMember | 获取组织信息 |
| POST | `/api/organizations` | Bearer | 创建组织 |
| PUT | `/api/organizations/{orgId}` | OrgAdmin | 更新组织 |
| DELETE | `/api/organizations/{orgId}` | OrgOwner | 删除组织 |
| POST | `/api/organizations/{orgId}/leave` | Bearer | 离开组织 |

### 成员管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/organizations/{orgId}/users` | OrgMember | 列出成员 |
| GET | `/api/organizations/{orgId}/users/{memberId}` | OrgAdmin | 获取成员详情 |
| POST | `/api/organizations/{orgId}/users/invite` | OrgAdmin | 邀请成员 |
| POST | `/api/organizations/{orgId}/users/{memberId}/accept` | Bearer | 接受邀请 |
| POST | `/api/organizations/{orgId}/users/{memberId}/confirm` | OrgAdmin | 确认成员 |
| PUT | `/api/organizations/{orgId}/users/{memberId}` | OrgAdmin | 编辑成员角色 |
| DELETE | `/api/organizations/{orgId}/users/{memberId}` | OrgAdmin | 移除成员 |
| PUT | `/api/organizations/{orgId}/users/{memberId}/deactivate` | OrgAdmin | 停用成员 |
| PUT | `/api/organizations/{orgId}/users/{memberId}/activate` | OrgAdmin | 激活成员 |

### 集合管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/organizations/{orgId}/collections` | OrgMember | 列出集合 |
| GET | `/api/organizations/{orgId}/collections/{colId}` | OrgMember | 获取集合 |
| POST | `/api/organizations/{orgId}/collections` | OrgManager | 创建集合 |
| PUT | `/api/organizations/{orgId}/collections/{colId}` | OrgManager | 更新集合 |
| DELETE | `/api/organizations/{orgId}/collections/{colId}` | OrgManager | 删除集合 |
| POST | `/api/organizations/{orgId}/collections/bulk-access` | OrgAdmin | 批量更新权限 |

### 分组管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/organizations/{orgId}/groups` | OrgMember | 列出分组 |
| GET | `/api/organizations/{orgId}/groups/{groupId}` | OrgAdmin | 获取分组 |
| POST | `/api/organizations/{orgId}/groups` | OrgAdmin | 创建分组 |
| PUT | `/api/organizations/{orgId}/groups/{groupId}` | OrgAdmin | 更新分组 |
| DELETE | `/api/organizations/{orgId}/groups/{groupId}` | OrgAdmin | 删除分组 |
| GET | `/api/organizations/{orgId}/groups/{groupId}/users` | OrgAdmin | 分组成员 |

### 策略管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/organizations/{orgId}/policies` | OrgMember | 列出策略 |
| GET | `/api/policies` | Bearer | 当前用户适用的策略 |
| PUT | `/api/organizations/{orgId}/policies/{type}` | OrgAdmin | 更新策略 |

---

## 5. Sends API

### 管理端点 (需认证)

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/sends` | Bearer | 列出 Send |
| GET | `/api/sends/{id}` | Bearer | 获取 Send |
| POST | `/api/sends` | Bearer | 创建文本 Send |
| POST | `/api/sends/file/v2` | Bearer | 创建文件 Send |
| POST | `/api/sends/{id}/file/{fileId}` | Bearer | 上传 Send 文件到 R2 |
| PUT | `/api/sends/{id}` | Bearer | 更新 Send |
| DELETE | `/api/sends/{id}` | Bearer | 删除 Send |
| PUT | `/api/sends/{id}/remove-password` | Bearer | 移除 Send 密码 |

### 公开访问端点 (无需认证)

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/sends/access/{accessId}` | None | 访问文本 Send |
| POST | `/api/sends/{id}/access/file/{fileId}` | None | 获取文件 Send 下载 URL |
| GET | `/api/sends/{id}/{fileId}` | None | 下载 Send 文件 |

**创建 Send 请求**:
```json
{
  "type": 0,
  "name": "2.encrypted...",
  "key": "2.encrypted...",
  "text": { "text": "2.encrypted...", "hidden": false },
  "deletionDate": "2025-02-15T00:00:00.000Z",
  "expirationDate": "2025-02-07T00:00:00.000Z",
  "maxAccessCount": 10,
  "password": "optional_password",
  "hideEmail": true,
  "disabled": false
}
```

---

## 6. Two-Factor Authentication API

### 通用

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/two-factor` | Bearer | 列出已启用 2FA 方法 |
| POST | `/api/two-factor/get-recover` | Bearer | 获取恢复码 |
| POST | `/api/two-factor/recover` | None | 使用恢复码禁用所有 2FA |
| POST | `/api/two-factor/disable` | Bearer | 禁用指定 2FA 方法 |

### Authenticator (TOTP)

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/two-factor/get-authenticator` | Bearer | 获取/生成 TOTP Secret |
| POST | `/api/two-factor/authenticator` | Bearer | 启用 TOTP (需验证码) |

### Email

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/two-factor/get-email` | Bearer | 获取 Email 2FA 配置 |
| POST | `/api/two-factor/send-email` | Bearer | 发送验证码 (设置阶段) |
| PUT | `/api/two-factor/email` | Bearer | 完成 Email 2FA 设置 |
| POST | `/api/two-factor/send-email-login` | None | 发送登录验证码 |

### Duo

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/two-factor/get-duo` | Bearer | 获取 Duo 配置 |
| POST | `/api/two-factor/duo` | Bearer | 启用 Duo |

### YubiKey

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/two-factor/get-yubikey` | Bearer | 获取 YubiKey 配置 |
| POST | `/api/two-factor/yubikey` | Bearer | 启用/更新 YubiKey |

### WebAuthn

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/two-factor/get-webauthn` | Bearer | 获取已注册密钥 |
| POST | `/api/two-factor/webauthn` | Bearer | 注册新密钥 |
| PUT | `/api/two-factor/webauthn` | Bearer | 启用 WebAuthn |
| DELETE | `/api/two-factor/webauthn` | Bearer | 删除密钥 |

---

## 7. Emergency Access API

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/api/emergency-access/trusted` | Bearer | 列出信任的联系人 (授权人视角) |
| GET | `/api/emergency-access/granted` | Bearer | 列出有权访问的账户 (被授权人视角) |
| GET | `/api/emergency-access/{id}` | Bearer | 获取紧急访问详情 |
| POST | `/api/emergency-access/invite` | Bearer | 邀请紧急联系人 |
| PUT | `/api/emergency-access/{id}` | Bearer | 更新紧急访问 |
| DELETE | `/api/emergency-access/{id}` | Bearer | 删除紧急访问 |
| POST | `/api/emergency-access/{id}/reinvite` | Bearer | 重新发送邀请 |
| POST | `/api/emergency-access/{id}/accept` | Bearer | 接受邀请 |
| POST | `/api/emergency-access/{id}/confirm` | Bearer | 确认并提供密钥 |
| POST | `/api/emergency-access/{id}/initiate` | Bearer | 发起恢复请求 |
| POST | `/api/emergency-access/{id}/approve` | Bearer | 批准恢复 |
| POST | `/api/emergency-access/{id}/reject` | Bearer | 拒绝恢复 |
| POST | `/api/emergency-access/{id}/view` | Bearer | 查看 Vault (View 类型) |
| POST | `/api/emergency-access/{id}/takeover` | Bearer | 接管账户 (Takeover 类型) |
| POST | `/api/emergency-access/{id}/password` | Bearer | 重置密码 (Takeover) |
| GET | `/api/emergency-access/{id}/policies` | Bearer | 获取适用策略 |

---

## 8. Admin API

### 认证

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/admin` | None | Admin 登录 (表单) |
| GET | `/admin/logout` | Admin | 登出 |

### 用户管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/admin/users` | Admin | 列出所有用户 (JSON) |
| GET | `/admin/users/{id}` | Admin | 获取用户详情 |
| GET | `/admin/users/by-mail/{mail}` | Admin | 按邮箱查找 |
| GET | `/admin/users/overview` | Admin | 用户概览页面 (HTML) |
| POST | `/admin/users/{id}/delete` | Admin | 删除用户 |
| POST | `/admin/users/{id}/disable` | Admin | 禁用用户 |
| POST | `/admin/users/{id}/enable` | Admin | 启用用户 |
| POST | `/admin/users/{id}/deauth` | Admin | 注销所有设备 |
| POST | `/admin/users/{id}/remove-2fa` | Admin | 移除 2FA |

### 组织管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/admin/organizations/overview` | Admin | 组织概览 |
| POST | `/admin/organizations/{id}/delete` | Admin | 删除组织 |

### 配置管理

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/admin/config` | Admin | 保存配置到 KV |
| DELETE | `/admin/config` | Admin | 重置配置 |

### 其他

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| POST | `/admin/invite` | Admin | 邀请用户 |
| POST | `/admin/test/smtp` | Admin | 测试邮件发送 |
| POST | `/admin/users/org_type` | Admin | 更新成员类型 |
| GET | `/admin/diagnostics` | Admin | 系统诊断页面 |
| GET | `/admin/diagnostics/config` | Admin | 诊断配置 |

---

## 9. Icons API

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/icons/{domain}/icon.png` | Bearer | 获取网站图标 |

---

## 10. Notifications API

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | `/notifications/hub` | Bearer (query) | WebSocket 连接 (已认证) |
| GET | `/notifications/anonymous-hub/{token}` | Token | WebSocket 连接 (匿名 Auth Request) |

---

## 11. 公共端点 (无需认证)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/config` | 服务器配置 (功能开关、KDF 默认值) |
| GET | `/api/version` | 版本信息 |
| GET | `/api/alive` | 健康检查 |
| GET | `/api/settings/domains` | 等效域名配置 |
| POST | `/api/hibp/breach` | HIBP 泄露检查 |

---

## 12. Hono 路由实现示例

```typescript
// src/server/routes/core/ciphers.ts
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";

const ciphers = new Hono<{ Bindings: Env }>();

ciphers.use("*", authMiddleware);

ciphers.get("/", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const result = await findAccessibleCiphers(db, user.uuid);
  return c.json({ data: result.map(toCipherJson), object: "list", continuationToken: null });
});

ciphers.get("/:id", async (c) => {
  const { user } = c.get("auth");
  const db = createDb(c.env.DB);
  const cipher = await findCipherById(db, c.req.param("id"));

  if (!cipher || !isAccessibleToUser(cipher, user)) {
    return c.json({ error: "Cipher not found" }, 404);
  }

  return c.json(toCipherJson(cipher));
});

ciphers.post("/", async (c) => {
  const { user } = c.get("auth");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const cipher = await createCipher(db, user.uuid, body);

  // Notify connected clients
  const hub = c.env.USER_HUB.get(c.env.USER_HUB.idFromName(user.uuid));
  await hub.fetch(new Request("http://internal/notify", {
    method: "POST",
    body: JSON.stringify({ type: "SyncCipherCreate", cipher }),
  }));

  return c.json(toCipherJson(cipher));
});

export { ciphers };
```
