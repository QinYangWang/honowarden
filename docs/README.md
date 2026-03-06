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

## 近期变更摘要

| 变更 | 说明 |
|------|------|
| **Secrets 文档** | README、DeploymentGuide、docs/README 新增 Secrets 配置章节（GitHub Actions、Worker 运行时、本地开发） |
| **CI 调整** | 移除 `environment: production`，改用 repository-level secrets；新增 Verify secrets 步骤 |
| **Cron 合并** | 因免费版 5 个 cron 限制，7 个任务合并为 1 个 `*/1 * * * *`，handler 内按 minute/hour 分发 |
| **purge-auth-requests** | 改用原始 D1 API（`prepare().bind().run()`），避免 Drizzle 序列化导致 D1 查询失败 |
| **KV 命名** | setup-wrangler.mjs 中 KV title 改为 `{workerName}-{binding}`，binding 小写、`_` → `-` |
| **设备 API** | 新增 `/api/devices` 路由（GET /、/:id、/knowndevice）；PUT token/clear-token 待实现 |
| **Base64 增强** | password.ts 新增 `normalizeBase64()`，支持 base64url、去空白、补齐 padding；`base64ToBuffer` 增加正则校验 |
| **Cron 本地测试** | test-cron.mjs 请求路径改为 `/cdn-cgi/handler/scheduled`；修正 JSDoc `*/1` 语法错误 |
| **Lint 修复** | eslint 忽略 worker-configuration.d.ts；未使用变量用 `_` 前缀；空 catch 添加注释 |

## 设计文档索引

| 文档 | 描述 |
|------|------|
| [Architecture.md](Architecture.md) | 系统架构设计、服务映射、请求流程 |
| [ProjectStructure.md](ProjectStructure.md) | 项目目录结构、模块划分 |
| [DatabaseSchema.md](DatabaseSchema.md) | Drizzle ORM 数据库 Schema、表关系、迁移策略 |
| [Authentication.md](Authentication.md) | JWT 认证、2FA、安全戳、授权中间件 |
| [APIReference.md](APIReference.md) | 完整 API 路由参考 (Identity/Core/Admin/Icons/Notifications) |
| [RealtimeCommunication.md](RealtimeCommunication.md) | Durable Objects WebSocket、SignalR 协议、Push 通知 |
| [StorageDesign.md](StorageDesign.md) | R2/KV/D1 存储方案、文件管理 |
| [BackgroundJobs.md](BackgroundJobs.md) | Cron Triggers 定时任务、Queues 异步处理 |
| [EmailSystem.md](EmailSystem.md) | Resend 集成、React Email 模板 |
| [Configuration.md](Configuration.md) | 环境变量、KV 动态配置、Admin 配置管理 |
| [SecurityDesign.md](SecurityDesign.md) | 零知识架构、加密、速率限制、安全头 |
| [DeploymentGuide.md](DeploymentGuide.md) | wrangler 配置、CI/CD、环境管理 |
| [WebClient.md](WebClient.md) | React + COSS UI 前端页面设计 (Admin 面板 + 个人保管库) |

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

## 快速开始

```bash
# 安装依赖（自动从模板生成 wrangler.json）
npm install

# 生成开发密钥 (RSA + Admin Token → .dev.vars)
npm run generate-keys

# 生成数据库迁移 SQL
npx drizzle-kit generate

# 应用迁移到本地 D1
npm run db:migrate:local

# 启动开发服务器
npm run dev

# 运行 E2E 测试
node scripts/e2e-test.mjs

# 部署到 Cloudflare（推荐使用 CI/CD，详见 DeploymentGuide.md）
git push origin main
```

## Secrets 概览

详细的获取步骤参见根目录 [README.md](../README.md#secrets-配置) 或 [DeploymentGuide.md](DeploymentGuide.md)。

### GitHub Actions Secrets（CI/CD）

| Secret | 必需 | 说明 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | **是** | Cloudflare API 令牌（需 Workers/D1/KV/R2/Queue Edit 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | 推荐 | 账号 ID（单账号自动检测） |
| `DEPLOY_DOMAIN` | **是** | 生产域名，如 `https://vault.example.com` |

### Worker 运行时 Secrets（`wrangler secret put`）

| Secret | 必需 | 说明 |
|--------|------|------|
| `RSA_PRIVATE_KEY` | **是** | PKCS#8 RSA 私钥（JWT 签名） |
| `ADMIN_TOKEN` | **是** | Admin 面板登录令牌 |
| `RESEND_API_KEY` | **是** | Resend 邮件 API Key |
| `DUO_IKEY` / `DUO_SKEY` / `DUO_HOST` | 可选 | Duo 2FA |
| `YUBICO_CLIENT_ID` / `YUBICO_SECRET_KEY` | 可选 | YubiKey |
| `PUSH_INSTALLATION_ID` / `PUSH_INSTALLATION_KEY` | 可选 | Bitwarden Push Relay |
