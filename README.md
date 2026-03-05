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
# 安装依赖
bun install

# 配置环境变量
cp .dev.vars.example .dev.vars

# 创建 D1 数据库
npx wrangler d1 create honowarden-db

# 运行数据库迁移
npx drizzle-kit generate
npx wrangler d1 migrations apply honowarden-db --local

# 本地开发
bun run dev

# 部署到 Cloudflare
bun run deploy

# 首次生成 ADMIN_TOKEN 和 RSA_PRIVATE_KEY
npm run generate-keys

# 强制重新生成 ADMIN_TOKEN 和 RSA_PRIVATE_KEY
npm run generate-keys -- --force
```
