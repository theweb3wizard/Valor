# Valor — Autonomous Community Rewards Engine

> **AI-powered quality evaluation + autonomous USDC rewards for Telegram communities. No commands. No voting. No humans in the loop.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)](https://supabase.com)
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
| **Multi-tenant SaaS auth** via Supabase email magic links | Passwordless auth with server-side session refresh. Middleware-level route protection with public-path whitelisting. |
| **Autonomous on-chain payments** via Coinbase CDP | MPC wallets with no seed phrase management. Gasless USDC transfers on Base. Idempotency keys prevent duplicate tips. |
| **Real-time dashboard** with Supabase Realtime | Live-updating activity feed via PostgreSQL logical replication. Hybrid server/client rendering — initial data is SSR, updates stream via WebSocket. |
| **Planned billing integration** via Paddle | Merchant-of-Record pattern. Subscription tier enforcement at the database level. The billing code ships ready but inactive until Paddle credentials are configured. |
| **Graceful degradation** | Every external dependency (Supabase, CDP, Gemini, QStash, Telegram) is gated by a config-aware client that safely returns `null` when unconfigured. No import-time crashes. |

---

## Tech Stack (Why Each Choice)

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Unified server/client model. Server Components for dashboard data (SSR, zero JS). Route Handlers for API endpoints. Vercel-native. |
| Language | **TypeScript** (strict) | Full type safety across the stack — database rows (Supabase types), API payloads (Zod), AI output (Zod), environment config, component props. No `any` types. |
| Database | **Supabase** (PostgreSQL) | Relational integrity (foreign keys, unique constraints). Realtime subscriptions via logical replication. Atomic RPC functions for concurrent-safe rate limiting. RLS for direct client queries. |
| Auth | **Supabase Auth** | Built on PostgreSQL. Email magic links (passwordless). Server-side cookie-based sessions via `@supabase/ssr`. Middleware-level route protection. |
| AI | **Gemini 2.5 Flash** + Vercel AI SDK | Fast inference (~1.5-3s). Structured output via Zod schema. Rate-limit retry logic (2 retries, 2s backoff). Falls back to `{ score: 0, should_tip: false }` on failure — never crashes the tip pipeline. |
| Wallets | **Coinbase CDP** (MPC) | No seed phrases, no private keys. Gasless USDC on Base. Production-grade wallet infrastructure from Coinbase. Pure TypeScript — deploys cleanly to Vercel serverless. |
| Blockchain | **Base** (Coinbase L2) | Sub-cent transaction fees. Native USDC. EVM-compatible. CDP Paymaster covers gas — contributors never need ETH. |
| Queue | **Upstash QStash** | HTTP-based message queue. No persistent process needed — works with Vercel serverless. 1K msgs/day free. Verifiable webhook signatures. |
| Billing | **Paddle** | Merchant of Record (handles global VAT/Sales tax). No monthly fee — only 5% + $0.50 per transaction. Ships ready, activates with env vars. |
| UI | **Tailwind CSS v4** + shadcn/ui | CSS-first configuration via `@theme`. Runtime dark theme with gold accent. `sonner` for toasts (replaces deprecated shadcn toast). |
| Deployment | **Vercel** | Zero-config Next.js. Serverless functions per route. Edge middleware for auth. Cron jobs for health checks. |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Auth group — login, callback
│   ├── (dashboard)/                # Dashboard group — layout, community pages
│   ├── api/                        # Route handlers
│   │   ├── auth/signout/
│   │   ├── billing/checkout, webhook/
│   │   ├── claim/verify, withdraw/
│   │   ├── community/, [id]/, verify-bot/
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
├── lib/
│   ├── cdp/                        # Coinbase CDP — client, wallets, transfers
│   ├── gemini/                     # AI evaluation — schema, evaluate
│   ├── paddle/                     # Paddle billing — client
│   ├── qstash/                     # Upstash QStash — client
│   ├── supabase/                   # Supabase — server, client, middleware
│   ├── telegram/                   # Telegram — filters, notify
│   ├── config.ts                   # Server-side typed config
│   ├── client-config.ts            # Client-side typed config
│   └── utils.ts                    # cn() helper
├── middleware.ts                   # Auth session + route protection
└── types/
    └── database.ts                 # Full Database type with Row/Insert/Update
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
| **React / Next.js** | App Router with route groups `(auth)`, `(dashboard)`; Server Components for data fetching; Client Components for Realtime; Route Handlers for APIs |
| **TypeScript (strict)** | Full typed config (`config.ts`), Zod-validated AI output (`schema.ts`), Supabase database types (`types/database.ts`), no `any` types |
| **Server-Side Rendering** | Dashboard renders evaluations and stats server-side before any JS loads (`[communityId]/page.tsx`) |
| **Real-time UI** | Supabase Realtime subscriptions in `ActivityFeed.tsx` — live-updating feed without polling |
| **Authentication** | Supabase email magic links, server-side cookie sessions, middleware route protection with public-path whitelist |
| **Authorization** | Row-Level Security in Supabase, ownership checks in every API route (`getCommunity()` ownership gate) |
| **Async Architecture** | Webhook handler enqueues to QStash and returns immediately; the 12-step tip pipeline runs asynchronously (`jobs/evaluate`) |
| **Error Handling** | Rate-limit retry logic for Gemini (2 retries, backoff), CDP error classification (retryable vs non-retryable), graceful fallback for every external service |
| **Concurrency Safety** | `INSERT ... ON CONFLICT` for wallet creation (race-condition-free), `upsert_rate_limit` atomic RPC, idempotency keys for tip deduplication |
| **Cost Engineering** | Two-filter system (pure TS, ~0.1ms) eliminates 90%+ of messages before they reach paid Gemini API |
| **Payment Integration** | Paddle checkout session creation, webhook verification, subscription lifecycle management (created/updated/cancelled/past_due) |
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
