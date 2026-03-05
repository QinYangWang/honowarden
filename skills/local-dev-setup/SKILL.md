---
name: local-dev-setup
description: Set up and troubleshoot local HonoWarden development environment. Use when the user wants to start the dev server, run E2E tests, encounters D1 database errors, or needs to initialize the local environment.
---

# Local Dev Setup

## Quick Start (First Time)

```bash
npm install                      # also runs postinstall → generates wrangler.json from template
npm run generate-keys            # → .dev.vars (RSA PKCS#8 + Admin Token)
npx drizzle-kit generate         # → drizzle/*.sql (only if schema changed)
npm run db:migrate:local         # apply D1 migrations to local sqlite
npm run dev                      # starts Vite + Cloudflare Workers dev server
```

Or use the combined setup command:

```bash
npm install && npm run setup     # generates wrangler.json + .dev.vars in one step
```

## Common Issues

### "no such table: users" (D1_ERROR: SQLITE_ERROR)

The local D1 database has not been initialized with the schema.

```bash
npm run db:migrate:local
```

Then restart the dev server. No need to re-run `drizzle-kit generate` unless you changed `src/server/db/schema/`.

### "non-extractable CryptoKey cannot be exported as a JWK"

The `importPKCS8` call in `src/server/auth/crypto.ts` must use `{ extractable: true }`:

```typescript
privateKey = await importPKCS8(pemData, "RS256", { extractable: true });
```

This is required because we export the JWK to derive the public key.

### "BEGIN RSA PRIVATE KEY" vs "BEGIN PRIVATE KEY"

jose's `importPKCS8()` requires PKCS#8 format (`-----BEGIN PRIVATE KEY-----`).
The PKCS#1 format (`-----BEGIN RSA PRIVATE KEY-----`) will fail.
Use `npm run generate-keys` to create a correctly formatted key.

### Port conflict (5173 in use)

Vite auto-picks the next port (5174, 5175...). Check terminal output for actual URL.

## E2E Testing

```bash
node scripts/e2e-test.mjs [base_url]
```

Default base URL: `http://localhost:5174`. Tests: Health → Prelogin → Register → Login → Sync → Cipher CRUD → Folder CRUD.

## Architecture Notes

- `wrangler.template.json` is committed to git; `wrangler.json` is generated and gitignored
- `npm run postinstall` auto-generates `wrangler.json` from template after `npm install`
- `npm run dev` uses `@cloudflare/vite-plugin` (NOT `wrangler dev`)
- Local state persists in `.wrangler/state/v3/` (D1, R2, KV, DO)
- `wrangler d1 migrations apply --local` and Vite plugin share the same `.wrangler/state/` directory
- After changing `wrangler.template.json` bindings: `node scripts/setup-wrangler.mjs && npm run cf-typegen`
