# Valor — Architecture Deep Dive

This document explains the system design, data flow, component tree, state philosophy, and security model. Written for engineers evaluating the codebase.

---

## System Overview

Valor is a serverless autonomous agent built on five primitives:

1. **Telegram Webhook** — event source. Every group message triggers the pipeline.
2. **Gemini + Vercel AI SDK** — reasoning layer. Evaluates message quality, returns structured decisions.
3. **Coinbase CDP** — financial execution layer. Creates MPC wallets, transfers USDC.
4. **Upstash QStash** — async queue. Decouples the webhook from the tip pipeline.
5. **Supabase** — state layer. PostgreSQL for persistence, Realtime for live dashboard, Auth for session management.

These primitives are loosely coupled. Each can be replaced or upgraded independently.

---

## Request Lifecycle (Complete Data Flow)

```
Telegram Group Message
         │
         ▼
┌──────────────────────────────────────────┐
│  POST /api/webhook/[botToken]           │
│  (Next.js Route Handler, <50ms)         │
│                                         │
│  1. Resolve community by botToken        │
│  2. Verify X-Telegram-Bot-Api-Secret     │
│  3. Run Filter 1 + Filter 2 (~0.1ms)    │
│  4. Enqueue to QStash                   │
│  5. Return 200 { ok: true }             │
└──────────────────────────────────────────┘
         │ QStash delivers to /api/jobs/evaluate
         ▼
┌──────────────────────────────────────────┐
│  POST /api/jobs/evaluate                │
│  (QStash job processor, up to 5min)     │
│                                         │
│   1. Verify QStash signature             │
│   2. Load community config               │
│   3. Plan limit check (RPC)              │
│   4. Idempotency key check               │
│   5. Gemini evaluation (structured out)  │
│   6. Rate limit check (3 Supabase reads) │
│   7. Wallet resolution (CDP)             │
│   8. Treasury balance check (CDP)        │
│   9. USDC transfer (CDP, Base chain)     │
│  10. Database writes (Supabase)          │
│  11. Telegram notification (async)       │
│  12. Treasury balance refresh            │
└──────────────────────────────────────────┘
```

**Key insight:** The webhook returns 200 in under 50ms. The heavy work (AI evaluation, blockchain transfer) happens asynchronously with no timeout constraint. This is what makes the architecture work on Vercel serverless while respecting Telegram's 10-second webhook timeout.

---

## Routing Architecture

```
src/app/
├── (auth)/                    # Route Group — no layout inheritance from dashboard
│   ├── login/page.tsx         # Public — email magic link form
│   └── callback/route.ts      # Public — Supabase auth code exchange
├── (dashboard)/               # Route Group — authenticated layout (sidebar)
│   ├── layout.tsx             # Server Component — auth check + sidebar
│   └── dashboard/
│       ├── page.tsx           # Redirects to first community
│       └── [communityId]/
│           ├── page.tsx       # Stats, Activity Feed, Leaderboard
│           └── settings/
│               └── page.tsx   # Client Component — scoring, context, bot status
├── api/                       # Route Handlers — no UI, bare JSON responses
│   ├── auth/signout/
│   ├── billing/checkout, webhook/
│   ├── claim/verify, withdraw/
│   ├── community/, [id]/, verify-bot/
│   ├── health/
│   ├── jobs/evaluate/
│   └── webhook/[botToken]/
├── claim/page.tsx             # Public — contributor withdrawal portal
├── onboard/page.tsx           # Authenticated — 4-step community setup wizard
├── faq/, privacy/, terms/, refund/  # Public — static content
└── page.tsx                   # Public — landing page
```

### Route Groups

The `(auth)` and `(dashboard)` route groups prevent layout inheritance. The dashboard layout adds a sidebar with community navigation; the auth pages have a centered card layout. These don't share a parent layout, which keeps each page's bundle minimal.

### Dynamic Routes

- `api/webhook/[botToken]` — Per-community webhook URL. Each community has a unique endpoint at `{appUrl}/api/webhook/{theirBotToken}`. The bot token in the URL path identifies the community. No need for a separate `community_id` parameter.
- `dashboard/[communityId]` — Per-community dashboard. Community ID is a UUID from the database. The settings page nests under this.

---

## Component Tree

```
RootLayout (dark theme, Toaster)
├── LandingPage (/)
│   ├── Hero
│   ├── HowItWorks
│   └── Pricing
├── LoginPage (/login)
│   └── Card (email form / magic link sent)
├── ClaimPage (/claim)
│   └── ClaimForm (Suspense-wrapped)
│       └── Card (wallet list, withdrawal forms)
├── OnboardPage (/onboard)
│   ├── StepIndicator
│   ├── StepNameCommunity
│   ├── StepConnectBot
│   ├── StepAddToGroup
│   └── StepFundTreasury
├── DashboardLayout (/(dashboard))
│   ├── Sidebar (community nav)
│   └── [communityId]/
│       ├── StatsRow
│       ├── ActivityFeed
│       │   └── TipEvent (per-item)
│       └── Leaderboard
└── StaticPages (/faq, /privacy, /terms, /refund)
```

### Client vs Server Component Boundary

- **Server Components (default):** Landing page, static pages, dashboard page (initial data fetch), dashboard layout, community list sidebar
- **Client Components:** Login form (interactive auth), onboarding wizard (multi-step state), settings page (form state), claim portal (Telegram auth + withdrawal), ActivityFeed (Realtime subscription)
- **Hybrid:** Dashboard `[communityId]/page.tsx` is a Server Component that passes initial data to the client-side ActivityFeed

---

## State Management Philosophy

Valor has zero global state libraries (no Redux, Zustand, Jotai). State is managed by:

### Server State — Supabase PostgreSQL
All persistent state lives in PostgreSQL. The application never derives state from in-memory variables. This includes:
- Community configuration (thresholds, tokens, balances)
- Evaluation records (scores, reasons, timestamps)
- Tip records (amounts, statuses, tx hashes)
- Wallet mappings (telegram_user_id → CDP wallet)
- Rate limits (daily tip counts, cooldowns)
- User subscriptions and plans

### Session State — Supabase Auth + Cookies
Authentication state is stored in HTTP-only cookies managed by `@supabase/ssr`. The middleware refreshes the session on every request. Server Components read the session via `createServerSupabase()`. Client Components read the session via `supabaseBrowser.auth.getSession()`.

### UI State — React `useState` + `useCallback`
Transient UI state (form inputs, step progress, loading flags) lives in individual components via `useState`. The onboarding wizard passes state between steps via callbacks (`handleNameNext`, `handleBotVerified`, `handleCommunityCreated`). No lifting to a global store — each page manages its own UI state.

### Real-time State — Supabase Realtime
Live activity feed state is managed by Supabase Realtime subscriptions. Initial data is server-rendered (SSR). New evaluations and tips arrive via PostgreSQL logical replication channels and are prepended to the feed. The subscription is scoped to the current community via `filter: community_id=eq.${communityId}`.

**Why no global store:** The app has no shared client-side state that spans multiple pages. Dashboard state is scoped to the community page. Onboarding state is scoped to the wizard. Claim state is scoped to the claim page. Adding a global store would increase bundle size and complexity with zero benefit.

---

## Config and Environment Architecture

Environment variables are validated at import time through two typed config modules:

### `lib/config.ts` (Server-only)
Validates server-side variables (API keys, secrets). Uses `warnEnv()` for critical variables (logs a warning if missing) and `optionalEnv()` for features that can degrade gracefully. Exports `serverConfig` with computed booleans:
- `hasSupabaseConfig` — gates all database operations
- `hasGeminiConfig` — gates AI evaluation
- `hasCdpConfig` — gates wallet operations
- `hasQstashConfig` — gates async job queue
- `hasPaddleConfig` — gates billing

### `lib/client-config.ts` (Client-safe)
Exposes only `NEXT_PUBLIC_*` variables. Same pattern — `warnEnv()` for critical vars, `optionalEnv()` for optional ones.

### Graceful Degradation Pattern
Every service client (Supabase, CDP, QStash, Paddle, Gemini) follows the same pattern:

```typescript
function getXxxClient(): XxxClient | null {
  if (!serverConfig.hasXxxConfig) return null;
  // ...initialize and return client
}
```

Callers check for `null` before using the client. If a service is unavailable, the app continues working with degraded functionality. The landing page, static pages, and claim portal require zero external services to render.

---

## Component Conventions

### Naming
- **Page components:** PascalCase, export as default (`export default function LoginPage()`)
- **UI components:** PascalCase, named export (`export function Button()`)
- **Route handlers:** Route Handlers follow the file-path convention (`app/api/community/[id]/route.ts`)
- **Files:** PascalCase for components, camelCase for utilities

### File Organization
- **One component per file** — no exceptions
- **shadcn/ui primitives** live in `components/ui/` — auto-generated, not edited
- **Page-specific components** live next to the page (e.g., landing components in `components/landing/`)
- **Shared components** go in `components/shared/` (currently empty — extracted when a component is used in 2+ pages)

### Error Handling
- All async operations have explicit try/catch with structured error logging
- Log format: `JSON.stringify({ step, error, ...context })` for grep-ability
- API routes return JSON error responses, never throw to the global handler
- External API calls (CDP, Gemini, Telegram) never throw — they return error objects

---

## Security Model

### Authentication
- Supabase Auth with email magic links — no password storage
- Server-side cookie sessions via `@supabase/ssr`
- Session refresh on every request via middleware
- No JWT manipulation on the client — Supabase handles token rotation

### Authorization (Route Level)
- Middleware whitelist: public paths (`/`, `/claim`, `/api/webhook`, `/api/health`, etc.)
- All other paths require authentication — redirects to `/login`
- Dashboard layout has a secondary auth check (defense in depth)

### Authorization (Data Level)
- API routes verify ownership before returning community data
- The `getCommunity(id)` helper checks `community.owner_user_id !== user.id`
- PATCH/DELETE operations go through the same ownership gate
- Service role Supabase client is used only in API routes — never exposed to the client

### Webhook Security
- Each community's Telegram webhook uses a derived secret token: `sha256(botToken + cronSecret)`
- The webhook handler verifies the `X-Telegram-Bot-Api-Secret-Token` header before processing
- QStash job processor verifies the `upstash-signature` header using the SDK's receiver utility
- Paddle webhook verifies the `paddle-signature` header using the SDK's signature validation

### Blockchain Security
- No private keys or seed phrases stored in the database
- CDP handles key sharding with MPC — the application never touches raw keys
- Wallet addresses are the only on-chain data stored in PostgreSQL
- Idempotency keys prevent duplicate tips from webhook retries or QStash redeliveries

### Abuse Prevention
Rate limiting has four independent layers:
1. **Pre-filter cost barrier** — 90%+ of messages never reach Gemini
2. **Daily tip limit** — configurable max tips per user per day (default: 3)
3. **Cooldown** — 30-minute minimum between tips to the same user
4. **Treasury balance check** — tips are only fired if the treasury has sufficient USDC + buffer

---

## Database Schema (7 Tables)

- `plans` — Subscription tier definitions (free / starter / pro / business)
- `users` — Mirrors Supabase `auth.users` for row-level references
- `subscriptions` — Active Paddle subscription tracking
- `communities` — Per-community configuration (thresholds, tokens, treasury)
- `wallets` — CDP wallet mappings (community + telegram_user → CDP wallet)
- `evaluations` — AI evaluation results (score, reason, should_tip)
- `tips` — Tip records with idempotency keys (prevents duplicates)
- `rate_limits` — Daily tip counting with atomic upsert

Key constraints:
- `wallets`: `UNIQUE(community_id, telegram_user_id)` — one wallet per user per community
- `tips`: `idempotency_key UNIQUE` — prevents duplicate tips
- `rate_limits`: `UNIQUE(community_id, telegram_user_id, date)` — one rate limit row per user per day per community
