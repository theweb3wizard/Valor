# Revive.md — Valor: From Hackathon Corpse to Monetizable SaaS

> **Zero-Bullshit Assessment | Phase 1 Deliverable**
> Compiled by: Elite VC / CPO / Web3-Web2 Architect lens
> Project Analyzed: Valor — Autonomous Community Intelligence Agent
> Source: README.md + ARCHITECTURE.md (Tether Hackathon Galactica, March 2026)

---

## SECTION 1 — BRUTAL AUDIT OF THE CURRENT STATE

### 1.1 What Valor Actually Is (Strip the Pitch)

Valor is a well-engineered hackathon submission. The core loop is genuinely clever: two cheap pre-filters gate a Gemini evaluation, which gates an autonomous on-chain USDT tip, all in a single serverless function. The two-filter cost engineering is legitimately good thinking. The BIP-44 wallet derivation security model is sound. The architecture docs are unusually honest about known gaps.

But calling it "architecturally complete for its core use case" — as the README does — is the kind of self-deception that kills good projects. **It is complete for a demo. It is broken for a product.** Here is the itemized evidence.

---

### 1.2 The WDK Dependency Is a Dead End

`@tetherto/wdk-wallet-evm` is Tether's **hackathon-specific SDK** built to satisfy the "Agent Wallets" track requirement of one competition. It is not a production payment infrastructure. There is no public SLA, no production uptime commitment, no documentation for enterprise use, and no path for your product to differentiate from every other project that used it in the same hackathon.

The ERC-4337 module — which would solve the broken gas-seeding model — **cannot run on Vercel** due to `sodium-native` native binary dependencies. The architecture doc admits this plainly. This means the upgrade path to a viable mainnet product requires migrating off Vercel entirely, which destroys the zero-ops deployment model that makes the rest of the architecture work.

The ETH gas-seeding design (`seed 0.005 ETH per new wallet`) is acceptable on Sepolia testnet where ETH is free. On Ethereum mainnet, the gas cost of the seed transaction itself often exceeds the value of the USDT tip being delivered. The entire financial model collapses the moment you try to go live with real money.

**Verdict:** WDK must be replaced entirely. It is not a foundation — it is a hackathon prop.

---

### 1.3 The Vercel 10-Second Timeout Is Not a Paper Tiger — It's a Live Grenade

The architecture doc describes the full tip flow taking "8–12 seconds" and notes Telegram's 10-second webhook timeout. The stated mitigation is that the architecture is "designed to return 200 early if needed." This mitigation is **not implemented**. The code waits for `account.transfer()` to fully resolve before returning any response.

On Ethereum Sepolia with low load, this squeaks under 10 seconds. On any real network with gas competition, mempool congestion, or RPC latency, this will blow past 10 seconds routinely. When it does, Telegram marks the webhook delivery as failed and **retries the same update**. The retry triggers the same evaluation. If the rate limit check hasn't been written yet (it hasn't for this new tip attempt), a second tip fires for the same message.

The result: network congestion causes double-tips. Double-tips drain the treasury. Treasury drain kills the agent. The architecture has no deduplication mechanism against webhook retries.

**Verdict:** The entire tip execution path needs to be decoupled from the webhook response via a background job queue. The webhook must return 200 immediately and hand off execution asynchronously.

---

### 1.4 HD Wallet Creation Has a Race Condition

The atomic rate limit RPC function (`upsert_rate_limit`) is correctly identified and implemented. But `getNextAccountIndex()` — the function that assigns a BIP-44 derivation index to a new contributor — is **not atomic**. It reads the MAX index from the database, adds 1, and writes the new row. Two concurrent webhook calls for two different new users arriving within milliseconds of each other will both read the same MAX index, both compute the same "next" index, and both create wallets at that same derivation path. Two users get the same wallet. Funds sent to either will be visible to both.

This is a critical security defect. The architecture doc does not mention it.

**Verdict:** Wallet index assignment must use a database-level atomic lock (PostgreSQL advisory lock, `SELECT FOR UPDATE`, or a dedicated atomic counter RPC). Without this, the wallet system is unsafe for concurrent use.

---

### 1.5 Firebase Genkit Is Architectural Debt, Not Value

Genkit is Google's enterprise AI orchestration framework. Its purpose is managing multi-step AI workflows across many models with complex state. Valor uses it for **one structured Gemini call** that returns three fields. This is equivalent to hiring a construction crew to hang a picture frame.

What Genkit actually costs in this context: added cold start latency on Vercel serverless (framework initialization), an additional dependency chain (`genkit`, `@genkit-ai/googleai`, `@genkit-ai/core`), and a tight coupling to Google's specific framework that would complicate any future model switch. The Vercel AI SDK's `generateObject()` primitive achieves identical structured JSON output with Zod schema validation in approximately three lines of code with zero framework overhead.

**Verdict:** Replace Genkit with the Vercel AI SDK. This is not a minor refactor — it meaningfully reduces cold start time, bundle size, and maintenance surface.

---

### 1.6 The Architecture Is Fundamentally Single-Tenant

The database schema has `community_id` on every table. The architecture doc even acknowledges "multi-community support" as a future feature. But the bot loads `TELEGRAM_CHAT_ID` from a **single environment variable at startup**. There is no routing logic to resolve which community a webhook belongs to. There is no community creation flow. There is no admin onboarding.

To serve 10 paying communities, you need 10 separate Vercel deployments, 10 separate Supabase projects, 10 separate sets of environment variables. This is not a SaaS product — it's an artisan bot-as-a-service that requires custom DevOps for each client.

**The schema is multi-tenant ready. The application is not.** This is the single largest gap between what exists and what can be monetized.

---

### 1.7 There Is No Monetization Layer

The README's "What's Next" section mentions: "Open-source core, hosted managed version. Community admins who don't want to manage infrastructure pay a flat monthly fee."

There is no implementation. No Stripe. No Lemon Squeezy. No pricing page. No subscription concept in the database. No billing integration. **Zero revenue infrastructure exists.** This is a product description for a product that hasn't been built yet.

---

### 1.8 The Contributor UX Is Crypto-Native Friction Hell

The withdraw flow requires a contributor to:
1. Navigate to a separate web URL (not Telegram-native)
2. Know their exact Telegram username
3. Possess an external EVM wallet address to paste in
4. Execute an on-chain withdrawal transaction

Step 3 eliminates approximately 90% of Telegram users who have never touched a crypto wallet. The promise of "no wallet required to earn" is technically true — contributors don't need a wallet to *receive* a tip. But they need one to *access* the tip. The friction wall isn't at deposit; it's at withdrawal. This is the UX antipattern that kills every Web3 product that doesn't solve the last mile.

**Verdict:** The withdrawal experience needs a gasless, wallet-abstracted claim flow where contributors don't need to own or understand a crypto wallet to access their earned USDC.

---

### 1.9 Summary Verdict

| Component | Status |
|---|---|
| AI evaluation logic (two-filter + Gemini) | ✅ Genuinely good — keep and simplify |
| Core autonomous tip concept | ✅ Real market gap — validated |
| Database schema | ✅ Solid multi-tenant foundation |
| WDK payment rail | ❌ Replace entirely |
| Firebase Genkit | ❌ Replace with Vercel AI SDK |
| Multi-tenancy | ❌ Schema only, no implementation |
| Webhook safety | ❌ Race conditions + timeout bomb |
| Contributor UX | ❌ Crypto friction wall |
| Monetization | ❌ Literally zero infrastructure |

**The core intelligence engine is worth saving. Everything around it needs to be rebuilt on a production-grade foundation.**

---

## SECTION 2 — 2026 DEEP MARKET & COMPETITIVE LANDSCAPE

### 2.1 What's Actually Happening in This Space Right Now

The web3 community management market has matured significantly from the 2021-2022 hype era. Communities have consolidated around two platforms — Telegram and Discord — and the market is experiencing a specific and documented pain: **quality contributor retention without manual management overhead**.

Industry reports from agencies managing web3 communities at scale (Coinbound, Surgence Labs) consistently surface the same operational reality: running a Discord or Telegram community for a funded web3 protocol costs **$2,000–$5,000/month** in human moderation and community management alone. The core problem is identifying and rewarding actual signal contributors amidst high-volume, low-quality activity.

The insight from Coinbound's 2025-2026 community management guide is blunt: sustainable contributor programs must reward **outcomes, not participation**. Discord member counts and raw chat volume are "wildly misleading." Projects need lightweight systems that track who's creating genuine value — and current tools like Coordinape, Karma, and SourceCred are explicitly called out as the state of the art. Which means the market already knows what good looks like but finds existing tools insufficient.

**Telegram specifically is experiencing an AI inflection point.** In March 2026, Telegram shipped its most AI-focused platform update yet — a built-in AI text editor via the Cocoon Network and a Bot API upgrade that allows bots to create and manage other bots autonomously. This is a direct platform tailwind for AI-powered community bots. The platform is actively investing in making AI bots first-class citizens, which is the exact category Valor occupies.

On the payment infrastructure side, **the timing has never been better**. Coinbase shipped Agentic Wallets in February 2026 — production-grade wallet infrastructure specifically designed for autonomous AI agents operating on Base with gasless USDC transactions. The x402 protocol now powers machine-to-machine micropayments in real production deployments (Coinbase + AWS integration, May 2026). Base chain gas fees average sub-cent for USDC transfers. The technical infrastructure that makes Valor's financial model actually viable **has arrived in the market while Valor sat on Sepolia**.

---

### 2.2 Competitor Landscape — The Real Gaps

#### Competitor 1: tip.cc (Command-Based Tipping)
**What it is:** Discord/Telegram bot supporting 600+ cryptocurrencies. Users type `$tip @user 5 USDT`. Used across 100,000+ servers, 16M+ members reached.

**Revenue model:** Spread on currency swaps, internal custodial wallet model, deposit float.

**Its hard ceiling:** Entirely command-based — a human must notice a valuable message and execute a command. This almost never happens consistently. The platform knows this; it has never attempted AI-driven autonomous evaluation. The product is a crypto payment rail that happens to live in chat, not a contributor rewards engine.

**The gap Valor fills:** tip.cc requires a human in the loop for every tip. Valor requires zero. This is not a feature difference — it's a category difference. Valor is an agent; tip.cc is a tool.

#### Competitor 2: Coordinape (DAO Peer Rewards)
**What it is:** DAO compensation platform where team members allocate GIVE tokens to each other at the end of epochs. Raised funding, used by major DAOs, has CoSoul (on-chain reputation NFTs).

**Revenue model:** Platform fees, subscription for managed circles.

**Its hard ceiling:** Peer-based allocation is subject to cliques, popularity bias, and gaming by well-connected members. New contributors who haven't built relationships get underrewarded. The epoch model (distribute rewards every 2-4 weeks) delays gratification so long that contributors don't feel the connection between their contribution and the reward. Requires contributors to have crypto wallets and understand the GIVE token model.

**The gap Valor fills:** Coordinape rewards popularity and political capital. Valor rewards message quality at the moment of contribution. Real-time tipping vs epoch-based allocation is a fundamentally different experience. Coordinape serves DAO governance teams. Valor serves community chat.

#### Competitor 3: SourceCred (Dead) / Karma HQ (Narrowly Scoped)
**What they are:** SourceCred is explicitly no longer maintained — its Gitcoin page says so directly. Karma HQ is a DAO contributor management tool that tracks on-chain governance participation, not Telegram/Discord chat quality.

**The gap:** SourceCred's category (automated contribution scoring) is the most direct predecessor to what Valor does — but SourceCred is dead. Karma focuses on governance actions, not community chat. **There is no actively maintained product that does what Valor does: autonomous AI quality evaluation of community messages with real-time crypto payment execution.**

---

### 2.3 Exact Target Audience — People With Actual Budget

**Primary: Web3 Protocol DevRel and Community Teams (B2B)**

These are the people at funded blockchain protocols — Solana Foundation, Arbitrum, Optimism, Base, Avalanche, emerging L2s — who are paid to manage Telegram communities ranging from 5,000 to 100,000 members. They have explicit community management budgets. They use multiple SaaS tools. They are comfortable with crypto-native payments infrastructure. The pain is acute: they know their best contributors are underrecognized, they spend hours manually identifying them for grants and rewards programs, and they see high-signal community members churning out to communities that pay better.

Budget signals: Community management agencies charge $2,000-5,000/month for human management. A $99-199/month SaaS that automates the recognition and reward layer is a trivial expense against that.

**Secondary: Web3 Community Management Agencies (B2B, Multi-Community)**

Agencies like Coinbound, TokenMinds, and dozens of smaller operations manage communities for multiple web3 clients simultaneously. These operators have operational efficiency incentives and a volume model that makes per-community pricing attractive. A community manager running 10 client Telegram groups would pay $149-299/month for a tool that automatically keeps their communities healthy and their contributors recognized — while their billable time stays focused on strategy.

**Tertiary: DAO Working Groups and Protocol Ambassador Programs**

Individual DAOs running ambassador programs — where community members earn rewards for educating, onboarding, and supporting other members — are currently using Coordinape or manual spreadsheets. A tool that automates the "who deserves a reward" decision with AI and executes payment instantly is an obvious upgrade.

**Who does NOT have budget (ignore these):**
- Individual Telegram group hobbyists (no budget, no need for crypto rewards)
- Small NFT project communities (budgets are crypto-volatile, communities are small)
- Non-web3 communities (friction of crypto payments is a dealbreaker)

---

## SECTION 3 — THE "GOLDMINE" REFACTOR BLUEPRINT

### 3.1 The Pivot: From Autonomous Tipping Bot to Multi-Tenant Community Rewards SaaS

**The painkiller positioning:**
> *"Valor is the AI community rewards engine that identifies and pays your top Telegram contributors automatically — so your best members stay engaged without you managing it manually."*

The key product unlock is **true multi-tenancy with self-serve onboarding**. One SaaS product. Hundreds of communities. Each community admin installs Valor's Telegram bot, funds a USDC treasury on Base chain, and sets their scoring threshold. Valor handles the rest.

**What changes:**
- WDK → Coinbase CDP Smart Wallets on Base (production infrastructure, gasless, actively maintained)
- Ethereum mainnet USDT → Base chain USDC (sub-cent fees, gasless for contributors)
- Firebase Genkit → Vercel AI SDK `generateObject()` (3 lines, zero overhead)
- Single-community → Full multi-tenant SaaS with Lemon Squeezy billing
- Sync webhook execution → Async background queue via Upstash QStash
- Manual ETH gas seeding → Coinbase Paymaster gasless model (contributors never touch ETH)

**What stays:**
- The two-filter pre-evaluation system (brilliant cost engineering, keep exactly as is)
- The Gemini 2.5 Flash evaluation logic (the scoring rubric is solid)
- The Supabase PostgreSQL schema (extend it, don't replace it)
- The Next.js 15 + Vercel deployment model
- The Realtime dashboard subscriptions

---

### 3.2 Technical Specifications

#### Stack Decision Table

| Layer | Old (WIP) | New (Production) | Reason |
|---|---|---|---|
| Framework | Next.js 15 + TS | Next.js 15 + TS | No change needed |
| AI Evaluation | Firebase Genkit + Gemini 2.5 Flash | Vercel AI SDK + Gemini 2.5 Flash | Drop framework overhead, keep model |
| Wallet Infrastructure | `@tetherto/wdk-wallet-evm` | Coinbase CDP Smart Wallets | Production-grade, gasless, actively supported |
| Blockchain | Ethereum Sepolia (USDT) | Base mainnet (USDC) | Sub-cent gas, gasless Smart Wallets, USDC native |
| Database | Supabase PostgreSQL | Supabase PostgreSQL | Extend with billing + multi-tenant tables |
| Background Jobs | None (sync webhook) | Upstash QStash | Solves 10s webhook timeout, prevents duplicate tips |
| Billing | None | Lemon Squeezy | Khalid's preferred MoR, global VAT compliance |
| Deployment | Vercel | Vercel | No change needed |
| Telegram SDK | `node-telegram-bot-api` | Direct Telegram Bot API webhook | Drop unused library weight |
| Realtime | Supabase Realtime | Supabase Realtime | No change needed |

#### Database Schema — Revised

The original schema's core tables are retained and extended. New tables in **bold**:

```
communities
  id                UUID PK
  name              TEXT
  telegram_chat_id  TEXT UNIQUE
  bot_token         TEXT          -- per-community bot token (multi-tenant key)
  tip_amount        NUMERIC       -- USDC per tip
  daily_limit       INTEGER       -- max tips/user/day
  min_score         INTEGER       -- Gemini threshold (1-10)
  treasury_address  TEXT          -- CDP Smart Wallet address for this community
  treasury_balance  NUMERIC       -- cached USDC balance (refreshed on tip)
  plan_id           UUID FK→plans
  owner_user_id     UUID FK→users
  created_at        TIMESTAMPTZ

evaluations
  id                UUID PK
  community_id      UUID FK
  telegram_user_id  TEXT          -- Telegram numeric ID (more stable than username)
  username          TEXT
  message_content   TEXT
  score             INTEGER
  reason            TEXT
  should_tip        BOOLEAN
  timestamp         TIMESTAMPTZ

tips
  id                UUID PK
  community_id      UUID FK
  telegram_user_id  TEXT
  username          TEXT
  amount            NUMERIC
  wallet_address    TEXT          -- CDP Smart Wallet address assigned to contributor
  tx_hash           TEXT
  transaction_status TEXT
  idempotency_key   TEXT UNIQUE   -- prevents duplicate tips from webhook retries
  timestamp         TIMESTAMPTZ

wallets
  id                UUID PK
  community_id      UUID FK
  telegram_user_id  TEXT
  username          TEXT
  cdp_wallet_id     TEXT          -- CDP Smart Wallet ID (not a seed index)
  wallet_address    TEXT
  created_at        TIMESTAMPTZ
  UNIQUE(community_id, telegram_user_id)

rate_limits
  id                UUID PK
  community_id      UUID FK
  telegram_user_id  TEXT
  tips_today        INTEGER
  last_tip_at       TIMESTAMPTZ
  date              DATE
  UNIQUE(community_id, telegram_user_id, date)

[NEW] users
  id                UUID PK
  email             TEXT UNIQUE
  created_at        TIMESTAMPTZ

[NEW] plans
  id                UUID PK
  name              TEXT          -- 'free' | 'starter' | 'pro' | 'business'
  price_monthly     NUMERIC
  max_communities   INTEGER
  max_evals_monthly INTEGER       -- -1 = unlimited
  max_tips_monthly  INTEGER       -- -1 = unlimited
  lemon_variant_id  TEXT          -- Lemon Squeezy variant ID

[NEW] subscriptions
  id                UUID PK
  user_id           UUID FK→users
  plan_id           UUID FK→plans
  lemon_subscription_id TEXT
  status            TEXT          -- 'active' | 'cancelled' | 'past_due'
  current_period_end TIMESTAMPTZ
  created_at        TIMESTAMPTZ
```

**Critical fix — Idempotency Key:**
Every tip row gets an `idempotency_key` computed as `sha256(community_id + telegram_user_id + message_id)`. Before firing any tip, a `INSERT ... ON CONFLICT DO NOTHING` on this key is attempted. If the row already exists, execution halts. This makes tip execution safe against webhook retries and duplicate webhook deliveries.

**Critical fix — Wallet creation atomicity:**
CDP Smart Wallets are created via the CDP API (not BIP-44 index derivation). The `wallets` table stores the CDP wallet ID returned by the API, not a derivation index. A Supabase `INSERT ... ON CONFLICT (community_id, telegram_user_id) DO NOTHING RETURNING *` handles concurrent wallet creation — the second call finds the existing wallet row and uses it.

#### Data Flow — Revised Request Lifecycle

```
1. Telegram POST arrives at /api/webhook/[botToken]
   → Authenticate via TELEGRAM_WEBHOOK_SECRET header
   → Resolve community by botToken lookup in communities table
   → Validate update type is Message
   → Return 200 immediately  ← THIS IS THE KEY CHANGE

2. Enqueue tip evaluation job via Upstash QStash
   → Payload: { communityId, message, telegramUserId, username, messageId }
   → QStash guarantees at-least-once delivery with retry semantics
   → Returns job ID

3. QStash delivers to /api/jobs/evaluate
   → Filter 1 (instant, free — unchanged from original)
   → Filter 2 (instant, free — unchanged from original)
   → Gemini evaluation via Vercel AI SDK generateObject()
   → Write evaluation row to Supabase
   → Rate limit checks (3 Supabase reads)
   → Idempotency key check (prevents duplicates on QStash retry)
   → CDP Smart Wallet lookup or creation
   → USDC transfer via CDP API (Base chain, gasless via Paymaster)
   → Write tip row + upsert rate limit
   → Telegram notification (async, non-blocking)
```

The webhook returns 200 in under 50ms. The evaluation job runs in a separate serverless invocation with a 5-minute timeout — no constraint from Telegram's 10-second window.

---

### 3.3 SaaS Pricing Model (Lemon Squeezy)

| Plan | Price | Communities | Evals/month | Tips/month | Target |
|---|---|---|---|---|---|
| **Free** | $0 | 1 | 100 | 10 | Try before you pay |
| **Starter** | $29/month | 1 | 2,000 | 200 | Solo community manager |
| **Pro** | $79/month | 5 | 10,000 | 1,000 | Agency managing 3-5 clients |
| **Business** | $179/month | Unlimited | Unlimited | Unlimited | Protocol DevRel teams |

Revenue math for goal-setting:
- 50 Starter + 20 Pro + 5 Business = $4,030 MRR ($48K ARR)
- 100 Starter + 50 Pro + 20 Business = $9,430 MRR ($113K ARR)

These numbers are realistic for organic distribution in the web3 DevRel and community management space within 6-12 months for a solo founder with Khalid's reach.

---

### 3.4 UI/UX Reflow — The Complete User Journey

The visual identity stays: dark/premium, gold accents, 🕯️ motif, "The Web3 Wizard" energy. What changes is the journey.

**Page 1 — Landing Page (`/`)**
A single-scroll dark landing page with three zones:
- **Hero:** "Your best community contributors are leaving. Valor pays them to stay." with a live mock activity feed showing real-time tip events (gold transaction announcements, contributor usernames, USDC amounts)
- **How it works:** 3-step visual (Bot watches → AI scores → USDC sent) — no text blocks, pure motion
- **Pricing:** Three cards. Free, Starter ($29), Pro ($79). Business: "Talk to us." Clean toggle Monthly/Annual. CTA: "Start free — no credit card"

**Page 2 — Auth + Onboarding (`/auth`, `/onboard`)**
OAuth via Telegram (Telegram Login Widget) or email magic link. After auth, a 4-step onboarding wizard:
1. **Step 1 — Create Community:** Name your community, paste your Telegram group @handle
2. **Step 2 — Get Your Bot:** System generates a unique Valor bot token for this community (or user brings their own via @BotFather instructions with inline guide)
3. **Step 3 — Add Bot to Group:** One-click "Open Telegram" deep link that pre-fills the group add flow. Valor auto-detects installation via a `/start` callback.
4. **Step 4 — Fund Treasury:** Displays the community's CDP Smart Wallet address on Base. Copy button. QR code. Instructions for sending USDC. "Skip for now (free tier does not require funding)"

**Page 3 — Dashboard (`/dashboard`)**
Multi-community hub. Left sidebar shows all communities. Selected community shows:
- **Top bar:** Treasury balance (USDC), plan indicator, "Fund wallet" button
- **Stats row:** Total USDT distributed, messages evaluated, tips fired, top contributor this week
- **Live activity feed:** Every evaluation in real-time (score pill + reason text + username + optional TX link). Green rows = tipped. Gray rows = evaluated but not tipped. Gold animation on new tip events.
- **Leaderboard tab:** Top 10 contributors this period with scores and earned amounts

**Page 4 — Community Settings (`/dashboard/[communityId]/settings`)**
- Scoring threshold (slider 5-9)
- Tip amount per quality tier (score 7=1 USDC, score 9=2 USDC, score 10=3 USDC — dynamic tipping)
- Daily tip limit per user
- Custom evaluation context (text field: "This is a DeFi protocol community focused on technical questions about liquidity pools and yield strategies")
- Bot status (connected/disconnected indicator with webhook health check)

**Page 5 — Contributor Claim Portal (`/claim`)**
Fully public, no login required.
- Telegram auth widget → verify identity
- Auto-loads their earned balance across all Valor communities
- "Claim to wallet" → paste any EVM address → one-click USDC transfer from their CDP Smart Wallet to their external wallet
- No ETH needed. No gas fees. The CDP Paymaster covers it.
- Optional: "Keep in Valor wallet" — balance earns yield via Coinbase's USDC Rewards (conversation for v2)

**Email/Telegram Notifications (automated):**
- First tip earned: "You just earned 1 USDC in [Community Name]! Click to claim." (DM from Valor bot)
- Treasury low (< 10 tips remaining): Alert to community admin via email and Telegram DM
- Weekly digest to admins: Top contributors, total distributed, community health score

---

### 3.5 The Cursor Prompt to Gather Any Additional Context

If you want Cursor to read your actual codebase before building, paste this prompt into Cursor's chat:

---

> Read the following files and output a structured summary of: (1) all environment variables currently defined in `.env.local` or `.env.example`, (2) the complete folder structure of the `src/` or `app/` directory, (3) the full content of any existing Supabase migration files in `supabase/migrations/` or any `.sql` files in the repo, (4) the complete list of all npm packages in `package.json`, and (5) any existing type definitions in `types/` or `lib/` directories. Do not generate any code. Output only what you find verbatim.

---

This will surface the exact env var names, existing DB migrations, and type definitions that the Agent.md prompts should reference. Run this first before executing Phase 2.

---

## APPENDIX — Market Research Citations

- Coinbound Web3 Community Management Guide (Dec 2025): community management costs $2K-5K/month; reward outcomes not participation
- Telegram AI Update (March 2026): AI bots are now first-class platform citizens with autonomous bot creation
- SourceCred status (Gitcoin/Allo, 2026): explicitly listed as "no longer actively maintained"
- Coordinape competitors per Tracxn (2025): Degen, GitPOAP, Station — none are Telegram-native autonomous agents
- Coinbase Agentic Wallets launch (Feb 2026): CDP Smart Wallets with gasless Base transactions, TEE-secured, production GA
- Coinbase + AWS x402 integration (May 2026): machine-to-machine USDC micropayments confirmed in production
- Base chain USDC micropayments (StablecoinInsider, Dec 2025): sub-cent fee floors, congestion-resistant
- Web3 community management spend: DevRel teams at funded protocols have $2K-20K/month community budgets