# HonoWarden

Bitwarden 兼容的密码管理服务器，基于 Cloudflare 无服务器架构的 TypeScript 实现。

HonoWarden 是 [Vaultwarden](https://github.com/dani-garcia/vaultwarden) 的无服务器重写版本，使用 Hono.js + Cloudflare Workers 技术栈，完整兼容 Bitwarden 官方客户端（桌面、移动、浏览器扩展、CLI）。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **Web 框架** | [Hono.js](https://hono.dev/) | 路由、中间件、请求处理 |
| **计算平台** | [Cloudflare Workers](https://developers.cloudflare.com/workers/) | 边缘无服务器计算 |
| **SQL 数据库** | [Cloudflare D1](https://developers.cloudflare.com/d1/) | 结构化数据存储 (SQLite) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | 类型安全的数据库操作 |
| **对象存储** | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 附件、文件、图标缓存 |
| **KV 存储** | [Cloudflare KV](https://developers.cloudflare.com/kv/) | 配置缓存、速率限制、会话 |
| **实时通信** | [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) | WebSocket、有状态连接管理 |
| **邮件服务** | [Resend](https://resend.com/) | 事务性邮件发送 |
| **邮件模板** | [React Email](https://react.email/) | TypeScript/React 邮件模板 |
| **前端框架** | [React](https://react.dev/) + [Vite](https://vite.dev/) | Admin 面板 |
| **UI 组件** | [COSS UI](https://coss.com/ui/docs) | 现代化组件库 |

## 核心特性

- **完整 Bitwarden API 兼容** - 支持所有官方客户端
- **零知识架构** - 服务器无法解密用户数据
- **全球边缘部署** - Cloudflare 全球网络，低延迟
- **无服务器** - 无需管理服务器，按需计费
- **实时同步** - 基于 Durable Objects 的 WebSocket 推送
- **完整 2FA** - TOTP、Email、Duo、YubiKey、WebAuthn
- **组织管理** - 团队密码共享与权限控制
- **Emergency Access** - 紧急访问与账户恢复
- **Bitwarden Send** - 安全的临时内容分享
- **Admin 面板** - 基于 React 的管理界面

## 快速开始

### 本地开发

```bash
# 安装依赖（自动从模板生成 wrangler.json）
npm install

# 生成 RSA 密钥和 Admin Token → .dev.vars
npm run generate-keys

# 生成数据库迁移 SQL（仅首次或 schema 变更后需要）
npx drizzle-kit generate

# 应用迁移到本地 D1
npm run db:migrate:local

# 启动开发服务器
npm run dev
```

### 部署到 Cloudflare

部署前需配置 GitHub Secrets，详见下方 [Secrets 配置](#secrets-配置) 。

```bash
git push origin main   # CI 自动：test → provision → build → migrate → deploy
```

## Secrets 配置

### GitHub Actions Secrets（CI/CD 部署）

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret | 必需 | 说明 | 获取方式 |
|--------|------|------|----------|
| `CLOUDFLARE_API_TOKEN` | **是** | Cloudflare API 令牌 | [创建步骤](#1-创建-cloudflare-api-token) |
| `CLOUDFLARE_ACCOUNT_ID` | 推荐 | Cloudflare 账号 ID（单账号可省略，自动检测） | [获取步骤](#2-获取-cloudflare-account-id) |
| `DEPLOY_DOMAIN` | **是** | 生产域名 | 你的域名，如 `https://vault.example.com` |

#### 1. 创建 CLOUDFLARE_API_TOKEN

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击右上角头像 → **My Profile** → **API Tokens**
3. 点击 **Create Token**
4. 选择 **Create Custom Token**，配置以下权限：

| 权限范围 | 资源 | 权限 |
|----------|------|------|
| Account | Workers Scripts | Edit |
| Account | Workers KV Storage | Edit |
| Account | Workers R2 Storage | Edit |
| Account | D1 | Edit |
| Account | Workers Tail | Read |
| Account | Queues | Edit |
| Zone | DNS | Edit |

5. Zone Resources 选择 **All zones**（或指定你的域名）
6. 点击 **Continue to summary** → **Create Token**
7. **立即复制 Token**（仅显示一次），设置为 GitHub Secret `CLOUDFLARE_API_TOKEN`

#### 2. 获取 CLOUDFLARE_ACCOUNT_ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在 Account Home 页面，右侧边栏显示 **Account ID**
3. 复制该 ID，设置为 GitHub Secret `CLOUDFLARE_ACCOUNT_ID`

> 如果你的 API Token 只关联一个账号，此项可省略，脚本会自动检测。

### Cloudflare Worker Secrets（运行时）

部署后通过 `wrangler secret put` 设置，Worker 运行时读取：

| Secret | 必需 | 说明 | 获取方式 |
|--------|------|------|----------|
| `RSA_PRIVATE_KEY` | **是** | JWT 签名用的 RSA PKCS#8 私钥 | `npm run generate-keys` 后从 `.dev.vars` 复制 |
| `ADMIN_TOKEN` | **是** | Admin 面板登录令牌 | `npm run generate-keys` 后从 `.dev.vars` 复制 |
| `RESEND_API_KEY` | **是** | Resend 邮件服务 API Key | [Resend Dashboard](https://resend.com/api-keys) → Create API Key |
| `DUO_IKEY` | 可选 | Duo 2FA Integration Key | [Duo Admin Panel](https://admin.duosecurity.com/) |
| `DUO_SKEY` | 可选 | Duo 2FA Secret Key | 同上 |
| `DUO_HOST` | 可选 | Duo 2FA API Hostname | 同上 |
| `YUBICO_CLIENT_ID` | 可选 | YubiKey OTP Client ID | [Yubico API](https://upgrade.yubico.com/getapikey/) |
| `YUBICO_SECRET_KEY` | 可选 | YubiKey OTP Secret Key | 同上 |
| `PUSH_INSTALLATION_ID` | 可选 | Bitwarden Push Relay 安装 ID | Bitwarden 官方申请 |
| `PUSH_INSTALLATION_KEY` | 可选 | Bitwarden Push Relay 安装密钥 | 同上 |

```bash
# 设置必需 Secrets（从 .dev.vars 复制值，或手动输入）
npx wrangler secret put RSA_PRIVATE_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY
```

### 本地开发 Secrets（.dev.vars）

本地开发时密钥存储在 `.dev.vars` 文件中（已被 `.gitignore` 忽略）：

```bash
npm run generate-keys     # 自动生成 RSA_PRIVATE_KEY + ADMIN_TOKEN → .dev.vars
```

## 设计文档索引

| 文档 | 描述 |
|------|------|
| [Architecture.md](docs/Architecture.md) | 系统架构设计、服务映射、请求流程 |
| [ProjectStructure.md](docs/ProjectStructure.md) | 项目目录结构、模块划分 |
| [DatabaseSchema.md](docs/DatabaseSchema.md) | Drizzle ORM 数据库 Schema、表关系、迁移策略 |
| [Authentication.md](docs/Authentication.md) | JWT 认证、2FA、安全戳、授权中间件 |
| [APIReference.md](docs/APIReference.md) | 完整 API 路由参考 (Identity/Core/Admin/Icons/Notifications) |
| [RealtimeCommunication.md](docs/RealtimeCommunication.md) | Durable Objects WebSocket、SignalR 协议、Push 通知 |
| [StorageDesign.md](docs/StorageDesign.md) | R2/KV/D1 存储方案、文件管理 |
| [BackgroundJobs.md](docs/BackgroundJobs.md) | Cron Triggers 定时任务、Queues 异步处理 |
| [EmailSystem.md](docs/EmailSystem.md) | Resend 集成、React Email 模板 |
| [Configuration.md](docs/Configuration.md) | 环境变量、KV 动态配置、Admin 配置管理 |
| [SecurityDesign.md](docs/SecurityDesign.md) | 零知识架构、加密、速率限制、安全头 |
| [DeploymentGuide.md](docs/DeploymentGuide.md) | wrangler 配置、CI/CD、环境管理 |
| [WebClient.md](docs/WebClient.md) | React + COSS UI 前端页面设计 (Admin 面板 + 个人保管库) |

## 与 Vaultwarden 的架构映射

| Vaultwarden (Rust) | HonoWarden (TypeScript) |
|---------------------|-------------------------|
| Rocket web framework | Hono.js |
| Diesel ORM + SQLite/MySQL/PostgreSQL | Drizzle ORM + Cloudflare D1 |
| r2d2 连接池 | D1 bindings (无需连接池) |
| OpenDAL 文件存储 | Cloudflare R2 |
| LazyLock 全局配置 | Workers env + KV |
| DashMap WebSocket hub | Durable Objects |
| job_scheduler_ng 后台任务 | Cron Triggers + Queues |
| SMTP/Sendmail | Resend API |
| Rocket Fairings | Hono Middleware |
| Rocket Request Guards | Hono Middleware + Context |
