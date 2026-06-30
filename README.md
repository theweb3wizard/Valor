# Valor — Autonomous Community Rewards Engine

> **AI-powered quality evaluation + autonomous USDC rewards for Telegram communities. No commands. No voting. No humans in the loop.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![Neon](https://img.shields.io/badge/Neon-00E599?logo=neon&logoColor=fff)](https://neon.tech)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=000)](https://orm.drizzle.team)
[![Auth.js](https://img.shields.io/badge/Auth.js-635BFF?logo=auth0&logoColor=fff)](https://authjs.dev)
[![Coinbase CDP](https://img.shields.io/badge/CDP-0052FF?logo=coinbase&logoColor=fff)](https://docs.cdp.coinbase.com)
[![Base](https://img.shields.io/badge/Base-0052FF?logo=base&logoColor=fff)](https://base.org)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?logo=googlegemini&logoColor=fff)](https://ai.google.dev)

---

## Features (What Each Demonstrates)

| Feature | What It Demonstrates |
|---|---|
| **Async message pipeline** via Upstash QStash | Decoupled architecture — webhook returns 200 in <50ms, heavy work queues to a background job. Solves the Telegram 10s timeout problem without blocking. |
| **Two-filter spam guard** | Cost engineering at the architecture level — pure-TypeScript pre-filters eliminate 90%+ of messages before any paid AI call. Reduces Gemini costs from ~$18/mo to ~$1-2/mo at scale. |
| **Structured AI evaluation** with Gemini + Vercel AI SDK | Schema-forced LLM output via Zod validation. Gemini must return valid typed JSON or the pipeline rejects it. No prompt-injection-based parsing. |
| **Credentials auth** via Auth.js v5 | Email + password authentication with bcrypt hashing. JWT sessions. Drizzle adapter for database-backed session/account storage. Middleware-level route protection. |
| **Autonomous on-chain payments** via Coinbase CDP | MPC wallets with no seed phrase management. Gasless USDC transfers on Base. Idempotency keys prevent duplicate tips. |
| **Live dashboard** with polling | Activity feed updates via 15-second polling. Hybrid server/client rendering — initial data is SSR, updates fetch via background interval. |
| **Free for everyone** | No billing integration, subscription tiers, or plan limits. All features included with no caps. |
| **Graceful degradation** | Every external dependency (Neon, CDP, Gemini, QStash, Telegram) is gated by a config-aware client that safely returns `null` when unconfigured. No import-time crashes. |

---

## Tech Stack (Why Each Choice)

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Unified server/client model. Server Components for dashboard data (SSR, zero JS). Route Handlers for API endpoints. Vercel-native. |
| Language | **TypeScript** (strict) | Full type safety across the stack — database rows (Supabase types), API payloads (Zod), AI output (Zod), environment config, component props. No `any` types. |
| Database | **Neon** (PostgreSQL) | Serverless Postgres with scale-to-zero. Connection pooling built-in. Drizzle ORM for type-safe queries with zero runtime overhead. |
| Auth | **Auth.js v5** | Email + password credentials. bcrypt password hashing. JWT sessions. Drizzle adapter for database-backed storage (accounts, sessions, verification tokens). |
| AI | **Gemini 2.5 Flash** + Vercel AI SDK | Fast inference (~1.5-3s). Structured output via Zod schema. Rate-limit retry logic (2 retries, 2s backoff). Falls back to `{ score: 0, should_tip: false }` on failure — never crashes the tip pipeline. |
| Wallets | **Coinbase CDP** (MPC) | No seed phrases, no private keys. Gasless USDC on Base. Production-grade wallet infrastructure from Coinbase. Pure TypeScript — deploys cleanly to Vercel serverless. |
| Blockchain | **Base** (Coinbase L2) | Sub-cent transaction fees. Native USDC. EVM-compatible. CDP Paymaster covers gas — contributors never need ETH. |
| Queue | **Upstash QStash** | HTTP-based message queue. No persistent process needed — works with Vercel serverless. 1K msgs/day free. Verifiable webhook signatures. |
| UI | **Tailwind CSS v4** + shadcn/ui | CSS-first configuration via `@theme`. Runtime dark theme with gold accent. `sonner` for toasts. |
| Deployment | **Vercel** | Zero-config Next.js. Serverless functions per route. Edge middleware for auth. Cron jobs for health checks. |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Auth group — login, register
│   ├── (dashboard)/                # Dashboard group — layout, community pages
│   ├── api/                        # Route handlers
│   │   ├── auth/[...nextauth]/
│   │   ├── auth/register/
│   │   ├── claim/verify, withdraw/
│   │   ├── community/, [id]/, verify-bot/
│   │   ├── community/[id]/feed/    # Activity feed polling endpoint
│   │   ├── health/
│   │   ├── jobs/evaluate/          # QStash job processor (tip engine)
│   │   └── webhook/[botToken]/     # Telegram webhook entry point
│   ├── claim/
│   ├── faq/
│   ├── onboard/                    # 4-step onboarding wizard
│   ├── privacy/, terms/, refund/
│   ├── layout.tsx                  # Root layout — dark theme, Toaster
│   ├── page.tsx                    # Landing page
│   └── globals.css                 # Tailwind v4 theme tokens
├── components/
│   ├── dashboard/                  # ActivityFeed, StatsRow, Leaderboard, TipEvent
│   ├── landing/                    # Hero, HowItWorks, Pricing
│   ├── onboarding/                 # StepIndicator, StepNameCommunity, etc.
│   └── ui/                         # shadcn/ui — button, card, dialog
├── db/
│   └── schema/                     # Drizzle schema — 11 tables
├── lib/
│   ├── auth.ts                     # Auth.js v5 config (Credentials, JWT, adapter)
│   ├── cdp/                        # Coinbase CDP — client, wallets, transfers
│   ├── db.ts                       # Neon Pool + Drizzle client
│   ├── gemini/                     # AI evaluation — schema, evaluate
│   ├── qstash/                     # Upstash QStash — client
│   ├── telegram/                   # Telegram — filters, notify
│   ├── config.ts                   # Server-side typed config
│   ├── client-config.ts            # Client-side typed config
│   └── utils.ts                    # cn() helper
├── middleware.ts                   # Auth.js session + route protection
└── types/
    └── database.ts                 # Database type definitions
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/valor.git
cd valor

# Install
npm install

# Set up environment
cp .env.production.example .env.local
# Fill in your credentials (see docs/CONTRIBUTING.md for detailed setup)

# Run
npm run dev

# Build
npm run build
```

---

## What This Project Demonstrates

| Skill | Evidence in Codebase |
|---|---|
| **React / Next.js** | App Router with route groups `(auth)`, `(dashboard)`; Server Components for data fetching; Client Components for polling; Route Handlers for APIs |
| **TypeScript (strict)** | Full typed config (`config.ts`), Zod-validated AI output (`schema.ts`), Drizzle schema types, no `any` types |
| **Server-Side Rendering** | Dashboard renders evaluations and stats server-side before any JS loads (`[communityId]/page.tsx`) |
| **Live dashboard** | Activity feed with 15-second polling — no WebSocket infrastructure needed |
| **Authentication** | Auth.js v5 with email + password credentials, bcrypt hashing, JWT sessions, middleware route protection |
| **Authorization** | Ownership checks in every API route (`getCommunity()` ownership gate) |
| **Async Architecture** | Webhook handler enqueues to QStash and returns immediately; the 12-step tip pipeline runs asynchronously (`jobs/evaluate`) |
| **Error Handling** | Rate-limit retry logic for Gemini (2 retries, backoff), CDP error classification (retryable vs non-retryable), graceful fallback for every external service |
| **Concurrency Safety** | `INSERT ... ON CONFLICT` for wallet creation (race-condition-free), idempotency keys for tip deduplication |
| **Cost Engineering** | Two-filter system (pure TS, ~0.1ms) eliminates 90%+ of messages before they reach paid Gemini API |
| **ORM Migration** | Migrated from Supabase client to Drizzle ORM + Neon Postgres — all 14 data-access files updated |
| **Blockchain Interaction** | CDP MPC wallet creation, USDC balance checks, ERC-20 transfers on Base, idempotent transfer execution |
| **Telegram Bot API** | Webhook registration/verification, message filtering, Markdown-formatted notifications, direct HTTP calls (no SDK) |
| **CI/CD Ready** | Vercel deployment config (`vercel.json`), cron job for health checks, production env template (`.env.production.example`) |

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)

---

## Developer

I'm a full-stack engineer who builds at the intersection of AI, blockchain, and real-time systems. I care about architecture that doesn't collapse under load, code that communicates intent, and products that work when external dependencies don't.

**Interested in this kind of work?** [Email me](mailto:your-email@example.com) — I'm always open to conversations about senior engineering roles where I can build infrastructure that matters.
