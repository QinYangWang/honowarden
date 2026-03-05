# 配置系统设计

## 概述

Vaultwarden 使用三层配置优先级：环境变量 < config.json < Admin 面板。HonoWarden 映射为：

| 层级 | Vaultwarden | HonoWarden | 优先级 |
|------|-------------|-----------|--------|
| 1 (最低) | 环境变量 | Workers env / Secrets | 低 |
| 2 | config.json | KV (`CONFIG` namespace) | 中 |
| 3 (最高) | Admin 面板写入 | Admin API -> KV 写入 | 高 |

## 配置架构

```mermaid
graph TD
    Env[Workers Env / Secrets<br/>wrangler.toml / Dashboard] -->|defaults| Resolver
    KV[KV CONFIG Namespace<br/>Admin 面板写入] -->|overrides| Resolver
    Resolver[Config Resolver] --> App[Application Code]

    Admin[Admin Panel] -->|POST /admin/config| API[Admin API]
    API -->|write| KV
```

## 配置分类

### Secrets (Workers Secrets)

敏感配置通过 Workers Secrets 管理，不会出现在代码或 KV 中：

| Secret | 描述 | 必填 |
|--------|------|------|
| `RSA_PRIVATE_KEY` | JWT 签名 RSA 私钥 (PEM) | 是 |
| `ADMIN_TOKEN` | Admin 面板密码 (建议 Argon2 PHC) | 是 |
| `RESEND_API_KEY` | Resend API 密钥 | 是 |
| `DUO_IKEY` | Duo Integration Key | 否 |
| `DUO_SKEY` | Duo Secret Key | 否 |
| `PUSH_INSTALLATION_ID` | Bitwarden Push Relay ID | 否 |
| `PUSH_INSTALLATION_KEY` | Bitwarden Push Relay Key | 否 |
| `YUBICO_CLIENT_ID` | YubiCloud Client ID | 否 |
| `YUBICO_SECRET_KEY` | YubiCloud Secret Key | 否 |

```bash
# 设置 Secret
npx wrangler secret put RSA_PRIVATE_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY
```

### 静态配置 (wrangler.toml / env)

不需要运行时修改的配置：

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `DOMAIN` | string | - | 服务域名 (如 `https://vault.example.com`) |

### 动态配置 (KV)

可通过 Admin 面板运行时修改的配置，存储在 KV `CONFIG` namespace：

#### 通用设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:domain` | string | env.DOMAIN | 服务域名 |
| `config:signups_allowed` | boolean | `true` | 允许注册 |
| `config:signups_verify` | boolean | `false` | 注册需邮箱验证 |
| `config:signups_domains_whitelist` | string | `""` | 注册白名单域名 |
| `config:invitations_allowed` | boolean | `true` | 允许邀请 |
| `config:show_password_hint` | boolean | `true` | 显示密码提示 |
| `config:password_hints_allowed` | boolean | `true` | 允许密码提示 |

#### 邮件设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:mail_enabled` | boolean | `true` | 启用邮件 |
| `config:smtp_from` | string | `""` | 发件人地址 |
| `config:smtp_from_name` | string | `"HonoWarden"` | 发件人名称 |

#### 2FA 设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:authenticator_enabled` | boolean | `true` | 启用 TOTP |
| `config:email_2fa_enabled` | boolean | `true` | 启用 Email 2FA |
| `config:duo_enabled` | boolean | `false` | 启用 Duo |
| `config:duo_host` | string | `""` | Duo API hostname |
| `config:yubikey_enabled` | boolean | `false` | 启用 YubiKey |
| `config:webauthn_enabled` | boolean | `true` | 启用 WebAuthn |

#### 组织设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:org_creation_users` | string | `""` | 可创建组织的用户 (空=所有) |
| `config:org_groups_enabled` | boolean | `false` | 启用组织分组 |
| `config:org_events_enabled` | boolean | `false` | 启用事件日志 |

#### 高级设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:trash_auto_delete_days` | number | `30` | 回收站自动删除天数 |
| `config:events_days_retain` | number | `365` | 事件日志保留天数 |
| `config:emergency_access_allowed` | boolean | `true` | 启用紧急访问 |
| `config:sends_allowed` | boolean | `true` | 启用 Send |
| `config:hibp_api_key` | string | `""` | HIBP API Key |
| `config:icon_service` | string | `"internal"` | 图标服务模式 |
| `config:icon_download_enabled` | boolean | `true` | 允许下载图标 |
| `config:disable_icon_download` | boolean | `false` | 禁用图标下载 |
| `config:icon_cache_ttl` | number | `2592000` | 图标缓存 TTL (秒) |
| `config:icon_cache_negttl` | number | `259200` | 图标负缓存 TTL (秒) |

#### Push 通知

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:push_enabled` | boolean | `false` | 启用 Push 通知 |
| `config:push_relay_uri` | string | `"https://push.bitwarden.com"` | Push Relay URL |

#### SSO 设置

| Key | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `config:sso_enabled` | boolean | `false` | 启用 SSO |
| `config:sso_authority` | string | `""` | OIDC Authority URL |
| `config:sso_client_id` | string | `""` | OIDC Client ID |
| `config:sso_client_secret` | string | `""` | OIDC Client Secret |

## 配置读取服务

```typescript
// src/server/services/config.service.ts

const DEFAULTS: Record<string, unknown> = {
  "signups_allowed": true,
  "signups_verify": false,
  "signups_domains_whitelist": "",
  "invitations_allowed": true,
  "show_password_hint": true,
  "password_hints_allowed": true,
  "mail_enabled": true,
  "smtp_from": "",
  "smtp_from_name": "HonoWarden",
  "authenticator_enabled": true,
  "email_2fa_enabled": true,
  "duo_enabled": false,
  "yubikey_enabled": false,
  "webauthn_enabled": true,
  "org_creation_users": "",
  "org_groups_enabled": false,
  "org_events_enabled": false,
  "trash_auto_delete_days": 30,
  "events_days_retain": 365,
  "emergency_access_allowed": true,
  "sends_allowed": true,
  "icon_service": "internal",
  "icon_download_enabled": true,
  "icon_cache_ttl": 2592000,
  "icon_cache_negttl": 259200,
  "push_enabled": false,
  "push_relay_uri": "https://push.bitwarden.com",
  "sso_enabled": false,
};

export async function getConfig<T = string>(
  env: Env,
  key: string,
  fallback?: T
): Promise<T> {
  // 1. Try KV override
  const kvValue = await env.CONFIG.get(`config:${key}`);
  if (kvValue !== null) {
    try {
      return JSON.parse(kvValue) as T;
    } catch {
      return kvValue as unknown as T;
    }
  }

  // 2. Try env binding (uppercase, underscored)
  const envKey = key.toUpperCase();
  const envValue = (env as Record<string, unknown>)[envKey];
  if (envValue !== undefined) {
    return envValue as T;
  }

  // 3. Return default or fallback
  if (fallback !== undefined) return fallback;
  return DEFAULTS[key] as T;
}

export async function setConfig(
  env: Env,
  key: string,
  value: unknown
): Promise<void> {
  await env.CONFIG.put(`config:${key}`, JSON.stringify(value));
}

export async function deleteConfig(env: Env, key: string): Promise<void> {
  await env.CONFIG.delete(`config:${key}`);
}

export async function getAllConfig(env: Env): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  // Load defaults
  for (const [key, value] of Object.entries(DEFAULTS)) {
    result[key] = value;
  }

  // Load KV overrides
  const list = await env.CONFIG.list({ prefix: "config:" });
  for (const key of list.keys) {
    const name = key.name.replace("config:", "");
    const value = await env.CONFIG.get(key.name);
    if (value !== null) {
      try {
        result[name] = JSON.parse(value);
      } catch {
        result[name] = value;
      }
    }
  }

  return result;
}

export async function resetAllConfig(env: Env): Promise<void> {
  const list = await env.CONFIG.list({ prefix: "config:" });
  for (const key of list.keys) {
    await env.CONFIG.delete(key.name);
  }
}
```

## Admin 面板配置管理

### 保存配置

```typescript
// POST /admin/config
adminRoutes.post("/config", adminGuard, async (c) => {
  const body = await c.req.json() as Record<string, unknown>;

  for (const [key, value] of Object.entries(body)) {
    await setConfig(c.env, key, value);
  }

  return c.json({ success: true });
});
```

### 重置配置

```typescript
// DELETE /admin/config
adminRoutes.delete("/config", adminGuard, async (c) => {
  await resetAllConfig(c.env);
  return c.json({ success: true });
});
```

### 获取当前配置

```typescript
// GET /admin/config
adminRoutes.get("/config", adminGuard, async (c) => {
  const config = await getAllConfig(c.env);
  return c.json(config);
});
```

## /api/config 公开端点

返回客户端需要的服务器配置：

```typescript
// GET /api/config (no auth)
coreRoutes.get("/config", async (c) => {
  const domain = c.env.DOMAIN;
  const signupsAllowed = await getConfig(c.env, "signups_allowed", true);
  const ssoEnabled = await getConfig(c.env, "sso_enabled", false);

  return c.json({
    version: "2025.1.0",
    gitHash: "",
    server: { name: "HonoWarden", url: "https://github.com/honowarden" },
    environment: {
      vault: domain,
      api: `${domain}/api`,
      identity: `${domain}/identity`,
      notifications: `${domain}/notifications`,
      sso: ssoEnabled ? `${domain}/identity` : "",
    },
    featureStates: {
      "autofill-v2": true,
      "fido2-vault-credentials": true,
    },
    object: "config",
  });
});
```

## 配置验证

```typescript
// src/server/services/config.service.ts

const CONFIG_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  "trash_auto_delete_days": (v) => typeof v === "number" && v >= 0 && v <= 365,
  "events_days_retain": (v) => typeof v === "number" && v >= 0,
  "icon_cache_ttl": (v) => typeof v === "number" && v >= 0,
  "icon_cache_negttl": (v) => typeof v === "number" && v >= 0,
  "signups_allowed": (v) => typeof v === "boolean",
  "signups_verify": (v) => typeof v === "boolean",
  "mail_enabled": (v) => typeof v === "boolean",
  "push_enabled": (v) => typeof v === "boolean",
  "sso_enabled": (v) => typeof v === "boolean",
};

export function validateConfig(key: string, value: unknown): boolean {
  const validator = CONFIG_VALIDATORS[key];
  if (!validator) return true;
  return validator(value);
}
```

## 本地开发配置

### .dev.vars

```env
# .dev.vars - Cloudflare local dev secrets
RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
ADMIN_TOKEN="$argon2id$v=19$m=65540,t=3,p=4$..."
RESEND_API_KEY="re_..."
DOMAIN="http://localhost:8787"
```

### wrangler.toml (开发环境变量)

```toml
[vars]
DOMAIN = "http://localhost:8787"

[env.production.vars]
DOMAIN = "https://vault.example.com"
```

## 与 Vaultwarden 配置的差异

| 方面 | Vaultwarden | HonoWarden |
|------|-------------|-----------|
| 数据库 URL | `DATABASE_URL` | D1 binding (无需配置) |
| 数据目录 | `DATA_FOLDER` | R2 binding (无需路径) |
| SMTP 配置 | `SMTP_HOST`, `SMTP_PORT`, etc. | `RESEND_API_KEY` |
| RSA 密钥路径 | `RSA_KEY_FILENAME` | Workers Secret |
| WebSocket | `WEBSOCKET_ENABLED` | Durable Objects (始终启用) |
| 日志级别 | `LOG_LEVEL`, `LOG_FILE` | Cloudflare Workers Logs |
| 端口/绑定 | `ROCKET_PORT`, `ROCKET_ADDRESS` | Workers 自动管理 |
| HTTPS | `ROCKET_TLS` | Cloudflare 自动管理 |
| 反向代理 | `IP_HEADER` | Cloudflare `CF-Connecting-IP` |

移除的配置项（由 Cloudflare 平台自动处理）：
- `DATABASE_URL` - D1 binding
- `DATA_FOLDER`, `ATTACHMENTS_FOLDER`, `SENDS_FOLDER` - R2 binding
- `ROCKET_*` - 不需要
- `IP_HEADER` - Cloudflare 自动提供
- `WEBSOCKET_ENABLED` - 始终通过 DO 启用
- `SMTP_HOST/PORT/SECURITY/AUTH` - 被 Resend API 替代
- `JOB_POLL_INTERVAL_MS` - 被 Cron Triggers 替代
