# Agent.md — Valor 2.0: Cursor AI Execution Playbook

> **Phase 2 Deliverable | Zero-Budget Production Build**
> Based on: Revive.md architectural blueprint
> Purpose: Feed directly into Cursor AI (or any agentic code builder) to build Valor 2.0 from scratch

---

## VERIFIED STACK (Research-Confirmed, June 2026)

All versions and free tiers confirmed via live research before this document was written.

| Tool | Version | Free Tier |
|---|---|---|
| **Next.js** | 16.2.6 (latest stable) | ✅ MIT license |
| **TypeScript** | 6.0 (stable, Mar 2026) | ✅ MIT license |
| **Node.js** | 24 LTS (Krypton — active LTS) | ✅ MIT license |
| **Tailwind CSS** | 4.1.x (v4 stable) | ✅ MIT license |
| **shadcn/ui** | Latest (Tailwind v4 + React 19 compatible) | ✅ MIT license |
| **Vercel AI SDK** | ai@6.x + @ai-sdk/google | ✅ MIT license |
| **Gemini** | gemini-2.5-flash (free: 10 RPM, 250 RPD) | ✅ Free tier exists |
| **Supabase** | Latest JS client (@supabase/supabase-js) | ✅ 500MB DB, 50K MAUs, 2M Realtime msgs |
| **Coinbase CDP** | @coinbase/cdp-sdk latest | ✅ 5,000 wallet ops/month free |
| **Upstash QStash** | @upstash/qstash latest | ✅ 1,000 messages/day free |
| **Paddle** | @paddle/paddle-node-sdk latest | ✅ No monthly fee (5% + $0.50 per txn only) |
| **Vercel** | Platform (Hobby plan) | ✅ Free (serverless functions included) |
| **viem** | Latest stable | ✅ MIT license |

**Free Tier Usage Reality Check:**
- Gemini 250 RPD free: with the two-filter system blocking 90%+ of messages, a community of 500 members generating 200 messages/day produces ~20 Gemini calls/day. Well within free tier.
- CDP 5,000 ops/month free: a new user tip = ~5 ops (wallet create + sign + broadcast). Existing user tip = ~2 ops. Covers ~700+ tips/month before any cost.
- QStash 1,000 msgs/day free: identical to Gemini evaluation volume. Not a constraint at MVP scale.
- Supabase free: pauses after 7 days of inactivity — mitigation is built into Prompt 19.

---

## AGENT GUARDRAIL INSTRUCTIONS

**These rules are absolute. The coding agent must not deviate from them under any circumstances, regardless of what seems easier or more familiar.**

### Hard Bans
1. **NEVER use `node-telegram-bot-api`** — use direct HTTP calls to `api.telegram.org` only
2. **NEVER use Firebase Genkit** — use `ai` (Vercel AI SDK v6) with `@ai-sdk/google` provider exclusively
3. **NEVER use `@tetherto/wdk-wallet-evm`** or any WDK package — use `@coinbase/cdp-sdk` exclusively
4. **NEVER implement BIP-44 seed derivation** — wallet creation is entirely through CDP API calls
5. **NEVER store a seed phrase, private key, or wallet secret** anywhere in the codebase
6. **NEVER use the Next.js Pages Router** — App Router only throughout
7. **NEVER create a `tailwind.config.js` or `tailwind.config.ts`** — Tailwind v4 uses CSS-only configuration via `@theme` in globals.css
8. **NEVER use `tailwindcss-animate`** — use `tw-animate-css` (Tailwind v4 replacement)
9. **NEVER use `toast` from shadcn/ui** — use `sonner` (Tailwind v4 shadcn deprecation)
10. **NEVER use `forwardRef`** — shadcn/ui for Tailwind v4 / React 19 has removed it

### Mandatory Patterns
1. **Telegram webhook must return HTTP 200 immediately** — enqueue to QStash first, respond, then process
2. **Every tip execution must check an idempotency key first** — computed as SHA-256 of `community_id + telegram_user_id + telegram_message_id`
3. **All CDP operations are server-side only** — never expose CDP API key to client
4. **All Supabase writes from API routes use the service role key** — never the anon key on the server
5. **All Supabase reads from client components use the anon key with RLS enforced**
6. **Multi-tenancy is resolved by `bot_token`** — every webhook request identifies its community via the bot token in the URL path
7. **Rate limit increments must use the atomic `upsert_rate_limit` RPC** — never a read-modify-write in application code
8. **Wallet creation uses `INSERT ... ON CONFLICT DO NOTHING RETURNING *`** — concurrent safety via DB constraint
9. **TypeScript strict mode is always on** — no `any` types, no `@ts-ignore` without explanation
10. **All environment variables are validated at startup** via a typed config module — missing vars throw at build time, not runtime

### Code Quality Rules
- Every file has a single, clear responsibility
- No file exceeds 200 lines — split into modules before that
- All async operations have explicit error handling
- All external API calls (CDP, Gemini, Telegram) have try/catch with structured error logging
- Database schema changes are done via SQL migration files only — never via the Supabase dashboard UI without a corresponding migration file in the codebase
- No hardcoded strings — all config values come from the typed config module

---

## FOLDER STRUCTURE (Final Target)

```
valor-2/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── dashboard/[communityId]/page.tsx
│   │   └── dashboard/[communityId]/settings/page.tsx
│   ├── (marketing)/
│   │   └── page.tsx                    ← Landing page
│   ├── claim/page.tsx
│   ├── onboard/page.tsx
│   └── api/
│       ├── webhook/[botToken]/route.ts  ← Telegram webhook (per-community)
│       ├── jobs/evaluate/route.ts       ← QStash job processor
│       ├── billing/checkout/route.ts    ← Paddle checkout session
│       ├── billing/webhook/route.ts     ← Paddle webhook handler
│       ├── community/route.ts           ← Community CRUD
│       ├── community/[id]/route.ts
│       └── health/route.ts              ← Uptime ping (prevents Supabase pause)
├── components/
│   ├── ui/                              ← shadcn/ui components (auto-generated)
│   ├── dashboard/
│   │   ├── ActivityFeed.tsx
│   │   ├── StatsRow.tsx
│   │   ├── Leaderboard.tsx
│   │   └── TipEvent.tsx
│   ├── onboarding/
│   │   ├── StepIndicator.tsx
│   │   └── steps/
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Pricing.tsx
│   └── shared/
│       ├── TreasuryBalance.tsx
│       └── CommunitySelector.tsx
├── lib/
│   ├── config.ts                        ← Typed env var validation
│   ├── supabase/
│   │   ├── server.ts                    ← Service role client
│   │   ├── client.ts                    ← Anon key client (browser)
│   │   └── middleware.ts                ← Auth session refresh
│   ├── cdp/
│   │   ├── client.ts                    ← CDP SDK singleton
│   │   ├── wallets.ts                   ← Wallet creation/lookup
│   │   └── transfers.ts                 ← USDC transfer execution
│   ├── gemini/
│   │   ├── evaluate.ts                  ← AI evaluation flow
│   │   └── schema.ts                    ← Zod output schema
│   ├── telegram/
│   │   ├── webhook.ts                   ← Signature verification
│   │   ├── notify.ts                    ← Outbound message sending
│   │   └── filters.ts                   ← Filter 1 + Filter 2 logic
│   ├── qstash/
│   │   └── client.ts                    ← QStash publisher
│   ├── paddle/
│   │   └── client.ts                    ← Paddle SDK singleton
│   └── tip/
│       ├── execute.ts                   ← Full tip execution pipeline
│       ├── ratelimit.ts                 ← Rate limit checks
│       └── idempotency.ts               ← Idempotency key generation
├── types/
│   ├── database.ts                      ← Supabase generated types
│   └── index.ts                         ← Shared app types
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_rpc_functions.sql
├── middleware.ts                         ← Supabase auth session + route protection
├── globals.css                           ← Tailwind v4 @theme configuration
└── .env.local                            ← Environment variables (never commit)
```

---

## PROMPT ZERO — Project Initialization

**Objective:** Scaffold the project with the exact correct versions, folder structure, and initial configuration. Nothing more.

**Instructions for the coding agent:**

Initialize a new Next.js project using the create-next-app CLI configured for Next.js 16, TypeScript 6, Tailwind CSS v4, and the App Router. The project name is `valor-2`. During initialization, select: TypeScript yes, ESLint yes, Tailwind CSS yes, `src/` directory no, App Router yes, Turbopack yes.

After scaffolding, verify the `package.json` shows `"next": "^16.x.x"`. If it shows version 15 or below, the initialization used a stale CLI cache — delete the project and reinstall with `npx create-next-app@latest`.

Install the following package groups in separate commands to make errors easy to diagnose:

Group 1 — Supabase: `@supabase/supabase-js @supabase/ssr`

Group 2 — AI: `ai @ai-sdk/google zod`

Group 3 — CDP: `@coinbase/cdp-sdk viem`

Group 4 — Queue: `@upstash/qstash`

Group 5 — Billing: `@paddle/paddle-node-sdk`

Group 6 — UI utilities: `sonner next-themes clsx tailwind-merge`

Group 7 — Dev dependencies: `tw-animate-css`

Initialize shadcn/ui using `npx shadcn@latest init`. When prompted, choose: style `new-york`, base color `neutral`, CSS variables yes. This will configure for Tailwind v4 automatically in June 2026.

Install these specific shadcn components: `npx shadcn@latest add button card badge separator skeleton tabs dialog sheet progress`.

Create the complete folder structure as specified in the Folder Structure section of this document. Create every directory and an empty `.gitkeep` file in each empty leaf folder so the structure is committed correctly.

Create a `.env.local` file with every environment variable listed below as empty strings. The coding agent must never populate these with real values — that is the developer's responsibility.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GEMINI_API_KEY=

# Coinbase CDP
CDP_API_KEY_NAME=
CDP_API_KEY_PRIVATE_KEY=
CDP_NETWORK_ID=base-mainnet

# Upstash QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Paddle
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

Verify the project runs with `npm run dev` before proceeding. Fix any TypeScript or import errors before calling this prompt complete.

---

## PROMPT 1 — Typed Configuration & Environment Validation

**Objective:** Create a single, typed configuration module that validates all environment variables at startup. If any required variable is missing, the application must fail to build, not fail silently at runtime.

**File to create:** `lib/config.ts`

**Instructions for the coding agent:**

In `lib/config.ts`, create a configuration module that reads every environment variable defined in `.env.local` and validates their presence. Variables with `NEXT_PUBLIC_` prefix are accessible on the client; all others are server-only.

The module must export two typed objects: `serverConfig` (server-only vars) and `clientConfig` (public vars). The `serverConfig` object must throw a descriptive error at module load time if any server variable is undefined or an empty string. Include the variable name in the error message.

Define the following type-safe config properties:
- `supabaseUrl`, `supabaseAnonKey`, `supabaseServiceRoleKey`
- `geminiApiKey`
- `cdpApiKeyName`, `cdpApiKeyPrivateKey`, `cdpNetworkId`
- `qstashToken`, `qstashCurrentSigningKey`, `qstashNextSigningKey`
- `paddleApiKey`, `paddleWebhookSecret`
- `appUrl`
- `cronSecret`

Also export a `clientConfig` with: `supabaseUrl`, `supabaseAnonKey`, `paddleClientToken`, `paddleEnvironment`, `appUrl`.

This file should have zero external dependencies outside of Node.js built-ins. No SDK imports here.

---

## PROMPT 2 — Supabase Database Schema

**Objective:** Write all three migration SQL files that define the complete database schema, all Row Level Security policies, and all stored procedures. This is the foundation everything else builds on.

**Files to create:**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_rpc_functions.sql`

**Instructions for the coding agent:**

**Migration 001 — Initial Schema:**

Create the following tables in this exact order (respecting foreign key dependencies):

`plans` — stores the four subscription tiers. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `name TEXT NOT NULL UNIQUE` (values: 'free', 'starter', 'pro', 'business'), `price_monthly NUMERIC NOT NULL`, `max_communities INTEGER NOT NULL` (-1 = unlimited), `max_evals_monthly INTEGER NOT NULL` (-1 = unlimited), `max_tips_monthly INTEGER NOT NULL` (-1 = unlimited), `paddle_price_id TEXT` (Paddle price ID for checkout), `created_at TIMESTAMPTZ DEFAULT NOW()`.

`users` — mirrors Supabase auth.users. Columns: `id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE`, `email TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`.

`subscriptions` — tracks active Paddle subscriptions. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `plan_id UUID NOT NULL REFERENCES plans(id)`, `paddle_subscription_id TEXT UNIQUE`, `paddle_customer_id TEXT`, `status TEXT NOT NULL DEFAULT 'active'` (values: 'active', 'cancelled', 'past_due', 'trialing'), `current_period_end TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Add index on `user_id`.

`communities` — one row per Telegram community. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `plan_id UUID REFERENCES plans(id)`, `name TEXT NOT NULL`, `telegram_chat_id TEXT NOT NULL UNIQUE`, `bot_token TEXT NOT NULL UNIQUE`, `tip_amount_low NUMERIC NOT NULL DEFAULT 1` (tip for score 7-8), `tip_amount_high NUMERIC NOT NULL DEFAULT 2` (tip for score 9-10), `daily_limit_per_user INTEGER NOT NULL DEFAULT 3`, `min_score INTEGER NOT NULL DEFAULT 7`, `treasury_wallet_id TEXT` (CDP wallet ID for this community's treasury), `treasury_address TEXT`, `usdc_balance NUMERIC NOT NULL DEFAULT 0`, `eval_context TEXT DEFAULT ''` (custom community context for Gemini), `is_active BOOLEAN NOT NULL DEFAULT true`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Add index on `owner_user_id` and on `bot_token`.

`wallets` — contributor wallets managed by CDP. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE`, `telegram_user_id TEXT NOT NULL`, `username TEXT NOT NULL`, `cdp_wallet_id TEXT NOT NULL` (CDP API wallet ID), `wallet_address TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Add `UNIQUE(community_id, telegram_user_id)`. Add index on `wallet_address`.

`evaluations` — every AI evaluation result. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE`, `telegram_user_id TEXT NOT NULL`, `username TEXT NOT NULL`, `telegram_message_id BIGINT NOT NULL`, `message_content TEXT NOT NULL`, `score INTEGER NOT NULL`, `reason TEXT NOT NULL`, `should_tip BOOLEAN NOT NULL DEFAULT false`, `evaluated_at TIMESTAMPTZ DEFAULT NOW()`. Add index on `(community_id, evaluated_at DESC)`.

`tips` — every attempted tip. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE`, `evaluation_id UUID REFERENCES evaluations(id)`, `telegram_user_id TEXT NOT NULL`, `username TEXT NOT NULL`, `amount NUMERIC NOT NULL`, `wallet_address TEXT`, `cdp_transfer_id TEXT`, `tx_hash TEXT`, `transaction_status TEXT NOT NULL DEFAULT 'pending'` (values: 'pending', 'confirmed', 'failed'), `idempotency_key TEXT NOT NULL UNIQUE`, `tipped_at TIMESTAMPTZ DEFAULT NOW()`. Add index on `(community_id, tipped_at DESC)`.

`rate_limits` — daily tip tracking per user per community. Columns: `id UUID PK DEFAULT gen_random_uuid()`, `community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE`, `telegram_user_id TEXT NOT NULL`, `tips_today INTEGER NOT NULL DEFAULT 0`, `last_tip_at TIMESTAMPTZ`, `date DATE NOT NULL DEFAULT CURRENT_DATE`. Add `UNIQUE(community_id, telegram_user_id, date)`.

After all tables, enable Supabase Realtime on `evaluations` and `tips` tables using `ALTER PUBLICATION supabase_realtime ADD TABLE evaluations, tips;`.

Also insert the four plan rows for 'free', 'starter', 'pro', and 'business' with prices 0, 29, 79, and 179 respectively and their corresponding limits as defined in Revive.md. The free plan has max_communities=1, max_evals_monthly=100, max_tips_monthly=10. Starter: 1, 2000, 200. Pro: 5, 10000, 1000. Business: -1, -1, -1.

**Migration 002 — RLS Policies:**

Enable RLS on ALL tables: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;` etc. for every table.

For `users`: allow users to read and update their own row only (WHERE id = auth.uid()).

For `subscriptions`: allow users to read their own subscriptions (WHERE user_id = auth.uid()). Service role can do everything.

For `communities`: allow users to read their own communities (WHERE owner_user_id = auth.uid()). Allow users to insert communities where owner_user_id = auth.uid(). Allow users to update/delete their own communities.

For `wallets`, `evaluations`, `tips`, `rate_limits`: allow authenticated users to SELECT rows where community_id is in the set of communities they own. No direct client INSERT/UPDATE/DELETE — all writes go through the service role via API routes.

For `plans`: allow SELECT for all (public pricing data). No INSERT/UPDATE/DELETE from clients.

**Migration 003 — RPC Functions:**

Create the `upsert_rate_limit` function (identical to the original Valor design but using `telegram_user_id` TEXT instead of `username`):

```sql
CREATE OR REPLACE FUNCTION upsert_rate_limit(
  p_community_id UUID,
  p_telegram_user_id TEXT,
  p_date DATE,
  p_last_tip_at TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (community_id, telegram_user_id, date, tips_today, last_tip_at)
  VALUES (p_community_id, p_telegram_user_id, p_date, 1, p_last_tip_at)
  ON CONFLICT (community_id, telegram_user_id, date)
  DO UPDATE SET
    tips_today = rate_limits.tips_today + 1,
    last_tip_at = p_last_tip_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Create a `get_community_usage` function that returns the current month's evaluation count and tip count for a given community_id, for plan enforcement checks.

After writing all three files, add a comment block at the top of each SQL file noting that these must be run in numerical order in the Supabase SQL Editor before the application can function.

---

## PROMPT 3 — Supabase Client Layers & TypeScript Types

**Objective:** Set up the three Supabase client instances (server with service role, server with user session, browser client) and generate the TypeScript database types.

**Files to create/modify:**
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/middleware.ts`
- `middleware.ts` (root)
- `types/database.ts`

**Instructions for the coding agent:**

In `lib/supabase/server.ts`: create an async function `createServerSupabase()` using `@supabase/ssr`'s `createServerClient`. This client uses the user's session cookies for RLS-compliant reads. Use `serverConfig.supabaseUrl` and `clientConfig.supabaseAnonKey` from `lib/config.ts`. This client is used in Server Components and Server Actions.

Also export a `createServiceSupabase()` function using `createClient` from `@supabase/supabase-js` initialized with `serverConfig.supabaseServiceRoleKey`. This bypasses RLS and is used exclusively in API routes that must write data. Never expose this client to client-side code.

In `lib/supabase/client.ts`: create a singleton browser client using `@supabase/ssr`'s `createBrowserClient`. Use the public env vars. Export as `supabaseBrowser`.

In `lib/supabase/middleware.ts`: export an `updateSession` function that refreshes the Supabase auth session cookie on every request, as per the Supabase SSR documentation for Next.js App Router.

In `middleware.ts` (root): call `updateSession` and protect all routes under `/(dashboard)` — redirect unauthenticated users to `/login`. Allow public access to `/`, `/claim`, `/api/webhook/**`, `/api/billing/webhook`, `/api/health`, and all static assets.

In `types/database.ts`: manually write TypeScript types that match the exact schema from Prompt 2. Define a `Database` interface with `public.Tables` containing typed row, insert, and update types for every table. Export convenience types: `Community`, `Wallet`, `Evaluation`, `Tip`, `RateLimit`, `Plan`, `Subscription`, `User`. All types must be non-nullable for required fields.

---

## PROMPT 4 — CDP Wallet Service Layer

**Objective:** Build the complete Coinbase CDP wallet management service. This replaces WDK entirely. All blockchain interactions go through this layer.

**Files to create:**
- `lib/cdp/client.ts`
- `lib/cdp/wallets.ts`
- `lib/cdp/transfers.ts`

**Instructions for the coding agent:**

In `lib/cdp/client.ts`: initialize the Coinbase CDP SDK using `CDP_API_KEY_NAME` and `CDP_API_KEY_PRIVATE_KEY` from `serverConfig`. The network is determined by `CDP_NETWORK_ID` (default: `base-mainnet`). Export a singleton CDP client instance. The SDK initializes once per cold start. Add error handling for invalid credentials that throws a descriptive error.

Also export constants: `USDC_CONTRACT_ADDRESS` for Base mainnet (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), and `BASE_NETWORK_ID` matching the env var value.

In `lib/cdp/wallets.ts`: implement these functions:

`createCommunityTreasury(communityId: string)` — Creates a new CDP server wallet (type: 'server') to serve as the community treasury. Returns the CDP wallet ID and the wallet's default address. This is called once during community onboarding. After creating, update the `communities` table with the `treasury_wallet_id` and `treasury_address`.

`getOrCreateContributorWallet(communityId: string, telegramUserId: string, username: string)` — First queries the `wallets` table for an existing entry matching `community_id` + `telegram_user_id`. If found, returns the existing CDP wallet ID and address. If not found, creates a new CDP server wallet, then performs an `INSERT INTO wallets ... ON CONFLICT (community_id, telegram_user_id) DO NOTHING RETURNING *`. If the insert returns nothing (conflict), another concurrent process created the wallet first — re-query and return that row. This pattern prevents the race condition described in Revive.md.

`getWalletBalance(walletId: string)` — Returns the USDC balance of a given CDP wallet ID.

`refreshTreasuryBalance(communityId: string)` — Fetches the live USDC balance of the community's treasury wallet and updates `communities.usdc_balance`. Called after every tip and during the health check cron.

In `lib/cdp/transfers.ts`: implement:

`executeTip(params: { communityId, treasuryWalletId, contributorWalletAddress, amount, idempotencyKey })` — Transfers USDC from the treasury wallet to the contributor's wallet address. Uses the CDP SDK's transfer capability on Base with USDC. Returns `{ success: boolean, transferId: string, txHash: string | null, error?: string }`. Wraps in try/catch. Does NOT update the database — database writes are the responsibility of the caller.

`executeWithdrawal(params: { contributorWalletId, destinationAddress, amount })` — Transfers USDC from a contributor's CDP wallet to an external wallet address. Used in the `/claim` flow.

Important: All functions in this layer are server-only. Add `'use server'` or ensure they're only called from API routes or Server Actions.

---

## PROMPT 5 — AI Evaluation Engine

**Objective:** Build the Gemini evaluation layer using Vercel AI SDK v6. Replace Firebase Genkit entirely. The two-filter system from the original Valor is preserved exactly.

**Files to create:**
- `lib/gemini/schema.ts`
- `lib/gemini/evaluate.ts`
- `lib/telegram/filters.ts`

**Instructions for the coding agent:**

In `lib/gemini/schema.ts`: define the Zod schema for the evaluation output. Export `evaluationOutputSchema` as a `z.object()` with these fields:
- `score`: `z.number().int().min(0).max(10)` — quality score
- `reason`: `z.string().max(200)` — one sentence visible to community
- `should_tip`: `z.boolean()` — true if score meets the community threshold

Also export the TypeScript type inferred from this schema: `EvaluationOutput`.

In `lib/gemini/evaluate.ts`: implement `evaluateMessage(params: { messageText, parentMessageText?: string, evalContext: string, minScore: number })` using `generateObject` from the Vercel AI SDK v6. Import the Google provider from `@ai-sdk/google` and use model `gemini-2.5-flash`. Pass `serverConfig.geminiApiKey` via the provider initialization.

The system prompt for Gemini must:
1. Describe it as a community quality evaluator for Web3 communities
2. Define the scoring rubric (1-3: spam/noise, 4-6: basic engagement, 7-8: clear technical answer, 9-10: detailed expert explanation)
3. Include the community's custom `evalContext` if provided
4. State that `should_tip` should be true only if score is strictly greater than or equal to `minScore`
5. Instruct it to reward: accurate technical answers, problem-solving, detailed explanations, genuine insight
6. Instruct it to penalize: one-word replies, GM/GN spam, self-promotion, copied content, empty hype

If `parentMessageText` is provided, include it as context so reply messages are scored appropriately.

Add explicit error handling: if Gemini throws (rate limit, invalid response), return a default `{ score: 0, reason: 'Evaluation unavailable', should_tip: false }` object and log the error. Do not throw — a failed evaluation must never crash the tip pipeline.

In `lib/telegram/filters.ts`: implement the two-filter system exactly as in the original Valor:

`passesFilterOne(message: TelegramMessage)` — returns false if: sender is a bot, no text content, starts with '/', stripped word count < 4. Word count must strip emojis and unicode before counting.

`passesFilterTwo(message: TelegramMessage)` — returns false if ALL THREE fail: no question mark, word count <= 8, no crypto domain keyword. The keyword list must include at minimum: wallet, token, blockchain, contract, protocol, defi, nft, gas, bridge, stake, yield, liquidity, chain, transaction, address, seed, exchange, dex, cex, rugpull, whitepaper, tokenomics, airdrop, mint, burn, mempool, validator, slippage, smartcontract, dao, governance.

Export a `shouldEvaluate(message: TelegramMessage)` helper that returns true only if both filters pass.

---

## PROMPT 6 — Telegram Webhook Handler

**Objective:** Build the per-community Telegram webhook endpoint. This is the entry point for all message processing. The ONLY thing this endpoint does is verify the request, identify the community, and enqueue a QStash job. It returns 200 in under 100ms.

**File to create:** `app/api/webhook/[botToken]/route.ts`

**Instructions for the coding agent:**

This is a Next.js 16 App Router Route Handler. The `[botToken]` path segment is the dynamic identifier — each community has its own webhook URL at `/api/webhook/{their-bot-token}`.

The handler must:

1. Extract `botToken` from the URL path params.

2. Verify the Telegram webhook secret header (`X-Telegram-Bot-Api-Secret-Token`). The secret for this community is stored in the database as part of the community row. Look up the community by `bot_token` from the `communities` table using the service Supabase client. If no community is found matching this bot token, return 404. If the secret header doesn't match `TELEGRAM_WEBHOOK_SECRET` (which should actually be stored per-community — store a hash of the bot_token + a server secret as the webhook secret to avoid needing a separate env var per community), return 401. Describe this derivation precisely.

3. Parse the request body as JSON to get the Telegram update object. Extract: `update_id`, `message` (if present). If the update is not a message update (e.g., it's a callback_query or channel_post), return 200 immediately with `{ ok: true }` — only process Message updates.

4. Extract from the message: `message_id`, `from.id` (telegram_user_id as string), `from.username`, `text`, `reply_to_message.text` (if present), `date`.

5. Run both filters (`passesFilterOne` and `passesFilterTwo`) from `lib/telegram/filters.ts`. If either fails, return 200 immediately with `{ ok: true, skipped: 'filtered' }`. Do not enqueue to QStash for filtered messages — save the QStash free tier quota.

6. Enqueue to QStash using `lib/qstash/client.ts`. The job payload must include: `communityId`, `telegramUserId`, `username`, `messageId` (as number), `messageText`, `parentMessageText` (optional), `timestamp`. Use the endpoint `${serverConfig.appUrl}/api/jobs/evaluate` as the delivery target. Set `retries: 3` and `delay: 0`.

7. Return `{ ok: true }` with status 200.

The entire handler should complete in well under 100ms. No database writes happen here. No AI calls happen here. No blockchain calls happen here.

---

## PROMPT 7 — QStash Job Processor (The Tip Engine)

**Objective:** Build the QStash job consumer endpoint that executes the complete tip evaluation and payment pipeline asynchronously. This is where all the real work happens.

**File to create:** `app/api/jobs/evaluate/route.ts`

**Instructions for the coding agent:**

This endpoint is called by Upstash QStash after being enqueued by the webhook handler. Before doing anything, verify the QStash signature using `@upstash/qstash`'s receiver utility with `serverConfig.qstashCurrentSigningKey` and `serverConfig.qstashNextSigningKey`. If verification fails, return 401.

Parse the job payload: `{ communityId, telegramUserId, username, messageId, messageText, parentMessageText?, timestamp }`.

Execute the following pipeline in order. On any step failure, log the error with context, update relevant database rows with error status, and return 200 (not 500 — QStash should not retry business logic failures, only infrastructure failures):

**Step 1 — Load community config:**
Query `communities` for this `communityId`. If not found or `is_active = false`, return 200 with `{ skipped: 'community inactive' }`.

**Step 2 — Plan limit check:**
Call `get_community_usage` RPC to get this month's evaluation and tip counts. If either exceeds the community's plan limits, return 200 with `{ skipped: 'plan limit reached' }`. This protects the free tier.

**Step 3 — Idempotency check:**
Compute `idempotencyKey = sha256(communityId + telegramUserId + messageId.toString())`. Query `tips` table for an existing row with this `idempotency_key`. If found, return 200 with `{ skipped: 'duplicate' }`.

**Step 4 — AI evaluation:**
Call `evaluateMessage` from `lib/gemini/evaluate.ts` with the message content, parent context, community eval_context, and min_score. Insert the result into the `evaluations` table (regardless of should_tip result).

**Step 5 — Tip decision:**
If `evaluation.should_tip === false`, return 200 with `{ tipped: false, score: evaluation.score }`. Pipeline ends here for non-tip evaluations.

**Step 6 — Rate limit check:**
Query `rate_limits` for today's row for this user in this community. Check: tips_today < community.daily_limit_per_user AND (last_tip_at is null OR NOW() - last_tip_at > interval '30 minutes'). If rate limit fails, update the evaluation row with `should_tip = false` and return 200.

**Step 7 — Wallet resolution:**
Call `getOrCreateContributorWallet` from `lib/cdp/wallets.ts`. This creates the CDP wallet if needed. On failure (CDP API down), return 500 so QStash retries.

**Step 8 — Tip amount calculation:**
Determine tip amount: if score >= 9 use `community.tip_amount_high`, else use `community.tip_amount_low`.

**Step 9 — Treasury balance check:**
Call `getWalletBalance` for the community treasury. If balance < tip_amount + 0.5 (buffer for gas), insert a tip row with status 'failed' (reason: insufficient_treasury) and notify the community admin via Telegram DM using `lib/telegram/notify.ts`. Return 200.

**Step 10 — Execute USDC transfer:**
Call `executeTip` from `lib/cdp/transfers.ts`. On CDP API failure (not insufficient balance), return 500 for QStash retry.

**Step 11 — Database writes:**
Using the service Supabase client:
- Insert tip row: `{ community_id, evaluation_id, telegram_user_id, username, amount, wallet_address, cdp_transfer_id, tx_hash, transaction_status: 'confirmed', idempotency_key }`
- Call `upsert_rate_limit` RPC
- Call `refreshTreasuryBalance` to update the cached USDC balance

**Step 12 — Telegram notification:**
Call `lib/telegram/notify.ts` to send the tip announcement in the group. Include: contributor mention, amount, score, reason, and a link to the `/claim` page. This is non-blocking — failure here must not affect the tip record.

Return 200 with `{ tipped: true, amount, txHash }`.

---

## PROMPT 8 — Telegram Notification Service

**Objective:** Build the outbound Telegram notification module. Direct HTTP calls to the Telegram Bot API only — no library dependency.

**File to create:** `lib/telegram/notify.ts`

**Instructions for the coding agent:**

All functions in this module make direct POST requests to `https://api.telegram.org/bot{botToken}/{method}`.

Implement these functions:

`sendTipAnnouncement(params: { botToken, chatId, username, telegramUserId, amount, score, reason, txHash?, claimUrl })` — Sends a formatted message to the group. The message should follow this structure:
- A brief header announcing the tip with a gold coin emoji
- Contributor's @username or mention via user ID if no username
- Amount in USDC
- Score (e.g., "Quality score: 8/10")
- AI reason
- If txHash is available: "View on BaseScan" link using `https://basescan.org/tx/{txHash}`
- "Claim your USDC" link to `{claimUrl}?user={telegramUserId}`

Use `parse_mode: 'Markdown'` for formatting. Handle Telegram API errors gracefully (user blocked bot, chat not found, etc.).

`sendTreasuryAlert(params: { botToken, adminChatId, communityName, currentBalance, tipsRemaining })` — Sends a DM to the community admin warning that the treasury is running low.

`sendWelcomeMessage(params: { botToken, chatId })` — Sends a brief message when the bot is added to a group, explaining what Valor does.

`setBotWebhook(params: { botToken, webhookUrl, secretToken })` — Makes the API call to register the webhook URL with Telegram. Used during onboarding. Logs the result.

`deleteBotWebhook(params: { botToken })` — Removes the webhook. Used when a community is deactivated.

All functions return `{ success: boolean, error?: string }`. They never throw.

---

## PROMPT 9 — Paddle Billing Integration

**Objective:** Set up Paddle as the Merchant of Record for subscription billing. Paddle has no monthly fee — only 5% + $0.50 per transaction, making it genuinely $0 until revenue starts.

**Files to create:**
- `lib/paddle/client.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/webhook/route.ts`

**Instructions for the coding agent:**

In `lib/paddle/client.ts`: Initialize the Paddle Node SDK using `serverConfig.paddleApiKey`. The environment is controlled by `NEXT_PUBLIC_PADDLE_ENVIRONMENT` (either 'sandbox' for testing or 'production'). Export the singleton Paddle client.

Also export `PADDLE_PLAN_PRICE_IDS` — an object mapping plan names ('starter', 'pro', 'business') to their Paddle Price IDs from the `plans` table. These are populated from the database, not hardcoded, so create a `getPaddlePriceIds()` async function that reads them.

In `app/api/billing/checkout/route.ts`: POST handler that:
1. Verifies the user is authenticated (via Supabase session)
2. Accepts `{ planName }` in the request body
3. Looks up the Paddle Price ID for the requested plan
4. Creates a Paddle checkout session using the SDK with: price ID, customer email from the auth session, custom data `{ userId: user.id, planName }`
5. Returns the checkout URL for the client to redirect to

In `app/api/billing/webhook/route.ts`: POST handler for Paddle webhook events. Verify the webhook signature using `serverConfig.paddleWebhookSecret` and the Paddle SDK's signature verification utility.

Handle these event types:
- `subscription.created` and `subscription.activated`: upsert a row in `subscriptions` with status 'active', link `paddle_subscription_id`, look up the plan by `paddle_price_id`, set `current_period_end`
- `subscription.updated`: update the subscription row with new status and period end
- `subscription.cancelled`: set status to 'cancelled'
- `subscription.past_due`: set status to 'past_due', send a notification email (log for now)

After each subscription event, update the `communities` rows for this user to enforce the new plan's limits by updating their `plan_id`.

Return 200 for all recognized events, 400 for signature failures, 200 (not 500) for unrecognized event types (Paddle sends many events you may not handle — silently succeed).

---

## PROMPT 10 — Supabase Auth & Session Management

**Objective:** Implement authentication using Supabase Auth with email magic links. No OAuth needed for MVP — email link is frictionless and zero-config.

**Files to create/modify:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/callback/route.ts`

**Instructions for the coding agent:**

In `app/(auth)/login/page.tsx`: a Client Component presenting an email input field and a "Send magic link" button. On submit, call `supabaseBrowser.auth.signInWithOtp({ email, options: { emailRedirectTo: `${appUrl}/auth/callback` } })`. Show a success state ("Check your email for a login link") and an error state. Apply the dark/premium design aesthetic — black background, gold accent on the button, minimal layout.

In `app/(auth)/callback/route.ts`: a GET Route Handler that exchanges the auth code from the URL for a session using `@supabase/ssr`'s `exchangeCodeForSession`. On success, redirect to `/dashboard`. On failure, redirect to `/login?error=auth_failed`.

Also add a logout mechanism: a server action or API route at `app/api/auth/signout/route.ts` that calls `supabase.auth.signOut()` and redirects to `/`.

---

## PROMPT 11 — Landing Page

**Objective:** Build the public marketing landing page at `/`. Dark, premium, converting. The visual identity is "Web3 Wizard": deep black, gold accents, minimal copy, maximum credibility signals.

**File to create:** `app/(marketing)/page.tsx` and supporting components in `components/landing/`

**Instructions for the coding agent:**

This is a Server Component page. No client-side JS required for rendering (Realtime mock feed can be a static display for MVP).

The page has three sections:

**Section 1 — Hero:**
Headline: "Your best contributors are leaving. Valor pays them to stay." in large, bold typography. Sub-headline: "AI-powered quality evaluation + autonomous USDC rewards for your Telegram community. No commands. No voting. No humans in the loop." Two CTAs: "Start free — no credit card" (gold button, links to `/login`) and "See how it works" (ghost button, scrolls to Section 2). Include a right-side visual: a dark card showing a mock "tip event" — username, quality score badge, USDC amount, AI reason, BaseScan link. This establishes product credibility without a live demo.

**Section 2 — How It Works:**
Three numbered steps in a horizontal layout:
1. "Install the bot" — Add Valor to your Telegram group in 60 seconds
2. "Fund the treasury" — Send USDC to your community wallet on Base
3. "Let Valor work" — AI evaluates every message. Top contributors get paid automatically.
Each step has a small dark card illustrating it.

**Section 3 — Pricing:**
Three pricing cards (Free, Starter at $29/mo, Pro at $79/mo). Each card lists: communities, evaluations/month, tips/month. A "Most Popular" badge on Pro. CTA button on each. The Business tier is a text link below: "Need unlimited communities? Talk to us →"

Under pricing, three trust signals: "Built on Base — sub-cent transactions", "Powered by Gemini AI", "Paddle Merchant of Record — VAT handled globally"

Apply CSS variables for theming: background `#0a0a0a`, card background `#111111`, gold accent `oklch(0.75 0.18 75)`, text `#f5f5f5`. Use Tailwind v4 CSS variable syntax in `globals.css`.

---

## PROMPT 12 — Community Onboarding Wizard

**Objective:** Build the 4-step wizard that takes a new user from "just logged in" to "bot is live in their Telegram group."

**File to create:** `app/onboard/page.tsx` and `components/onboarding/steps/`

**Instructions for the coding agent:**

This is a Client Component (needs state for step progression). The wizard has four steps managed by a `currentStep` state variable.

**Step 1 — Name Your Community:**
Input field for community name. A note explaining they'll need a Telegram bot token — link to t.me/BotFather instructions. "Continue" button enabled only when name is non-empty.

**Step 2 — Connect Your Bot:**
Instructions to create a bot via @BotFather (copy the numbered steps inline). A text input for the bot token. A "Verify bot" button that calls a server action to:
- Validate the token format
- Make a `getMe` call to the Telegram Bot API to confirm it's valid
- Check the bot is not already registered in `communities`
Return the bot's username on success. Show the bot's username as a confirmation.

**Step 3 — Add Bot to Group:**
Show the bot's username. Instruction: "Add @{botUsername} to your Telegram group as an admin." A "Verify installation" button that calls a server action to check if the bot has been added (by attempting to set the webhook — this will only succeed if the bot is in the group with appropriate permissions). On success, create the community record in the database, generate the CDP treasury wallet, and register the Telegram webhook. Show the treasury wallet address with a copy button and QR code (use a QR code library).

**Step 4 — Fund Treasury:**
Display the treasury wallet address prominently with a copy button. Show a QR code. Explain: "Send USDC on Base network to this address. A minimum of 10 USDC is recommended to start." Show a live balance display that polls every 5 seconds for the first 5 minutes. A "Skip for now (use free tier)" button that redirects to the dashboard. A "Treasury funded → Go to dashboard" button that activates when balance > 0.

Each step has a step indicator component showing current progress and completed steps.

---

## PROMPT 13 — Main Dashboard

**Objective:** Build the multi-community dashboard with real-time activity feed. This is what community managers look at daily.

**Files to create:**
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/[communityId]/page.tsx`
- `components/dashboard/ActivityFeed.tsx`
- `components/dashboard/StatsRow.tsx`
- `components/dashboard/Leaderboard.tsx`
- `components/dashboard/TipEvent.tsx`

**Instructions for the coding agent:**

The root dashboard page at `/dashboard` queries all communities for the authenticated user. If zero communities exist, redirect to `/onboard`. If one or more communities exist, redirect to `/dashboard/{firstCommunityId}`.

The `[communityId]` page is the main view. It's a mix of Server Component (initial data fetch) and Client Components (Realtime subscription).

**Layout:** left sidebar with community list (from parent layout), main content area with top bar and body.

**Top bar:** community name, treasury balance (`TreasuryBalance` component — live polling every 30s), "Fund wallet" button (opens a sheet with the treasury address and QR code), plan badge, "Invite members" button (copies the bot's @username).

**Stats row (`StatsRow.tsx`):** four dark stat cards — Total USDC Distributed, Messages Evaluated (this month), Tips Fired (this month), Top Contributor (this week with their earned amount). Data fetched server-side on initial load. Client-side refresh every 60s.

**Activity feed (`ActivityFeed.tsx`):** A Client Component. Initial data is passed from the Server Component (last 50 evaluations + tips joined). The component subscribes to Supabase Realtime channels for both `evaluations` and `tips` tables filtered by `community_id`. New rows are prepended to the list with a brief gold flash animation.

Each item in the feed is a `TipEvent.tsx` component. Tipped messages have a gold left border, gold amount badge, score badge, username, truncated message (max 100 chars), AI reason, and BaseScan link if tx_hash is available. Non-tipped evaluations have a gray left border and show just the score, username, and reason.

**Leaderboard tab:** A tab alongside the feed showing the top 10 contributors in the current billing period sorted by total USDC earned.

---

## PROMPT 14 — Community Settings Page

**Objective:** Build the per-community settings page where admins configure Valor's behavior.

**File to create:** `app/(dashboard)/dashboard/[communityId]/settings/page.tsx`

**Instructions for the coding agent:**

This page renders the current community configuration as a form. All settings are live-updated via a Server Action that updates the `communities` table.

**Scoring Configuration section:**
- Minimum quality score threshold: a slider from 5 to 9 with current value displayed. Default 7.
- Tip amount for score 7-8 (USDC): number input with 0.5 step, min 0.5, max 10.
- Tip amount for score 9-10 (USDC): number input with 0.5 step, min 0.5, max 10.
- Daily tip limit per user: number input with min 1, max 20.

**Community Context section:**
A textarea where admins can describe their community to improve AI scoring accuracy. Placeholder: "e.g., This is a DeFi protocol community focused on technical questions about liquidity pools, yield strategies, and smart contract security. Reward detailed technical explanations and penalize FUD and price speculation." Character count display (max 500).

**Bot Status section:**
Shows the bot @username, current webhook URL, and a "Test connection" button that makes a `getWebhookInfo` call to Telegram and returns the webhook status. A "Re-register webhook" button that re-calls `setBotWebhook` in case the webhook broke.

**Danger Zone section:**
"Deactivate community" — sets `is_active = false`, removes the Telegram webhook, and stops processing. Requires confirmation modal. Community data is not deleted — can be reactivated.

Each form section has its own save button. Use Next.js Server Actions for form submissions. Show a success toast (sonner) after each save.

---

## PROMPT 15 — Contributor Claim Portal

**Objective:** Build the public `/claim` page where contributors who've earned USDC can withdraw it to any wallet address. No login account needed — only Telegram identity.

**File to create:** `app/claim/page.tsx`

**Instructions for the coding agent:**

This is a fully public page (no Supabase auth required). Authentication is via Telegram's Login Widget.

**Step 1 — Telegram Login:**
Display the Telegram Login Widget (`telegram.org/js/telegram-widget.js`). Configure it with the bot username of the first active Valor community (or a dedicated Valor verification bot). On successful authentication, Telegram returns a signed hash of the user's data — validate this signature server-side using HMAC-SHA256 with the bot token as the key (standard Telegram login verification). Store the verified `telegramUserId` in session state.

**Step 2 — Balance Display:**
After verification, query the `wallets` and `tips` tables to show:
- All Valor communities where this user has a wallet and earned tips
- Total earned per community (sum of confirmed tips)
- Current available balance (queried live from CDP via `getWalletBalance`)
- Note: earned ≠ available if previous withdrawals occurred

If balance across all communities is zero, show an encouraging message: "You haven't earned any USDC yet. Join a community powered by Valor and start contributing!"

**Step 3 — Withdrawal Form:**
For each community with a positive balance:
- Show community name, balance, wallet address
- Input: destination EVM address (validate as valid Ethereum address format using viem's `isAddress()`)
- Amount input (max = available balance)
- "Withdraw to my wallet" button

On submit, call a Server Action that:
1. Re-verifies the Telegram login data is recent (timestamp < 24 hours ago)
2. Calls `executeWithdrawal` from `lib/cdp/transfers.ts`
3. Returns tx hash and BaseScan link

Show a success screen with the BaseScan link. Handle errors (insufficient balance, invalid address) inline.

---

## PROMPT 16 — Community Management API Routes

**Objective:** Build the REST API routes for community CRUD operations that the dashboard and onboarding wizard call.

**Files to create:**
- `app/api/community/route.ts`
- `app/api/community/[id]/route.ts`

**Instructions for the coding agent:**

All routes in this section verify authentication first — if no valid session, return 401.

`POST /api/community` — Creates a new community. Request body: `{ name, botToken }`. Validate the bot token with a Telegram `getMe` call. Check the user's current subscription to enforce the plan's `max_communities` limit. Create the CDP treasury wallet. Register the Telegram webhook via `setBotWebhook`. Insert the community row. Return the created community.

`GET /api/community` — Returns all communities for the authenticated user, joined with their latest treasury balance and this-month's stats.

`GET /api/community/[id]` — Returns a single community with full stats. Validates ownership.

`PATCH /api/community/[id]` — Updates community settings. Validates ownership. Allowed fields: `name`, `min_score`, `tip_amount_low`, `tip_amount_high`, `daily_limit_per_user`, `eval_context`, `is_active`. Returns updated community.

`DELETE /api/community/[id]` — Soft-deletes by setting `is_active = false` and removing the Telegram webhook. Does not delete data. Returns 204.

---

## PROMPT 17 — Health Check & Supabase Inactivity Prevention

**Objective:** Build the health check endpoint and a cron job that pings Supabase every 5 days to prevent free tier project pausing. Supabase free tier pauses after 7 days of inactivity — this is not optional.

**Files to create:**
- `app/api/health/route.ts`
- `vercel.json`

**Instructions for the coding agent:**

In `app/api/health/route.ts`: a GET handler that:
1. Verifies the request has `Authorization: Bearer {CRON_SECRET}` header. Public health checks (no auth header) return only `{ status: 'ok', timestamp: ISO_STRING }` without triggering DB operations.
2. If authenticated with cron secret, additionally: query `SELECT 1` from Supabase (keeps the connection alive), refresh treasury balances for all active communities, return `{ status: 'ok', communitiesRefreshed: N, timestamp: ISO_STRING }`.

In `vercel.json`: configure Vercel Cron Jobs to call `/api/health` every 5 days with the `Authorization: Bearer {CRON_SECRET}` header:

```json
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "0 0 */5 * *"
    }
  ]
}
```

Note in a code comment: the `Authorization` header must be set via a Vercel environment variable. The cron job path does not support headers natively in Vercel's free plan — document the workaround: create a separate `app/api/cron/ping/route.ts` that does not require auth headers and is called on a schedule, performing the keepalive and balance refresh.

---

## PROMPT 18 — Error Handling, Logging & Edge Cases

**Objective:** Harden the tip pipeline against every failure mode identified in Revive.md. This is not new features — it's making existing features production-safe.

**Files to modify:** `app/api/jobs/evaluate/route.ts`, `lib/cdp/transfers.ts`, `lib/gemini/evaluate.ts`

**Instructions for the coding agent:**

Review `app/api/jobs/evaluate/route.ts` and ensure every step has explicit error handling with structured log output using `console.error` with a JSON context object: `{ step, communityId, telegramUserId, messageId, error: error.message }`. This makes debugging possible in Vercel's log viewer.

Add a `failed_tips` table consideration: when a tip fails at any step after the idempotency key check (CDP API down, treasury empty), the `tips` row must be inserted with `transaction_status: 'failed'` and a `failure_reason` column (add this to the schema via a migration addendum in Prompt 2 — add a `failure_reason TEXT` column to `tips`). This ensures no tip is silently lost.

For Gemini rate limit errors (HTTP 429): implement a simple retry with 2-second delay for up to 2 retries before giving up and returning the default evaluation object. Log the retry attempts.

For CDP API errors that are retryable (network timeout, 503): return HTTP 500 from the job handler so QStash retries the job (up to 3 times with exponential backoff, as configured in Prompt 6).

For CDP API errors that are non-retryable (invalid address, insufficient balance): return HTTP 200 with the failure logged and recorded.

For Telegram notification failures (user blocked bot, network error): always catch and swallow — notification failure must never fail the tip pipeline. Log the failure only.

---

## PROMPT 19 — UI Polish & Dark Premium Theme

**Objective:** Apply the consistent "Web3 Wizard" visual identity across all pages. This is done once after all functional UI is built.

**Files to modify:** `globals.css`, all page and component files

**Instructions for the coding agent:**

In `globals.css`, define the design system using Tailwind v4's `@theme` directive:

Define CSS custom properties for the color system:
- `--background`: `oklch(0.06 0 0)` (near-black)
- `--foreground`: `oklch(0.96 0 0)` (near-white)
- `--card`: `oklch(0.10 0 0)` (dark card)
- `--card-foreground`: `oklch(0.96 0 0)`
- `--primary`: `oklch(0.75 0.18 75)` (gold)
- `--primary-foreground`: `oklch(0.06 0 0)`
- `--muted`: `oklch(0.15 0 0)`
- `--muted-foreground`: `oklch(0.60 0 0)`
- `--border`: `oklch(0.20 0 0)`
- `--ring`: `oklch(0.75 0.18 75)` (gold focus ring)
- `--success`: `oklch(0.65 0.15 150)` (green for confirmed tips)
- `--destructive`: `oklch(0.60 0.20 25)` (red for errors)

Apply `tw-animate-css` for all animations. The tip event entrance animation should be a subtle slide-in from left with a gold flash on the left border.

On the Activity Feed, tipped events have a left border with `var(--primary)` and a small gold shimmer animation on entry. Non-tipped evaluations have a `var(--muted)` left border.

Score badges: 0-5 = gray, 6-7 = blue, 8-9 = gold, 10 = gold with a subtle glow.

All buttons follow the shadcn/ui variant system. The primary CTA button uses `bg-primary text-primary-foreground`.

Typography: use the system font stack for all body text. For headings, use a slight letter-spacing reduction for a premium feel (`tracking-tight`).

---

## PROMPT 20 — Deployment Configuration & Production Readiness

**Objective:** Configure the project for Vercel deployment. Set all environment variables. Run a pre-deployment checklist.

**Files to create/modify:** `vercel.json`, `.env.production.example`

**Instructions for the coding agent:**

In `vercel.json`, add the cron configuration from Prompt 17 and set `"framework": "nextjs"`. No other configuration is needed — Vercel auto-detects Next.js 16.

Create `.env.production.example` — a template file (committed to git) listing all environment variables with descriptive comments explaining what each one is and where to get it. This is NOT `.env.local` (which is never committed). Include:

```
# How to get each value:
# NEXT_PUBLIC_SUPABASE_URL: Supabase Dashboard → Settings → API → URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase Dashboard → Settings → API → anon key
# SUPABASE_SERVICE_ROLE_KEY: Supabase Dashboard → Settings → API → service_role key (secret)
# GEMINI_API_KEY: aistudio.google.com → Get API key
# CDP_API_KEY_NAME: Coinbase Developer Platform → API Keys → Key Name
# CDP_API_KEY_PRIVATE_KEY: Coinbase Developer Platform → API Keys → Private Key (download as JSON)
# CDP_NETWORK_ID: 'base-mainnet' for production, 'base-sepolia' for testing
# QSTASH_TOKEN: Upstash Console → QStash → Token
# QSTASH_CURRENT_SIGNING_KEY: Upstash Console → QStash → Signing Key (current)
# QSTASH_NEXT_SIGNING_KEY: Upstash Console → QStash → Signing Key (next)
# PADDLE_API_KEY: Paddle Dashboard → Developer Tools → Authentication → API Key
# PADDLE_WEBHOOK_SECRET: Paddle Dashboard → Notifications → Webhook secret
# NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: Paddle Dashboard → Developer Tools → Client-side token
# NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'sandbox' or 'production'
# NEXT_PUBLIC_APP_URL: Your Vercel deployment URL (e.g., https://valor.vercel.app)
# CRON_SECRET: Any random 32-character string (generate with: openssl rand -hex 32)
```

Create a `DEPLOYMENT.md` file in the project root with step-by-step deployment instructions:
1. Push to GitHub
2. Connect to Vercel (import project)
3. Add all environment variables in Vercel dashboard
4. Deploy
5. Run SQL migrations in Supabase SQL Editor (in order: 001, 002, 003)
6. Insert initial plan rows if not already done by the migration
7. Register Telegram webhooks for test community via the onboarding wizard
8. Fund the test treasury with Base Sepolia USDC for testing
9. Send a test message in the Telegram group and verify the tip pipeline runs end to end
10. Switch `CDP_NETWORK_ID` to `base-mainnet` and `NEXT_PUBLIC_PADDLE_ENVIRONMENT` to `production` for real launch

---

## PROMPT FINAL — End-to-End Validation & Pre-Launch Checklist

**Objective:** Run a systematic validation of every critical path. Fix any failures before considering the build complete.

**Instructions for the coding agent:**

Do not write new code in this prompt. Instead, verify the following by reading the existing codebase:

**Security Checklist:**
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is never imported in any file under `app/(dashboard)`, `app/(marketing)`, `app/claim`, or any `components/` file
- [ ] Confirm `CDP_API_KEY_PRIVATE_KEY` and `CDP_API_KEY_NAME` are only used in `lib/cdp/` files
- [ ] Confirm `GEMINI_API_KEY` is only used in `lib/gemini/` files
- [ ] Confirm every API route under `app/api/` except `/api/webhook/[botToken]`, `/api/billing/webhook`, and `/api/health` checks authentication before executing
- [ ] Confirm the Telegram webhook handler verifies the secret token before any database operations
- [ ] Confirm the QStash job processor verifies the QStash signature before executing
- [ ] Confirm no `console.log` calls output sensitive data (API keys, addresses, user data beyond IDs)
- [ ] Confirm RLS is enabled on all tables in the migration files

**Data Integrity Checklist:**
- [ ] Confirm the `idempotency_key` is checked BEFORE any CDP operations in the job processor
- [ ] Confirm `getOrCreateContributorWallet` uses `ON CONFLICT DO NOTHING RETURNING *` and re-queries on empty result
- [ ] Confirm `upsert_rate_limit` RPC is called, not a direct table update
- [ ] Confirm the webhook handler returns 200 BEFORE enqueuing to QStash (not after)
- [ ] Confirm the job processor returns 500 only for retryable infrastructure failures, 200 for all business logic outcomes

**Free Tier Compliance Checklist:**
- [ ] Confirm the Gemini model string is `gemini-2.5-flash` (250 RPD free — more than enough with two-filter system)
- [ ] Confirm the two-filter system in `lib/telegram/filters.ts` is called in the WEBHOOK handler before QStash enqueue (not in the job processor) to conserve QStash quota
- [ ] Confirm CDP operations only happen for messages that pass all filters, evaluation threshold, and rate limits
- [ ] Confirm the health check cron is set to run every 5 days (before Supabase 7-day pause)
- [ ] Confirm Paddle environment is 'sandbox' in development (no real charges during testing)

**TypeScript Checklist:**
- [ ] Run `npx tsc --noEmit` and confirm zero TypeScript errors
- [ ] Confirm `tsconfig.json` has `"strict": true`
- [ ] Confirm no `any` types exist in `lib/`, `app/api/`, or `types/` directories

**Build Checklist:**
- [ ] Run `npm run build` and confirm it completes without errors
- [ ] Confirm the build output shows no unexpected client-side bundles containing server-only imports
- [ ] Confirm Turbopack is being used for dev (`npm run dev` output should mention Turbopack)

**If any check fails:** fix it before marking the project build-ready. Document any intentional deviations from these checks with an inline comment explaining why.

---

## APPENDIX A — Paddle Setup Steps (Do Before Testing Billing)

1. Create a Paddle account at paddle.com (free, no monthly fee)
2. Start in Sandbox mode
3. Create the three products: Valor Starter ($29/mo), Valor Pro ($79/mo), Valor Business ($179/mo)
4. Copy each product's Price ID into the `plans` table in Supabase (`paddle_price_id` column)
5. Set up webhook endpoint in Paddle: `https://your-domain.vercel.app/api/billing/webhook`
6. Add these webhook notification events: `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.cancelled`, `subscription.past_due`
7. Copy the webhook secret into Vercel environment variables

## APPENDIX B — Coinbase CDP Setup Steps (Do Before Testing Tips)

1. Create a Coinbase Developer Platform account at portal.cdp.coinbase.com
2. Create a new project
3. Generate API keys (Key Name + Private Key)
4. Set network to `base-sepolia` for testing, `base-mainnet` for production
5. The free tier gives 5,000 wallet operations/month — more than enough for MVP
6. No wallet funding needed from CDP — community admins fund via USDC deposits to the treasury wallet address generated by the app

## APPENDIX C — Upstash QStash Setup Steps

1. Create an Upstash account at upstash.com (free)
2. Go to QStash section
3. Copy the Token, Current Signing Key, and Next Signing Key into environment variables
4. No additional configuration needed — QStash delivers to your app's `/api/jobs/evaluate` endpoint

---

*Agent.md compiled from Revive.md | Valor 2.0 Build Playbook | June 2026*
*Stack versions verified at time of writing. Run `npm outdated` after setup and update patch versions only.*