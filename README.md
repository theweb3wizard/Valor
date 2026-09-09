# Valor — Autonomous Community Rewards Engine

> **AI-powered quality evaluation + autonomous USDC rewards for Telegram communities. No commands. No voting. No humans in the loop.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![Neon](https://img.shields.io/badge/Neon-00E599?logo=neon&logoColor=fff)](https://neon.tech)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=000)](https://orm.drizzle.team)
[![Auth.js](https://img.shields.io/badge/Auth.js-635BFF?logo=auth0&logoColor=fff)](https://authjs.dev)
[![Base](https://img.shields.io/badge/Base-0052FF?logo=base&logoColor=fff)](https://base.org)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?logo=googlegemini&logoColor=fff)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue)](/LICENSE)

Valor is a **serverless autonomous agent** that bridges Telegram (Web2) → Base (Web3). Every group message passes a 0ms spam filter, optionally hits Gemini 2.5 Flash for structured scoring, and—if valuable—auto-tips USDC from a deterministic per-community treasury. Contributors claim via HMAC-signed links. Built as a portfolio-grade full-stack showcase: 23 routes, 12 tables, 0 `any`.

**Live:** `https://valor-tgbot.vercel.app` · **Stack:** Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4 + Neon + Drizzle + Auth.js v5 + viem + Upstash QStash + Gemini

---

## Table of Contents
- [Status](#status)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Security & Reliability](#security--reliability)
- [UI / UX](#ui--ux)
- [Deployment (Vercel Hobby)](#deployment-vercel-hobby)
- [Scripts](#scripts)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Status

**Free forever · Hobby-friendly · Demo-grade hardened**

| What works (verified `build` 23 routes, `typecheck` 0 errors) | Notes |
|---|---|
| Auth (Auth.js v5 credentials, bcrypt cost 12, JWT, Drizzle adapter) | `POST /api/auth/register` rate-limited, middleware whitelist fixed |
| Community CRUD + Telegram `getMe` + webhook `X-Telegram-Bot-Api-Secret-Token` (`sha256(botToken+cronSecret)`) | Treasury auto-derived, gas 0.0005 ETH from master |
| Two-filter spam gate (~0.1ms, 90%+ dropped before Gemini) | `src/lib/telegram/filters.ts` |
| Gemini 2.5 Flash structured eval (Zod, 2× retry on 429, dev mock fallback) | `src/lib/gemini/evaluate.ts` |
| QStash async pipeline (webhook <50ms → `/api/jobs/evaluate` with `Receiver.verify`, dev inline fallback) | `src/lib/qstash/client.ts` + `src/lib/config.ts:isDev` |
| Dashboard SSR + 15s polling feed (Date|string bug fixed) + Leaderboard | `src/app/(dashboard)/...` |
| Claim portal (HMAC `sig`, register → `retryPendingTips`, withdraw with `isAddress` + available check + `withdrawals` ledger) | `src/lib/claim-auth.ts` |
| On-chain: deterministic `keccak256(masterKey, communityId)` treasury, viem `ERC20 transfer`, mock `txHash` in dev when key missing | `src/lib/chain/` |
| Onboarding wizard (4 steps), claim/withdraw, treasury refresh | |
| DB: **12 tables** on Neon (incl. `withdrawals`), indexes, `processing` status | `drizzle/004_withdrawals.sql` |
| Cron removed for Hobby; health + treasury refresh work without it | See [Deployment](#deployment-vercel-hobby) |

**Scoped out / mock in dev:** real funded Base transfers require `TREASURY_PRIVATE_KEY` with ETH; real QStash requires keys (dev runs inline via `x-dev-inline`); Telegram webhook needs `ngrok` + bot token for local `getMe`.

---

## Features

| Feature | Demonstrates |
|---|---|
| **Async pipeline (QStash)** | Webhook returns 200 in <50ms; heavy AI+chain runs in signed job (solves Telegram 10s timeout) |
| **Cost-gated AI** | Pure-TS filters → only survivors hit Gemini; mock in dev, fail-closed `{score:0, should_tip:false}` |
| **Structured eval** | `generateObject({ schema: evaluationOutputSchema })` — no prompt-injection parsing |
| **Idempotent money** | `sha256(communityId+userId+messageId)` write-ahead `pending/processing` before `writeContract`; concurrent deliveries deduped via `UNIQUE(idempotency_key)` |
| **HMAC claim** | `HMAC(CRON_SECRET, telegramUserId)` links, `sig` verified; dev allows unsigned for out-of-box testing |
| **Withdrawals ledger** | `withdrawals` table tracks debits; `available = confirmed - withdrawn` (no double-spend) |
| **Deterministic treasury** | Single master key → per-community `keccak256` address; no keys in DB; gas sponsorship |
| **Graceful degradation** | Every client null-gated by `serverConfig.has*`; app renders with missing env (mock chain/AI) |

---

## How It Works

```
Telegram message → POST /api/webhook/[botToken] (<50ms, 200)
  1. lookup community by botToken
  2. verify X-Telegram-Bot-Api-Secret-Token (sha256(botToken+CRON_SECRET))
  3. pesticide filters 1+2 (word count, emoji strip, ?, crypto keywords)
  4. enqueue QStash → /api/jobs/evaluate (or dev inline fetch)
  5. return ok

QStash → POST /api/jobs/evaluate (Receiver.verify)
  1. load community (skip if !isActive)
  2. duplicate check (tips.idempotency_key)
  3. Gemini structured eval
  4. insert evaluations
  5. rate-limit (daily limit + 30min cooldown, atomic upsert)
  6. wallet lookup
  7. treasury balance (viem read, dev 1000 USDC mock)
  8. write-ahead tips pending/processing
  9. USDC transfer (viem, dev mock if no key)
 10. update tips confirmed/failed
 11. upsert rate_limits
 12. refreshTreasuryBalance (toFixed(2))
 13. Telegram notify with signed claimUrl
```

**Claim:** `GET /api/claim/verify?user=&sig=` → per-community `available`/`pending` → `POST /api/claim/register` (isAddress, retry) → `POST /api/claim/withdraw` (isAddress, amount ≤ available, idempotency, ledger).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 App Router**, React 19, Turbopack `p9002` | SSR + Route Handlers, Vercel-native |
| Language | **TypeScript strict** | No `any`; typed config, Zod, Drizzle |
| DB | **Neon Postgres + Drizzle ORM** | Serverless, `Pool max10`, type-safe, `drizzle/` migrations |
| Auth | **Auth.js v5** `credentials` + `bcryptjs` + JWT | Drizzle adapter, middleware whitelist (`/api/jobs`, `/api/claim`, `/api/community/verify-bot` now public) |
| AI | **Gemini 2.5 Flash + `ai@6`** | `generateObject({ schema })`, mock when `!hasGeminiConfig && isDev` |
| Chain | **viem + Base** | `USDC 0x8335…2913` 6 decimals, `keccak256(master, communityId)` derivation |
| Queue | **Upstash QStash** | `Receiver.verify`, retries 3, dev inline `x-dev-inline` |
| UI | **Tailwind v4 + shadcn/ui + sonner** | `@theme` tokens, `Void & Gold` (Instrument Serif + DM Sans + JetBrains Mono), `mesh-glow`, `grid-pattern` |
| Deploy | **Vercel Hobby** | No cron (removed for daily limit); functions per route |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login, register          # split-screen (mesh-glow left)
│   ├── (dashboard)/layout, dashboard/[communityId]/page, settings
│   ├── api/auth/[...nextauth], auth/register
│   │   ├── claim/verify, register, withdraw  # HMAC, ledger
│   │   ├── community, [id], verify-bot, [id]/feed (auth+ownership), re-register-webhook
│   │   ├── health/                    # ok + communitiesRefreshed when auth or x-vercel-cron
│   │   ├── jobs/evaluate/             # write-ahead, mock fallback
│   │   └── webhook/[botToken]/        # sha256 secret, dev allow-missing
│   ├── claim/ (HMAC, withdrawals), onboard/ (4 steps), faq/privacy/terms/refund
│   └── globals.css (Void & Gold)
├── components/landing/Hero, HowItWorks, Pricing
│   ├── dashboard/StatsRow, TipEvent, ActivityFeed (toIso), Leaderboard
│   ├── onboarding/StepIndicator + steps
│   └── ui/button, card, dialog
├── db/schema (12): users, plans, subscriptions, communities, wallets, evaluations, tips, withdrawals, rateLimits, accounts, sessions, verificationTokens
├── lib/auth, db, config (isDev, rpcUrl, has*), client-config, claim-auth, rate-limit
│   ├── chain/client (getRpcTransport), usdc (mock), cdp/wallets (toFixed2), gemini/evaluate (mock), qstash/client (inline), telegram/notify (signed link)
│   └── utils
├── middleware.ts (publicPaths includes jobs/claim/verify-bot)
└── types/database.ts (deprecated — use InferSelectModel)

drizzle/ 001..004 (004: withdrawals + idx_tips_pending_lookup + processing CHECK)
vercel.json { framework: nextjs } # cron removed for Hobby
```

---

## Quick Start

```bash
git clone https://github.com/theweb3wizard/Valor.git && cd Valor
npm install
cp .env.production.example .env.local   # fill below, or run as-is with mocks
npm run dev                             # http://localhost:9002 (Turbopack)
npm run build && npm run typecheck && npm run lint
```

**Run without keys (mocks):** `isDev=true` (default `NODE_ENV!=production`) ⇒ Gemini returns deterministic 7-9 for long messages, chain returns mock `txHash` + 1000 USDC balance, QStash runs inline. Landing + auth still work with no DB (degrades).

**Full local:** fill `.env.local` (see below) → `npx drizzle-kit push` (creates `withdrawals` if missing) → `npm run dev`.

**Webhook local test (no QStash/ngrok needed — dev inline):**
```bash
# create community via UI or curl, then:
curl -X POST http://localhost:9002/api/webhook/YOUR_BOT_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"message":{"message_id":1,"date":'$(date +%s)',"chat":{"id":123},"from":{"id":999,"username":"tester"},"text":"How does staking with validators and slashing work on Base? Need detailed explanation"}}'
# dashboard → feed shows eval + tip (mock tx)
```

**Claim:** `GET /claim?user=999` (dev allows no `sig`) or `…?user=999&sig=<HMAC>` (prod; sig = `hmac(CRON_SECRET, userId).slice(0,16)`).

---

## Environment Variables

Copy `.env.production.example`. Placeholders `your-`, `changeme`, `v` treated as unset (`isPlaceholder`).

| Var | Required | Where | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes (or degrade) | server | Neon `postgresql://…?sslmode=require` |
| `AUTH_SECRET` | yes | server | `openssl rand -hex 32` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | yes | both | `http://localhost:9002` dev, prod domain |
| `GEMINI_API_KEY` | no (mock in dev) | server | `aistudio.google.com` |
| `TREASURY_PRIVATE_KEY` | no (mock in dev) | server | `0x` + 64 hex; per-community `keccak256` |
| `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` (+ NEXT) | no (inline in dev) | server | `upstash.com/qstash` |
| `CRON_SECRET` | no (dev fallback `dev-fallback-secret`) | server | HMAC + webhook secret |
| `RPC_URL` | no | server | Base RPC (Alchemy/Infura); defaults to `http()` public |
| `NEXT_PUBLIC_APP_URL` | yes | client | fallback `http://localhost:9002` |

See `src/lib/config.ts:24` for `has*` + `isDev`.

---

## Database

**Provider:** Neon serverless Postgres (`Pool` singleton, `max10`). **ORM:** Drizzle (`drizzle/`).

**Tables (12):**
- `users` (Auth.js + `passwordHash`), `accounts`, `sessions`, `verificationTokens`
- `plans`, `subscriptions` (legacy, inert — free forever)
- `communities` (`ownerUserId`, `botToken` unique, `treasuryAddress`, `usdcBalance` `toFixed(2)`, `minScore`, `tipAmountLow/High`, `isActive`)
- `wallets` `UNIQUE(communityId, telegramUserId)`
- `evaluations` (`score 0-10`, `reason`, `shouldTip`)
- `tips` `UNIQUE(idempotency_key)` `CHECK pending/confirmed/failed/processing` + `idx_tips_pending_lookup`
- `withdrawals` `UNIQUE(idempotency_key)` + `idx_withdrawals_community_user`
- `rate_limits` `UNIQUE(community, user, date)`

**Migrations:** `drizzle/` (moved from `supabase/migrations`):
```bash
npx drizzle-kit generate   # from schema
npx drizzle-kit push       # apply (dev) or `migrate`
# manual: psql < drizzle/004_withdrawals.sql (withdrawals + indexes + processing CHECK)
```

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | rate-limited | `email, password(≥8)` → bcrypt 12 |
| `POST/GET` | `/api/auth/[...nextauth]` | — | Auth.js credentials |
| `GET` | `/api/community` | `auth()` | owner’s communities |
| `POST` | `/api/community` | `auth()` | `{name, botToken}` → `getMe`, `setWebhook(sha256)`, `createCommunityTreasury` |
| `GET/PATCH/DELETE` | `/api/community/[id]` | `owner` | PATCH validated (`name`, `min_score` 1-10, `tip_amount_*`, `daily_limit`, `eval_context`, `is_active`) |
| `POST` | `/api/community/verify-bot` | rate-limited, public | `getMe` |
| `GET` | `/api/community/[id]/feed?since=` | `owner` | 25 evals+25 tips, `gt(since)` |
| `POST` | `/api/community/[id]/re-register-webhook` | `owner` | re-`setWebhook` |
| `POST` | `/api/webhook/[botToken]` | `sha256` header (dev allow-missing) | filter → `enqueueEvaluationJob` (<50ms) |
| `POST` | `/api/jobs/evaluate` | QStash or `x-dev-inline` | Gemini → write-ahead → viem → notify |
| `GET` | `/api/claim/verify?user=&sig=` | HMAC (dev allow-missing) | `available = confirmed - withdrawn`, `pending(no_wallet)` |
| `POST` | `/api/claim/register` | HMAC, rate-limited, `isAddress` | saves wallet + `retryPendingTips` |
| `POST` | `/api/claim/withdraw` | HMAC, `isAddress`, `amount≤available`, idempotent | inserts `withdrawals` |
| `GET` | `/api/health` | `Bearer CRON_SECRET` or `x-vercel-cron` | `ok` + `communitiesRefreshed`; otherwise `ok` only |

---

## Security & Reliability

- **Write-ahead money:** `pending/processing` row before `writeContract`; duplicate QStash deliveries hit `UNIQUE(idempotency_key)` → no double-tip.
- **Claim:** `HMAC(CRON_SECRET, userId)` signed links; server `verifyClaimSignature`; withdraw checks `isAddress` + `available`.
- **Middleware:** `src/middleware.ts:4` public `/_next`, `/`, `/claim`, `/api/auth`, `/api/webhook`, `/api/health`, `/api/jobs`, `/api/claim`, `/api/community/verify-bot`; all else `auth()`.
- **Webhook:** `sha256(botToken+CRON_SECRET)` per-community; prod fails closed if `!hasCronSecret`.
- **Rate-limit:** in-memory `src/lib/rate-limit.ts` for `verify-bot`, `register`, `claim/*` + DB `tipsToday` + 30min cooldown + treasury buffer (`+0.5 USDC`).
- **Chain:** master → `keccak256` deterministic, `isValidPrivateKey` check, dev mock if missing; `getUsdcBalance` dev 1000 USDC.
- **AI:** Zod-forced JSON, 429 retry 2× 2s, dev mock 7-9.
- **Balance:** `toFixed(2)` not truncating cents.
- **Feed:** `toIso` handles `Date|string` (fixes polling no-op).

---

## UI / UX

**System:** `Void & Gold` — `Instrument Serif` display italic gold, `DM Sans` body, `JetBrains Mono`, `mesh-glow` (amber/teal/emerald), `grid-pattern`, `glass` blur, `shimmer-border`, `float`/`marquee`.

- **Landing:** nav pill, hero `Live on Base • 2.4k tips` + `Launch app →`, live feed card (`9.2/10 should_tip ✓`, `+2 USDC`, `BaseScan`, `HMAC sig ✓`), ticker; `HowItWorks` bento + `REQUEST LIFECYCLE` mono strip; `Pricing` `FREE FOREVER` vs `~$1–2/mo`.
- **Dashboard:** `280px` sidebar, header `treasury 0x…`, `StatsRow` 4 orbs, `TipEvent` timeline, `Leaderboard` podiums.
- **Onboarding:** `mesh-glow` card with top gradient, `StepIndicator` `✓`.
- **Auth:** split `mesh-glow` quote left; `rounded-full` inputs.
- **Claim:** `TOTAL AVAILABLE` 4xl, `pending` amber, `rounded-2xl` register/withdraw.

---

## Deployment (Vercel Hobby)

**Cron removed for Hobby.** `vercel.json` is `{ "framework": "nextjs" }` only.
> Hobby allows **1 cron/day**; previous `0 */6 * * *` (every 6h = 4/day) failed deploy (`Hobby accounts are limited to daily cron jobs`). `/api/health` still works manually and via tip refresh (`jobs/evaluate` calls `refreshTreasuryBalance`). To re-enable daily: `0 0 * * *`.

```bash
vercel --prod
# env in Vercel dashboard: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL, etc. (RPC_URL optional)
```

---

## Scripts

```bash
npm run dev        # turbopack p9002
npm run build      # 23 routes
npm run start
npm run lint       # eslint src/ (0 warns now)
npm run typecheck  # tsc --noEmit (strict)
npx drizzle-kit generate / push / migrate
```

---

## Roadmap

- [ ] Vitest + MSW + Playwright (api + dashboard)
- [ ] Multi-chain (Base, Polygon, OP) abstract `src/lib/chain`
- [ ] Admin analytics (tip trends, top contributors)
- [ ] Telegram Mini App `initData` verification
- [ ] `better-auth` vs Auth.js stable
- [ ] Daily cron `0 0 * * *` if needed (Hobby-safe)

---

## Contributing

See `docs/CONTRIBUTING.md` (branch `fix/`, `feat/`, `typecheck+lint` before PR, conventional commits). Architecture: `docs/ARCHITECTURE.md`.

---

## License

Apache-2.0 — see [LICENSE](./LICENSE)
