# HonoWarden

## Critical Rules

- **NEVER** use code regions: If complexity suggests regions, refactor for better readability
- **NEVER** compromise zero-knowledge principles: User vault data must remain encrypted and inaccessible to Bitwarden
- **NEVER** log or expose sensitive data: No PII, passwords, keys, or vault data in logs or error messages
- **NEVER** Never add custom parameters to the shadcn component yourself
- **ALWAYS** use secure communication channels: Enforce confidentiality, integrity, and authenticity
- **ALWAYS** encrypt sensitive data: All vault data must be encrypted at rest, in transit, and in use
- **ALWAYS** prioritize cryptographic integrity and data protection
- **ALWAYS** add unit tests (with mocking) for any new feature development
- **ALWAYS** commit changes after any new feature development and test completed
- **ALWAYS** search for the latest documentation through MCP or docs in `/llms/` to understand the latest writing methods before writing code

## Project Structure

- **Web Client Source Code**: `/src/client` - React Application
- **API Source Code**: `/src/server` - Honojs API Source Code
- **Tests**: `/test/` - Test logic aligning with the source structure, albeit with a `.test.ts` suffix
- **Utilities**: `/util/` - Migration tools, seeders, and setup scripts
- **Scripts**: `/scripts/` - Local development helpers
- **Configuration**: `/.env`, `/.dev.vars` for local development

## Security Requirements

- **Compliance**: SOC 2 Type II, SOC 3, HIPAA, ISO 27001, GDPR, CCPA
- **Principles**: Zero-knowledge, end-to-end encryption, secure defaults
- **Validation**: Input sanitization, parameterized queries, rate limiting
- **Logging**: Structured logs, no PII/sensitive data in logs

## Development Workflow

- Security impact assessed
- xUnit tests added / updated
- Performance impact considered
- Error handling implemented
- Breaking changes documented
- CI passes: build, test, lint
- Feature flags considered for new features
- CODEOWNERS file respected

## Skills

- **fix-build-errors** (`/skills/fix-build-errors/SKILL.md`): 当 `npm run build` 或 `tsc` 产生编译错误时使用。提供系统化的诊断-分类-批量修复流程，包含本项目常见的类型错误模式及其修复方案。

## References

