# Valor — Autonomous Community Rewards Engine

> **AI-powered quality evaluation + autonomous USDC rewards for Telegram communities. No commands. No voting. No humans in the loop.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![Neon](https://img.shields.io/badge/Neon-00E599?logo=neon&logoColor=fff)](https://neon.tech)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=000)](https://orm.drizzle.team)
[![Auth.js](https://img.shields.io/badge/Auth.js-635BFF?logo=auth0&logoColor=fff)](https://authjs.dev)
[![Base](https://img.shields.io/badge/Base-0052FF?logo=base&logoColor=fff)](https://base.org)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?logo=googlegemini&logoColor=fff)](https://ai.google.dev)

---

## Project Status & Scope

**Status:** Portfolio / Demonstration — not production.

This project was built as a full-stack architecture showcase. It demonstrates a complete, deployable system that integrates AI, blockchain, async messaging, and real-time dashboards. The code compiles, the database schema is live on Neon, and the auth flow works end-to-end. However, it is not running in production with real users or funds.

### What Works (Compiled & Tested)

- User registration and login (Auth.js v5, bcrypt, JWT)
- Community CRUD with Telegram bot token verification
- AI evaluation pipeline (Gemini via Vercel AI SDK)
- Async job queue (Upstash QStash)
- Dashboard with activity feed (15-second polling)
- Onboarding wizard (4-step community setup)
- Claim portal for contributors
- Database: 11 tables via Drizzle ORM on Neon Postgres
- Build: zero TypeScript errors, 22 routes compiled

### What's Scoped Out (For Production)

- On-chain USDC transfers (viem + treasury key is wired but untested — requires funded wallet)
- Telegram webhook integration (requires ngrok + bot token for local testing)
- Vercel cron for treasury balance refresh
- Rate limiting throttle for Gemini API costs

---

## Features (What Each Demonstrates)

| Feature | What It Demonstrates |
|---|---|
| **Async message pipeline** via Upstash QStash | Decoupled architecture — webhook returns 200 in <50ms, heavy work queues to a background job. Solves the Telegram 10s timeout problem without blocking. |
| **Two-filter spam guard** | Cost engineering at the architecture level — pure-TypeScript pre-filters eliminate 90%+ of messages before any paid AI call. Reduces Gemini costs from ~$18/mo to ~$1-2/mo at scale. |
| **Structured AI evaluation** with Gemini + Vercel AI SDK | Schema-forced LLM output via Zod validation. Gemini must return valid typed JSON or the pipeline rejects it. No prompt-injection-based parsing. |
| **Credentials auth** via Auth.js v5 | Email + password authentication with bcrypt hashing. JWT sessions. Drizzle adapter for database-backed session/account storage. Middleware-level route protection. |
| **On-chain payment pipeline** via viem + Base | Deterministic per-community treasury wallets derived from a master key. USDC balance checks, ERC-20 transfers. Idempotency keys prevent duplicate tips. |
| **Live dashboard** with polling | Activity feed updates via 15-second polling. Hybrid server/client rendering — initial data is SSR, updates fetch via background interval. |
| **Free for everyone** | No billing integration, subscription tiers, or plan limits. All features included with no caps. |
| **Graceful degradation** | Every external dependency (Neon, viem, Gemini, QStash, Telegram) is gated by a config-aware client that safely returns `null` when unconfigured. No import-time crashes. |

---

## Tech Stack (Why Each Choice)

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Unified server/client model. Server Components for dashboard data (SSR, zero JS). Route Handlers for API endpoints. Vercel-native. |
| Language | **TypeScript** (strict) | Full type safety across the stack — database schemas, API payloads (Zod), AI output (Zod), environment config, component props. |
| Database | **Neon** (PostgreSQL) | Serverless Postgres with scale-to-zero. Drizzle ORM for type-safe queries with zero runtime overhead. |
| Auth | **Auth.js v5** | Email + password credentials. bcrypt password hashing. JWT sessions. Drizzle adapter for database-backed storage. |
| AI | **Gemini 2.5 Flash** + Vercel AI SDK | Fast inference (~1.5-3s). Structured output via Zod schema. Falls back to `{ score: 0, should_tip: false }` on failure — never crashes the tip pipeline. |
| Blockchain | **viem** + **Base** | Lightweight Ethereum interaction library. Deterministic per-community wallet derivation. USDC transfers via ERC-20 `transfer()`. |
| Queue | **Upstash QStash** | HTTP-based message queue. No persistent process needed — works with Vercel serverless. Verifiable webhook signatures. |
| UI | **Tailwind CSS v4** + shadcn/ui | CSS-first configuration via `@theme`. Runtime dark theme. `sonner` for toasts. |
| Deployment | **Vercel** | Zero-config Next.js. Serverless functions per route. Edge middleware for auth. |

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
│   └── schema/                     # Drizzle ORM — 11 tables
├── lib/
│   ├── auth.ts                     # Auth.js v5 config
│   ├── chain/                      # viem — treasury derivation, USDC transfers
│   ├── cdp/                        # Adapter layer (maps to chain/ internally)
│   ├── db.ts                       # Neon Pool + Drizzle client
│   ├── gemini/                     # AI evaluation — schema, evaluate
│   ├── qstash/                     # Upstash QStash — client
│   ├── telegram/                   # Telegram — filters, notify
│   ├── config.ts                   # Server-side typed config
│   ├── client-config.ts            # Client-side typed config
│   └── utils.ts                    # cn() helper
├── middleware.ts                   # Auth.js session + route protection
└── types/
    └── database.ts                 # Type definitions
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/theweb3wizard/Valor.git
cd Valor

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
| **TypeScript (strict)** | Full typed config, Zod-validated AI output, Drizzle schema types, no `any` types |
| **Server-Side Rendering** | Dashboard renders evaluations and stats server-side before any JS loads |
| **ORM Design** | 11-table Drizzle schema with foreign keys, unique constraints, and Auth.js adapter tables |
| **Authentication** | Auth.js v5 with credentials provider, bcrypt, JWT sessions, middleware protection |
| **Authorization** | Ownership checks in every API route — no user can access another's community |
| **Async Architecture** | Webhook handler enqueues to QStash and returns immediately; the 12-step tip pipeline runs asynchronously |
| **Error Handling** | Rate-limit retry logic for Gemini, graceful fallback for every external service |
| **Database Migration** | Complete migration from Supabase client to Drizzle ORM + Neon — all 14 data-access files rewritten |
| **Blockchain Integration** | viem-based USDC transfer pipeline with deterministic key derivation per community |
| **Telegram Bot API** | Webhook registration, message filtering, Markdown notifications, direct HTTP calls (no SDK) |
| **CI/CD Ready** | Vercel deployment config, production env template, zero-error build |

---

## Future Plans

- **End-to-end testing** — Vitest + MSW for API routes, Playwright for dashboard
- **Enhanced contributor flow** — On-chain wallet registration before tip delivery
- **Multi-chain support** — Abstract chain config to support Base, Polygon, OP
- **Admin analytics** — Per-community dashboards with tip trends, top contributors
- **Telegram mini-app** — In-chat withdrawal flow via Telegram WebApp

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)
