# Valor — Architecture Deep Dive

This document explains the system design, data flow, component tree, state philosophy, and security model. Written for engineers evaluating the codebase.

---

## System Overview

Valor is a serverless autonomous agent built on five primitives:

1. **Telegram Webhook** — event source. Every group message triggers the pipeline.
2. **Gemini + Vercel AI SDK** — reasoning layer. Evaluates message quality, returns structured decisions.
3. **viem + Base** — financial execution layer. Deterministic per-community key derivation, USDC ERC-20 transfers.
4. **Upstash QStash** — async queue. Decouples the webhook from the tip pipeline.
5. **Neon + Drizzle** — state layer. Serverless Postgres via Neon, type-safe queries via Drizzle ORM.

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
│   3. Idempotency key check               │
│   4. Gemini evaluation (structured out)  │
│   5. Rate limit check (3 DB reads)       │
│   6. Wallet resolution (wallets table)   │
│   7. Treasury balance check (viem read)  │
│   8. USDC transfer (viem, Base chain)    │
│   9. Database writes (Drizzle)           │
│  11. Telegram notification (async)       │
│  12. Treasury balance refresh            │
└──────────────────────────────────────────┘
```

### Claim Portal Flow (Registration → Retry → Withdrawal)

```
Contributor visits /claim?user=<telegramUserId>
          │
          ▼
┌──────────────────────────────────────────┐
│  GET /api/claim/verify                   │
│  Returns per-community:                  │
│    - walletAddress (from wallets table)  │
│    - available (confirmed tips sum)      │
│    - pending (pending/no_wallet sum)     │
└──────────────────────────────────────────┘
          │
          ├── wallet not registered + pending tips exist →
          │   ┌──────────────────────────────────────────┐
          │   │  POST /api/claim/register                │
          │   │  1. Save walletAddress to wallets table   │
          │   │  2. retryPendingTips():                   │
          │   │     - Find pending/no_wallet tips         │
          │   │     - Check treasury USDC balance         │
          │   │     - Execute USDC transfers              │
          │   │     - Mark tips confirmed/failed          │
          │   │  3. Refresh treasury balance              │
          │   └──────────────────────────────────────────┘
          │
          └── wallet registered + confirmed tips exist →
              ┌──────────────────────────────────────────┐
              │  POST /api/claim/withdraw                 │
              │  1. Save/update walletAddress             │
              │  2. retryPendingTips() (same retry logic) │
              │  3. Execute USDC transfer to destination  │
              │  4. Update tip/wallet records             │
              └──────────────────────────────────────────┘
```

**Key insight:** The webhook returns 200 in under 50ms. The heavy work (AI evaluation, blockchain transfer) happens asynchronously with no timeout constraint. This is what makes the architecture work on Vercel serverless while respecting Telegram's 10-second webhook timeout.

---

## Routing Architecture

```
src/app/
├── (auth)/                    # Route Group — no layout inheritance from dashboard
│   ├── login/page.tsx         # Public — email + password form
│   └── register/page.tsx      # Public — registration form
├── (dashboard)/               # Route Group — authenticated layout (sidebar)
│   ├── layout.tsx             # Server Component — auth check + sidebar + mobile nav
│   └── dashboard/
│       ├── page.tsx           # Redirects to first community
│       └── [communityId]/
│           ├── page.tsx       # Stats, Activity Feed (polling), Leaderboard
│           └── settings/
│               └── page.tsx   # Client Component — scoring, context, bot status
├── api/                       # Route Handlers — no UI, bare JSON responses
│   ├── auth/[...nextauth]/    # Auth.js handler (GET + POST)
│   ├── auth/register/         # Registration with bcrypt
│   ├── claim/register/          # Wallet registration + pending tip retry
│   ├── claim/verify, withdraw/
│   ├── community/, [id]/, verify-bot/
│   ├── community/[id]/feed/   # Polling endpoint for activity feed
│   ├── community/[id]/re-register-webhook/
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
│       └── Card (wallet list, pending + available totals, register + withdraw forms)
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

### Server State — Neon PostgreSQL via Drizzle
All persistent state lives in Postgres on Neon. The application uses **Drizzle ORM** for all queries — never raw SQL. This includes:
- Community configuration (thresholds, tokens, balances)
- Evaluation records (scores, reasons, timestamps)
- Tip records (amounts, statuses, tx hashes)
- Wallet mappings (telegram_user_id → contributor's wallet address)
- Rate limits (daily tip counts, cooldowns)
- Auth sessions, accounts, and verification tokens (via Auth.js Drizzle adapter)

### Session State — Auth.js + JWT + Cookies
Authentication state is managed by **Auth.js v5** using the `credentials` provider with bcrypt password hashing. Sessions use JWT strategy (no database session lookups on every request). The middleware protects routes with a public-path whitelist. Server Components read the session via `auth()`. Client Components communicate through API routes.

### UI State — React `useState` + `useCallback`
Transient UI state (form inputs, step progress, loading flags) lives in individual components via `useState`. The onboarding wizard passes state between steps via callbacks. No lifting to a global store — each page manages its own UI state.

### Live Feed State — Polling (15-second interval)
The activity feed uses **15-second polling** via `setInterval` to a dedicated API endpoint (`/api/community/[id]/feed?since=<timestamp>`). Initial data is server-rendered (SSR). New evaluations and tips are fetched as JSON and prepended to the feed. No WebSocket or Realtime infrastructure needed.

### Pending Tip Retry State — DB-Driven Recovery
When a tip fails because the user has no registered wallet, it's written as `transactionStatus: 'pending'` with `failureReason: 'no_wallet'`. No in-memory queue, no retry scheduler — the state lives in the database. When the user later registers their wallet (via `/api/claim/register` or during a withdrawal), `retryPendingTips()` queries for all such tips and processes them. This means the retry is idempotent, survives server restarts, and requires zero infrastructure.

**Why no global store:** The app has no shared client-side state that spans multiple pages. Dashboard state is scoped to the community page. Onboarding state is scoped to the wizard. Claim state is scoped to the claim page. Adding a global store would increase bundle size and complexity with zero benefit.

---

## Config and Environment Architecture

Environment variables are validated at import time through two typed config modules:

### `lib/config.ts` (Server-only)
Validates server-side variables (API keys, secrets). Uses `warnEnv()` for critical variables (logs a warning if missing — evaluates to blank string) and `optionalEnv()` for features that can degrade gracefully. Also checks for **placeholder values** (`"v"`, `"your-"`, `"changeme"`, etc.) and treats them as unconfigured. Exports `serverConfig` with computed booleans:
- `hasDatabaseConfig` — gates all database operations
- `hasGeminiConfig` — gates AI evaluation
- `hasTreasuryConfig` — gates on-chain operations
- `hasQstashConfig` — gates async job queue
- `hasCronSecret` — gates webhook secret verification

### `lib/client-config.ts` (Client-safe)
Exposes only `NEXT_PUBLIC_*` variables. Same pattern — `warnEnv()` for critical vars, `optionalEnv()` for optional ones.

### Graceful Degradation Pattern
Every service client (Neon/Drizzle, viem, QStash, Gemini) follows the same pattern:

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
- External API calls (viem, Gemini, Telegram) never throw — they return error objects

---

## Security Model

### Authentication
- Auth.js v5 with credentials provider — email + password with bcrypt hashing
- JWT session strategy (no DB lookups on every request)
- Middleware protects all routes except public whitelist
- Registration endpoint hashes passwords before storing in users table

### Authorization (Route Level)
- Middleware whitelist: public paths (`/`, `/login`, `/register`, `/claim`, `/api/webhook`, `/api/health`, `/api/auth`, `/faq`, `/privacy`, `/terms`, `/refund`)
- All other paths require authentication — redirects to `/login`
- Dashboard layout has a secondary auth check (defense in depth)

### Authorization (Data Level)
- API routes verify ownership before returning community data
- The `getCommunity(id)` helper checks `community.owner_user_id !== user.id`
- PATCH/DELETE operations go through the same ownership gate

### Webhook Security
- Each community's Telegram webhook uses a derived secret token: `sha256(botToken + cronSecret)`
- The webhook handler verifies the `X-Telegram-Bot-Api-Secret-Token` header before processing
- QStash job processor verifies the `upstash-signature` header using the SDK's receiver utility

### Blockchain Security
- A single master private key is stored in env vars (never in the DB)
- Per-community wallets are derived deterministically via `keccak256(masterKey + communityId)` — no per-community keys stored
- The master key only needs a small ETH balance for gas (~$0.10 on Base funds thousands of txns)
- **Gas sponsorship:** When a community treasury is created, 0.0005 ETH is automatically sent from the master key to the community's derived address — community owners don't need to worry about gas, only USDC
- **Pending tip retry:** Tips that fail due to missing wallet are stored as `pending` with `failureReason: 'no_wallet'`. When a user registers their wallet (via the claim portal or withdrawal), `retryPendingTips()` re-processes all pending tips — checking balance, executing transfers, and marking them confirmed
- Idempotency keys prevent duplicate tips from webhook retries or QStash redeliveries
- This is a portfolio project — not intended for production with real funds

### Abuse Prevention
Rate limiting has four independent layers:
1. **Pre-filter cost barrier** — 90%+ of messages never reach Gemini
2. **Daily tip limit** — configurable max tips per user per day (default: 3)
3. **Cooldown** — 30-minute minimum between tips to the same user
4. **Treasury balance check** — tips are only fired if the treasury has sufficient USDC + buffer

### Pending Tip Recovery
If a tip passes all abuse checks but the user doesn't have a wallet registered, the tip is stored as `pending` with `failureReason: 'no_wallet'`. This is not a failure — it's deferred delivery. When the user registers a wallet on the claim portal:
1. Wallet address is saved to the `wallets` table
2. `retryPendingTips()` finds all matching pending tips
3. Treasury balance is re-checked (it may have changed since the tip was evaluated)
4. If sufficient, USDC is transferred and tip is marked `confirmed`
5. If insufficient, tip is marked `failed` with `failureReason: 'insufficient_treasury'`

This means contributors never lose earned tips — they just need to show up with a wallet address to collect them.

---

## Database Schema (11 Tables via Drizzle ORM)

### Core Tables
- `plans` — Plan definitions (legacy, unused — no plan limits enforced)
- `users` — Application users with email, name, bcrypt password hash
- `subscriptions` — Subscription tracking (legacy, unused — app is free)
- `communities` — Per-community configuration (thresholds, tokens, treasury, scoring params)
- `wallets` — Contributor wallet address mappings (community + telegram_user → their address)
- `evaluations` — AI evaluation results (score, reason, should_tip)
- `tips` — Tip records with idempotency keys (prevents duplicates). Statuses: `pending` (deferred — no wallet or retry pending), `confirmed` (delivered on-chain), `failed` (insufficient balance or other error)
- `rate_limits` — Daily tip counting with atomic upsert

### Auth.js Adapter Tables
- `accounts` — OAuth/credentials account links (OAuth not used, schema for adapter compatibility)
- `sessions` — Auth.js sessions tracked for JWT strategy
- `verificationTokens` — Verification token storage (for future email verification)

### Key Constraints
- `wallets`: `UNIQUE(community_id, telegram_user_id)` — one wallet per user per community
- `tips`: `idempotency_key UNIQUE` — prevents duplicate tips
- `rate_limits`: `UNIQUE(community_id, telegram_user_id, date)` — one rate limit row per user per day per community

### Drizzle ORM Patterns
All queries use Drizzle's type-safe query builder — no raw SQL except for the rate limit upsert. Example patterns:
- `db.select().from(schema.communities).where(eq(schema.communities.id, id))`
- `db.insert(schema.tips).values({...}).returning()`
- Numeric columns from `pg` return as `string` — use `Number()` where arithmetic is needed
- Timestamp columns return `Date | null` — use `.toISOString()` for serialization

---

## Per-Community Treasury Wallet Derivation

Instead of using an MPC wallet provider (like Coinbase CDP), Valor uses **deterministic key derivation** from a single master private key:

### How It Works

1. **Master key** (`TREASURY_PRIVATE_KEY` env var) — a random 32-byte hex string. This is the only secret you manage.
2. **Community derivation** — for each community, an account is derived as:

   ```
   communityKey = keccak256(abi.encodePacked(masterKey, communityId))
   communityAddress = privateKeyToAccount(communityKey).address
   ```

3. **Community owner funds** the derived `communityAddress` with USDC (not the master address).
4. **When tipping**, the app re-derives the key, creates a viem wallet client, and signs a USDC `transfer()` transaction.
5. **Gas** is paid from the derived key's ETH balance. On treasury creation, `createCommunityTreasury()` automatically sends 0.0005 ETH from the master key to the derived key — this covers ~300+ transactions per community. Community owners only need to fund USDC.

### Why This Approach

- **No third-party dependency** — no CDP SDK, no API keys, no MPC infrastructure
- **No private keys in the database** — keys are derived on-the-fly from the master secret + community ID
- **Deterministic** — the same community always gets the same address, even across app restarts
- **Portfolio-safe** — you can run the entire app without funding any wallet. The chain code compiles and the architecture is visible, but transfers only execute when a funded key is configured.
