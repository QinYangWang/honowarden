# 部署指南

## 前置条件

- Node.js >= 18
- npm >= 9
- Cloudflare 账户 (Workers Paid Plan 推荐)
- 已验证的域名 (用于 Resend 邮件发送)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

## wrangler.template.json 配置

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

# Cron Triggers（免费版最多 5 个，合并为 1 个每分钟触发）
[triggers]
crons = ["*/1 * * * *"]

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

### 2. 创建 Cloudflare 资源（自动）

`scripts/setup-wrangler.mjs` 在检测到 `CLOUDFLARE_API_TOKEN` 时会自动按名称查找或创建所有资源：

```bash
# 设置 API Token（获取方式见下方 Secrets 参考）
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"  # 可选，单账号自动检测

# 自动创建 D1/KV/R2/Queue 并生成 wrangler.json
node scripts/setup-wrangler.mjs
```

脚本会自动处理以下资源：
- **D1**: `honowarden-db`
- **KV**: `honowarden-CONFIG`, `honowarden-RATE_LIMIT`
- **R2**: `honowarden-attachments`, `honowarden-sends`, `honowarden-icons`
- **Queues**: `honowarden-email`, `honowarden-push`, `honowarden-events`, `honowarden-dlq`

如果 CI/CD 部署（推荐），只需配置 GitHub Secrets，推送代码后自动执行。

### 3. 生成开发密钥

```bash
npm run generate-keys     # → .dev.vars (RSA PKCS#8 私钥 + Admin Token)
```

### 4. 配置 Worker 运行时 Secrets

```bash
# 必需（从 .dev.vars 复制值，或手动输入）
npx wrangler secret put RSA_PRIVATE_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY

# 可选: Duo 2FA
npx wrangler secret put DUO_IKEY
npx wrangler secret put DUO_SKEY
npx wrangler secret put DUO_HOST

# 可选: YubiKey
npx wrangler secret put YUBICO_CLIENT_ID
npx wrangler secret put YUBICO_SECRET_KEY

# 可选: Bitwarden Push Relay
npx wrangler secret put PUSH_INSTALLATION_ID
npx wrangler secret put PUSH_INSTALLATION_KEY
```

### 5. 数据库迁移

```bash
# 生成迁移文件（仅首次或 schema 变更后需要）
npx drizzle-kit generate

# 应用到本地 D1
npm run db:migrate:local

# 应用到远程 D1
npm run db:migrate:remote
```

### 6. 构建与部署

```bash
# 手动部署
npm run build
npm run deploy

# 或推送到 main 分支，CI 自动部署
git push origin main
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
# 安装依赖（postinstall 自动从模板生成 wrangler.json）
npm install

# 生成开发密钥
npm run generate-keys

# 生成数据库迁移 SQL（仅首次或 schema 变更后）
npx drizzle-kit generate

# 应用迁移到本地 D1
npm run db:migrate:local

# 启动开发服务器
npm run dev
```

### .dev.vars.example

```env
# 运行 npm run generate-keys 自动生成
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_PKCS8_RSA_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----"
ADMIN_TOKEN="your_admin_token_here"
RESEND_API_KEY="re_test_your_key_here"
DOMAIN="http://localhost:8787"
```

### 开发模式特性

- `npm run dev` 使用 `@cloudflare/vite-plugin` 启动，自动模拟 D1、R2、KV、DO
- 支持 Vite HMR 热重载
- 本地状态持久化在 `.wrangler/state/v3/`
- `wrangler.json` 从 `wrangler.template.json` 自动生成（`npm install` 时）

## package.json Scripts

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "cf-typegen": "wrangler types",
    "deploy": "wrangler deploy",
    "dev": "vite",
    "db:migrate:local": "wrangler d1 migrations apply honowarden-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply honowarden-db --remote",
    "generate-keys": "node scripts/generate-keys.mjs",
    "lint": "eslint .",
    "postinstall": "node scripts/setup-wrangler.mjs",
    "setup": "node scripts/setup-wrangler.mjs && npm run generate-keys"
  }
}
```

## CI/CD (GitHub Actions)

### GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 必需 | 说明 | 获取方式 |
|--------|------|------|----------|
| `CLOUDFLARE_API_TOKEN` | **是** | Cloudflare API 令牌 | Dashboard → My Profile → API Tokens → Create Custom Token |
| `CLOUDFLARE_ACCOUNT_ID` | 推荐 | 账号 ID（单账号可省略） | Dashboard → Account Home → 右侧边栏 Account ID |
| `DEPLOY_DOMAIN` | **是** | 生产域名 | 如 `https://vault.example.com` |

**API Token 所需权限：**

| 权限范围 | 资源 | 权限 |
|----------|------|------|
| Account | Workers Scripts | Edit |
| Account | Workers KV Storage | Edit |
| Account | Workers R2 Storage | Edit |
| Account | D1 | Edit |
| Account | Queues | Edit |
| Zone | DNS | Edit |

> 脚本会自动使用此 Token 查找或创建 D1、KV、R2、Queue 资源，无需手动创建或记录资源 ID。

### 部署流水线

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Type Check
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint
      - name: Unit Tests
        run: npx vitest run

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      - name: Provision resources & generate wrangler.json
        run: node scripts/setup-wrangler.mjs
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          DEPLOY_DOMAIN: ${{ secrets.DEPLOY_DOMAIN }}

      - name: Build
        run: npm run build

      - name: Apply D1 Migrations
        run: npm run db:migrate:remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 流水线说明

1. **test** — 类型检查 + lint + 单元测试（PR 和 push 均触发）
2. **deploy**（仅 main/master push）：
   - `setup-wrangler.mjs` 通过 Cloudflare API 查找/创建所有资源，生成带真实 ID 的 `wrangler.json`
   - `npm run build` 构建前端和 Worker
   - `db:migrate:remote` 应用数据库迁移
   - `wrangler-action` 部署到 Cloudflare

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
