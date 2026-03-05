# 部署指南

## 前置条件

- Node.js >= 18
- npm >= 9
- Cloudflare 账户 (Workers Paid Plan 推荐)
- 已验证的域名 (用于 Resend 邮件发送)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

## wrangler.toml 配置

```toml
name = "honowarden"
main = "src/server/index.ts"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]

# Workers 配置
[placement]
mode = "smart"

# 环境变量
[vars]
DOMAIN = "https://vault.example.com"

# D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "honowarden-db"
database_id = "<your-d1-database-id>"
migrations_dir = "drizzle"

# R2 Buckets
[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "honowarden-attachments"

[[r2_buckets]]
binding = "SENDS"
bucket_name = "honowarden-sends"

[[r2_buckets]]
binding = "ICONS"
bucket_name = "honowarden-icons"

# KV Namespaces
[[kv_namespaces]]
binding = "CONFIG"
id = "<your-kv-namespace-id>"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<your-rate-limit-kv-id>"

# Durable Objects
[[durable_objects.bindings]]
name = "USER_HUB"
class_name = "UserNotificationHub"

[[durable_objects.bindings]]
name = "ANON_HUB"
class_name = "AnonymousNotificationHub"

[[migrations]]
tag = "v1"
new_classes = ["UserNotificationHub", "AnonymousNotificationHub"]

# Queues - Producers
[[queues.producers]]
queue = "honowarden-email"
binding = "EMAIL_QUEUE"

[[queues.producers]]
queue = "honowarden-push"
binding = "PUSH_QUEUE"

[[queues.producers]]
queue = "honowarden-events"
binding = "EVENT_QUEUE"

# Queues - Consumers
[[queues.consumers]]
queue = "honowarden-email"
max_batch_size = 10
max_retries = 3
dead_letter_queue = "honowarden-dlq"

[[queues.consumers]]
queue = "honowarden-push"
max_batch_size = 50
max_retries = 3

[[queues.consumers]]
queue = "honowarden-events"
max_batch_size = 100
max_retries = 2

# Cron Triggers
[triggers]
crons = [
  "5 * * * *",
  "5 0 * * *",
  "*/1 * * * *",
  "7 * * * *",
  "3 * * * *",
  "10 0 * * *",
  "20 0 * * *",
]

# 构建
[build]
command = "npm run build"

# 环境: Staging
[env.staging]
name = "honowarden-staging"
[env.staging.vars]
DOMAIN = "https://vault-staging.example.com"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "honowarden-db-staging"
database_id = "<staging-d1-id>"

# 环境: Production
[env.production]
name = "honowarden-production"
[env.production.vars]
DOMAIN = "https://vault.example.com"
```

## 部署步骤

### 1. 初始化项目

```bash
# 克隆项目
git clone <repo-url> honowarden
cd honowarden

# 安装依赖
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create honowarden-db
# 记录输出的 database_id，填入 wrangler.toml

# 创建 R2 Buckets
npx wrangler r2 bucket create honowarden-attachments
npx wrangler r2 bucket create honowarden-sends
npx wrangler r2 bucket create honowarden-icons

# 创建 KV Namespaces
npx wrangler kv namespace create CONFIG
npx wrangler kv namespace create RATE_LIMIT
# 记录输出的 namespace id，填入 wrangler.toml

# 创建 Queues
npx wrangler queues create honowarden-email
npx wrangler queues create honowarden-push
npx wrangler queues create honowarden-events
npx wrangler queues create honowarden-dlq
```

### 3. 生成 RSA 密钥

```bash
# 生成 2048-bit RSA 密钥
npx ts-node scripts/generate-keys.ts
# 或手动
openssl genrsa -out rsa_key.pem 2048
```

### 4. 配置 Secrets

```bash
# RSA 私钥
npx wrangler secret put RSA_PRIVATE_KEY < rsa_key.pem

# Admin Token (推荐使用 Argon2 哈希)
npx ts-node scripts/create-admin-token.ts
npx wrangler secret put ADMIN_TOKEN

# Resend API Key
npx wrangler secret put RESEND_API_KEY

# 可选: Push Relay
npx wrangler secret put PUSH_INSTALLATION_ID
npx wrangler secret put PUSH_INSTALLATION_KEY

# 可选: Duo
npx wrangler secret put DUO_IKEY
npx wrangler secret put DUO_SKEY

# 可选: YubiKey
npx wrangler secret put YUBICO_CLIENT_ID
npx wrangler secret put YUBICO_SECRET_KEY
```

### 5. 数据库迁移

```bash
# 生成迁移文件
npx drizzle-kit generate --name init

# 应用到本地 D1
npx wrangler d1 migrations apply honowarden-db --local

# 应用到远程 D1
npx wrangler d1 migrations apply honowarden-db --remote
```

### 6. 构建与部署

```bash
# 构建
npm run build

# 部署到 Cloudflare
npm run deploy
# 或
npx wrangler deploy
```

### 7. 配置域名

在 Cloudflare Dashboard 中：

1. 进入 Workers & Pages > honowarden
2. Settings > Domains & Routes
3. 添加自定义域名 (如 `vault.example.com`)
4. Cloudflare 自动配置 DNS 和 SSL

### 8. 配置 Resend 域名

1. 登录 [Resend Dashboard](https://resend.com/domains)
2. 添加发件域名
3. 配置 DNS 记录 (SPF, DKIM, DMARC)
4. 验证域名

## 本地开发

### 配置开发环境

```bash
# 复制开发环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入开发环境 Secret

# 创建本地 D1 并迁移
npx wrangler d1 migrations apply honowarden-db --local

# 启动开发服务器
npm run dev
# 或
npx wrangler dev
```

### .dev.vars.example

```env
RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"
ADMIN_TOKEN="admin_password_for_dev"
RESEND_API_KEY="re_test_..."
DOMAIN="http://localhost:8787"
```

### 开发模式特性

- `wrangler dev` 自动启动本地 D1、R2、KV、DO 模拟
- 支持热重载
- 本地 WebSocket 连接
- `--remote` 标志可连接远程资源

```bash
# 连接远程 D1 进行开发
npx wrangler dev --remote
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "dev:remote": "wrangler dev --remote",
    "build": "tsc && vite build",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply honowarden-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply honowarden-db --remote",
    "db:studio": "drizzle-kit studio",
    "test": "vitest",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "lint": "tsc --noEmit && eslint src/",
    "generate-keys": "tsx scripts/generate-keys.ts",
    "create-admin-token": "tsx scripts/create-admin-token.ts"
  }
}
```

## CI/CD (GitHub Actions)

### 部署流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy HonoWarden

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run lint
      - run: npm test

  deploy-staging:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - name: Apply D1 Migrations
        run: npx wrangler d1 migrations apply honowarden-db-staging --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Staging
        run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://vault.example.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - name: Apply D1 Migrations
        run: npx wrangler d1 migrations apply honowarden-db --remote --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Production
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### GitHub Secrets

| Secret | 描述 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token (Workers 部署权限) |

## 监控与可观测性

### Workers Analytics

Cloudflare Dashboard 自动提供：
- 请求量、成功率、错误率
- CPU 时间分布
- 请求延迟 (P50, P95, P99)
- 调用的子请求 (D1, R2, KV)

### 结构化日志

```typescript
// 所有日志使用 JSON 格式
console.log(JSON.stringify({
  level: "info",
  event: "user_login",
  userId: "abc123",
  deviceType: "browser",
  duration_ms: 45,
}));
```

通过 Cloudflare Dashboard > Workers > Logs 查看，或使用 `wrangler tail` 实时流式查看：

```bash
npx wrangler tail --format json
```

### 告警

通过 Cloudflare Notifications 配置：
- Worker 错误率超过阈值
- D1 查询延迟异常
- Queue Dead Letter 消息积压

## 备份策略

### D1 备份

```bash
# 手动备份
npx wrangler d1 time-travel info honowarden-db

# 恢复到指定时间点
npx wrangler d1 time-travel restore honowarden-db --timestamp 2025-01-15T00:00:00Z
```

### R2 备份

R2 数据自动持久化，支持：
- Object 版本控制（可选启用）
- 跨区域复制（企业版）

### 配置备份

```bash
# 导出 KV 配置
npx wrangler kv key list --namespace-id <CONFIG_ID> | jq '.[].name' | while read key; do
  echo "$key: $(npx wrangler kv key get --namespace-id <CONFIG_ID> $key)"
done > config-backup.json
```

## 资源与成本

### Cloudflare Workers 定价 (Paid Plan: $5/月)

| 资源 | 免费 | 付费 |
|------|------|------|
| 请求 | 100K/天 | 10M/月 (含), $0.30/百万 |
| CPU 时间 | 10ms/请求 | 30s/请求 |
| D1 | 5M 行读/天, 100K 写/天 | 25B 行读/月, 50M 写/月 |
| R2 | 10GB 存储, 10M 读/月 | 10GB (含), $0.015/GB |
| KV | 100K 读/天, 1K 写/天 | 10M 读/月, 1M 写/月 |
| Durable Objects | - | $0.15/百万请求 |
| Queues | - | 1M 消息/月 (含) |

### 典型用量估算 (100 用户)

| 资源 | 月用量 | 成本 |
|------|--------|------|
| Workers 请求 | ~500K | 含 |
| D1 读取 | ~5M 行 | 含 |
| D1 写入 | ~100K 行 | 含 |
| R2 存储 | ~1 GB | 含 |
| KV 读取 | ~1M | 含 |
| DO 请求 | ~100K | 含 |
| **总计** | | **~$5/月** |

## 故障排除

### 常见问题

**D1 迁移失败**:
```bash
# 检查迁移状态
npx wrangler d1 migrations list honowarden-db

# 重新应用
npx wrangler d1 migrations apply honowarden-db --remote
```

**Worker 部署失败**:
```bash
# 检查 TypeScript 编译
npx tsc --noEmit

# 检查 wrangler 配置
npx wrangler whoami
npx wrangler deploy --dry-run
```

**WebSocket 连接失败**:
- 确认 Durable Objects 已正确绑定
- 检查 `[[durable_objects.bindings]]` 和 `[[migrations]]` 配置
- 确认客户端使用 `wss://` 协议

**邮件发送失败**:
- 验证 `RESEND_API_KEY` Secret 已设置
- 确认发件域名已在 Resend 验证
- 检查 Queue consumer 日志

**速率限制误触发**:
- 检查 KV `RATE_LIMIT` namespace 中的计数
- 调整 rate limit 配置
- 使用 `wrangler kv key delete` 清除特定计数器
