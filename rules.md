# Valor Platform — Agent Rules

## Project
Multi-tenant SaaS. Next.js 15 App Router. TypeScript strict mode. Supabase. Tether WDK.

## Non-negotiable rules
- Every Supabase query MUST include a community_id or admin_id filter. No exceptions.
- Never store seeds, private keys, or mnemonics anywhere except environment variables.
- Never modify the webhook route handler (src/app/api/telegram/route.ts) without explicit instruction.
- Always use TypeScript. Never use `any` type.
- All new pages go in src/app/. All new reusable components go in src/components/.

## Architecture
- Auth: Supabase Auth (email/password)
- Wallet derivation: @tetherto/wdk-wallet-evm, BIP-44, index per admin
- AI evaluation: Google Gemini via Firebase Genkit
- Database: Supabase PostgreSQL (schema is multi-tenant — see tables: admins, communities, wallets, tips, evaluations, rate_limits)

## Build order
Always read existing files before modifying them.
Always write database changes as SQL migrations before touching application code.
One feature per task. Do not bundle unrelated changes.