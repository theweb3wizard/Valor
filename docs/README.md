<p align="center">
  <img src="public/banner.png" alt="Valor Logo" width="120" />
</p>
# Valor — Autonomous Community Intelligence Agent

> **Valor watches your Telegram group, decides who contributed real value, and sends them USDT on-chain. No commands. No voting. No humans in the loop.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Network](https://img.shields.io/badge/network-Ethereum%20Sepolia-purple.svg)](https://sepolia.etherscan.io)
[![Track](https://img.shields.io/badge/track-Agent%20Wallets-orange.svg)]()
[![Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://valor-tgbot.vercel.app)

**Live Dashboard:** [valor-tgbot.vercel.app](https://valor-tgbot.vercel.app)  
**Hackathon:** Tether Hackathon Galactica: WDK Edition 1 — Agent Wallets Track

---

## What Valor Is

Valor is a fully autonomous AI agent that lives inside a Telegram group and runs a continuous quality assessment loop. Every message that enters the group is evaluated by Gemini AI for genuine contribution quality. When a message earns it, Valor automatically creates a non-custodial USDT wallet for the contributor via WDK, transfers a real USDT tip from the community treasury on-chain, and announces the transaction in the group — including the Etherscan link.

The contributor visits the Valor dashboard to withdraw their accumulated USDT to any external wallet address.

**No admin types `/tip`. No community member registers. No vote is taken. The agent decides and acts.**

This is not a tipping bot. Existing tipping bots execute commands humans issue. Valor is an agent — it perceives, reasons, and acts entirely on its own.

---

## The Problem

Crypto communities on Telegram are full of people asking good questions, writing detailed explanations, and helping newcomers understand complex topics. Almost none of them get rewarded for it.

**Command-based tipping bots** (tip.cc, LightningTipBot, Sats-n-Facts) require a human to notice a good message and manually type a command. This almost never happens consistently. Humans are busy, biased, and forget.

**Reaction-based systems** reward popularity over substance. A meme gets more hearts than a technically accurate answer to a hard question.

**Token reward systems** require members to claim tokens, connect wallets, and navigate interfaces. Friction kills adoption. Most members never claim anything.

The result: the most genuinely helpful contributors leave because their effort goes unrecognized. Low-effort content that generates reactions gets all the attention.

**Valor removes humans from the reward decision entirely.** An AI agent evaluates every message against objective quality criteria and executes payment autonomously. Merit is measured, not perceived.

---

## How It Works

The complete autonomous flow, from Telegram message to confirmed on-chain USDT transfer:

```
Member sends message in Telegram group
         │
         ▼
┌─────────────────────────────────────────────┐
│   FILTER 1 — Hard Rules (instant, free)     │
│   • Sender is a bot?           → drop       │
│   • No text content?           → drop       │
│   • Starts with / (command)?   → drop       │
│   • Fewer than 4 real words?   → drop+log   │
│   ~60% of all messages end here             │
└─────────────────────────────────────────────┘
         │ PASS
         ▼
┌─────────────────────────────────────────────┐
│   FILTER 2 — Substance Signal (instant)     │
│   Pass if ANY of:                           │
│   • Contains a question mark                │
│   • Word count > 8                          │
│   • Contains a crypto domain keyword        │
│     (wallet, token, gas, defi, bridge…)     │
│   Fails all three?             → drop+log   │
│   ~80% of remaining messages end here       │
└─────────────────────────────────────────────┘
         │ PASS
         ▼
┌─────────────────────────────────────────────┐
│   GEMINI 2.5 FLASH EVALUATION               │
│   • Receives message text                   │
│   • If reply: receives parent message too   │
│   • Returns score (0–10)                    │
│   • Returns one-sentence reason             │
│   • Returns should_tip boolean              │
│   Score < community threshold?  → log only  │
└─────────────────────────────────────────────┘
         │ score ≥ 7 (configurable)
         ▼
┌─────────────────────────────────────────────┐
│   RATE LIMIT ENGINE                         │
│   • Daily tip limit not exceeded?           │
│   • 30-min cooldown since last tip?         │
│   • New user penalty: <5 evals = +1 req'd   │
│   Any check fails?              → log only  │
└─────────────────────────────────────────────┘
         │ ALL PASS
         ▼
┌─────────────────────────────────────────────┐
│   WDK WALLET OPERATION                      │
│   • Look up contributor in wallets table    │
│   • If new: derive HD wallet at next index  │
│   • If new: seed 0.005 ETH for gas          │
│   • Transfer USDT from treasury (index 0)   │
│     to contributor wallet (index N)         │
│   • Wait for on-chain confirmation          │
└─────────────────────────────────────────────┘
         │ confirmed
         ▼
┌─────────────────────────────────────────────┐
│   NOTIFICATION + LOGGING                    │
│   • Telegram group: tip announcement        │
│     with score, reason, Etherscan link,     │
│     and withdraw URL                        │
│   • Supabase: tip row with tx_hash          │
│   • Rate limit: upsert_rate_limit RPC       │
│   • Dashboard: live update via Realtime     │
└─────────────────────────────────────────────┘
```

**The entire flow — from message receipt to on-chain confirmation — completes in 8–12 seconds.**

Every step runs inside a single Vercel serverless function triggered by a Telegram webhook. No polling. No cron jobs. No persistent process required.

---

## Architecture

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend & API | Next.js 15 (App Router) + TypeScript | Unified server/client, serverless API routes, Vercel-native |
| AI Evaluation | Firebase Genkit + Gemini 2.5 Flash | Structured JSON output, fast inference, typed flows |
| Database | Supabase (PostgreSQL + Realtime) | Live dashboard subscriptions, atomic RPC functions |
| Telegram | node-telegram-bot-api (webhook mode) | Webhooks scale on Vercel; polling requires a persistent process |
| Wallet Infrastructure | @tetherto/wdk-wallet-evm | HD wallet derivation, ERC-20 USDT transfers, non-custodial |
| Deployment | Vercel | Zero-config Next.js deployment, serverless functions per route |
| Blockchain | Ethereum Sepolia testnet | Real on-chain USDT transfers, verifiable on Etherscan |

### System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       TELEGRAM GROUP                          │
│  Member → Message → Telegram API → POST /api/telegram         │
└────────────────────────────┬─────────────────────────────────┘
                             │ webhook (verified by secret token)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                 VERCEL SERVERLESS (Next.js)                   │
│                                                              │
│  /api/telegram                                               │
│    └── processWebhookUpdate()                                │
│          ├── Filter 1 + Filter 2 (instant)                   │
│          ├── evaluateTelegramMessageQuality (Genkit/Gemini)  │
│          ├── Rate limit checks (Supabase)                    │
│          └── WDK layer (wdk.ts)                              │
│               ├── WalletManagerEvm.getAccount(index)         │
│               ├── account.transfer() → tx hash              │
│               └── ETH gas seeding for new wallets            │
│                                                              │
│  / (Dashboard)   /admin   /withdraw                          │
└──────────┬───────────────────────────┬───────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐   ┌──────────────────────────────────┐
│  SUPABASE           │   │  ETHEREUM SEPOLIA                 │
│  • communities      │   │  Master wallet (index 0):         │
│  • wallets          │   │  0x1edD6aD1...4828cA              │
│  • tips             │   │  Contributor wallets (index 1–N)  │
│  • evaluations      │   │  Deterministically derived        │
│  • rate_limits      │   │  from master seed via BIP-44      │
│  Realtime → Dashboard│  └──────────────────────────────────┘
└─────────────────────┘
```

### Key Design Decisions

**Webhook over polling.** Vercel serverless functions are ephemeral — they spin up per request and terminate. Polling requires a persistent process. Webhook mode is the only architecture that works correctly on Vercel and handles scale at zero marginal infrastructure cost.

**Two pre-filters before Gemini.** Gemini API calls cost money and add latency. The two-filter system eliminates over 90% of messages before any AI call is made — bot messages, greetings, single-word replies, non-substantive content — at zero cost. Only messages with genuine substance signals reach the model. This makes Valor cost-effective at scale and fast enough to complete tip decisions within Telegram's 10-second webhook timeout.

**HD wallet derivation over random keypairs.** Valor derives contributor wallets deterministically from the master seed using BIP-44 paths (index 1, 2, 3...). Wallet addresses are always recoverable from the seed alone. The `account_index` stored in Supabase is the only thing needed to reconstruct any wallet. If the database is lost, no funds are lost.

**Seeds and private keys never touch the database.** Only `wallet_address` and `account_index` are stored in Supabase. The seed phrase exists only in environment variables. If Supabase is fully compromised, no funds are exposed.

**Non-blocking ETH gas seeding.** When a new contributor wallet is created, Valor immediately seeds it with 0.005 Sepolia ETH from the master wallet to cover future withdrawal gas. This runs after the wallet DB insert and does not block the USDT tip — if the gas seed fails, the tip still fires. This is explicitly a testnet mechanism. On mainnet, the correct solution is ERC-4337 account abstraction via WDK's `wdk-wallet-evm-erc-4337` module, where gas is paid in USDT by a paymaster and contributors never need ETH at all.

**Genkit as the agent framework.** Genkit structures AI calls as typed flows with defined input/output schemas. This means Gemini always returns valid, parseable JSON — not a freeform string that might fail. It functions as Valor's agent reasoning layer: the equivalent of OpenClaw in the WDK track requirements.

---

## WDK Integration

Valor uses `@tetherto/wdk-wallet-evm` as its core financial infrastructure. Every wallet operation — derivation, balance checking, USDT transfer — goes through WDK.

### WDK Primitives Used

```typescript
// Singleton wallet manager — one instance per serverless invocation
const manager = new WalletManagerEvm(masterSeed, {
  provider: 'https://sepolia.drpc.org',
  transferMaxFee: BigInt('5000000000000000'), // 0.005 ETH max gas cap
});

// Derive HD wallet at BIP-44 index
// index 0 = master treasury | index 1+ = contributor wallets
const account = await manager.getAccount(index);

// Get the derived wallet address
const address = await account.getAddress();

// Read USDT balance (ERC-20)
const raw = await account.getTokenBalance(USDT_CONTRACT_ADDRESS);

// Execute ERC-20 transfer — resolves with tx hash on confirmation
const result = await account.transfer({
  token: '0xd077a400968890eacc75cdc901f0356c943e4fdb', // Sepolia USDt
  recipient: contributorAddress,
  amount: BigInt(2_000_000), // 2 USDT (6 decimals)
});

// Read-only balance check without signing capability
const readOnly = new WalletAccountReadOnlyEvm(address, { provider });
const balance = await readOnly.getTokenBalance(USDT_CONTRACT_ADDRESS);
```

### Wallet Architecture

```
WDK_MASTER_SEED (BIP-39 mnemonic — env var only, never stored)
        │
        ├── index 0 → Master Treasury Wallet
        │            Funded manually by community admin
        │            Sends all USDT tips + ETH gas seeds
        │
        ├── index 1 → First contributor wallet (auto-created on first tip)
        ├── index 2 → Second contributor wallet
        └── index N → Nth contributor wallet
```

The master wallet address is publicly visible in the /admin dashboard. Community admins fund it once. The agent draws from it autonomously on every confirmed tip.

### Why `wdk-wallet-evm` and not `wdk-wallet-evm-erc-4337`?

The ERC-4337 package depends on the Safe SDK, which requires `sodium-native` — a C++ native binary that cannot run in Vercel's serverless Lambda environment (no compiled `.node` addons permitted). The standard EVM package uses ethers.js for key management, has zero native binary dependencies, and deploys cleanly to Vercel. The wallet interface is identical; ERC-4337 gasless mode is the planned upgrade for mainnet on a persistent Node.js host.

---

## Real On-Chain Evidence

These are real transactions on Ethereum Sepolia. Not simulated. Not mocked. Verifiable on Etherscan right now.

**Autonomous USDT Tip:**
`0x70c5e648d4a52bfeb3ae10111840c99a7c3024cebe426e2584d3ce963df34f6d`
[View on Sepolia Etherscan →](https://sepolia.etherscan.io/tx/0x70c5e648d4a52bfeb3ae10111840c99a7c3024cebe426e2584d3ce963df34f6d)

2 USDt · From master wallet `0x554e5A...3100` → contributor wallet `0xEfbA55...785F` · March 12, 2026 · Status: **Success**

**Contributor Withdrawal:**
`0x3b07888da4085c50119e0e7dd7f4b55b00389baf32c78df334dd0662493606f7`
[View on Sepolia Etherscan →](https://sepolia.etherscan.io/tx/0x3b07888da4085c50119e0e7dd7f4b55b00389baf32c78df334dd0662493606f7)

Contributor withdrawing earned USDT to external wallet · March 12, 2026 · Status: **Success**

**Master Treasury Wallet:**
`0x1edD6aD1a3f4456dF80d6150f93F5d008a4828cA`
[View on Sepolia Etherscan →](https://sepolia.etherscan.io/address/0x1edD6aD1a3f4456dF80d6150f93F5d008a4828cA)

---

## Agent Intelligence

Valor's reasoning layer is a Genkit flow (`evaluateTelegramMessageQuality`) that calls Gemini 2.5 Flash with a structured output schema. The model receives the message content, the community evaluation criteria, and — when the message is a reply — the parent message as context. It returns a typed response every time:

```typescript
const EvaluationOutput = z.object({
  score: z.number().min(0).max(10),
  reason: z.string(),       // one sentence explaining the score
  should_tip: z.boolean(),  // true if score meets community threshold
});
```

**What the agent rewards:**
- Clear, accurate answers to community questions
- Genuine technical explanations with specific detail
- Problem-solving for other members
- Insight that advances the discussion

**What the agent penalizes:**
- One-word replies and GM/GN spam
- Self-promotion and empty marketing
- Vague statements with no informational value
- Copied or generic content

**Anti-gaming layers:**
- Rate limits: configurable daily tip maximum per user
- Cooldown: 30-minute minimum between tips to the same user
- New user penalty: users with fewer than 5 total evaluations require score + 1 to tip
- Pre-filters: over 90% of messages never reach Gemini, removing the attack surface for API abuse

---

## Dashboard & Pages

**/ — Main Dashboard**
Live autonomous activity log with Supabase Realtime subscriptions. Every evaluated message appears with score, AI reasoning, and tip status. Confirmed tips show live Etherscan links. Stats cards: Total Distributed, Avg Quality Score, High Value Tips, Active Contributors.

**[valor-tgbot.vercel.app](https://valor-tgbot.vercel.app)**

**[/admin](https://valor-tgbot.vercel.app/admin) — Community Setup**
Displays master wallet address for funding, live USDT balance, network/contract information, and step-by-step setup instructions for new community admins.

**[/withdraw](https://valor-tgbot.vercel.app/withdraw) — Contributor Withdrawals**
Username lookup, automatic community resolution, live balance display, destination address input, and one-click withdrawal with Etherscan confirmation link.

---

## Database Schema

```sql
-- Community configuration
communities (id, name, chat_id UNIQUE, tip_amount, daily_limit, min_score, usdt_balance, created_at)

-- Every evaluated message (including non-tipped)
evaluations (id, community_id, username, message_content, score, reason, should_tip, timestamp)

-- Every tip fired (confirmed or failed)
tips (id, community_id, username, amount, wallet_address, tx_hash, transaction_status, timestamp)

-- WDK wallet registry (address + derivation index only — no keys)
wallets (id, community_id, username, wallet_address, account_index, registered_at)

-- Daily tip counting + cooldown tracking
rate_limits (id, community_id, username, tips_today, last_tip_at, date, UNIQUE(community_id, username, date))
```

Rate limits use an atomic PostgreSQL RPC function (`upsert_rate_limit`) to prevent race conditions on concurrent webhook calls.

---

## Running Locally

### Prerequisites

- Node.js 20+
- Supabase project
- Telegram bot token ([@BotFather](https://t.me/botfather))
- Google AI API key (Gemini)
- BIP-39 seed phrase for WDK

### 1. Clone and Install

```bash
git clone https://github.com/theweb3wizard/Valor.git
cd valor
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_group_chat_id
TELEGRAM_WEBHOOK_SECRET=any_random_32_char_string
GEMINI_API_KEY=your_google_ai_api_key
WDK_MASTER_SEED=your_twelve_word_bip39_seed_phrase
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

### 3. Database Setup

Run in Supabase SQL Editor:

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chat_id TEXT NOT NULL UNIQUE,
  tip_amount NUMERIC NOT NULL DEFAULT 2,
  daily_limit INTEGER NOT NULL DEFAULT 3,
  min_score INTEGER NOT NULL DEFAULT 7,
  usdt_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL,
  username TEXT NOT NULL,
  message_content TEXT NOT NULL,
  score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  should_tip BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL,
  username TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 2,
  wallet_address TEXT,
  tx_hash TEXT,
  transaction_status TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL,
  username TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  account_index INTEGER NOT NULL DEFAULT 1,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL,
  username TEXT NOT NULL,
  tips_today INTEGER NOT NULL DEFAULT 0,
  last_tip_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(community_id, username, date)
);

CREATE OR REPLACE FUNCTION upsert_rate_limit(
  p_community_id UUID, p_username TEXT,
  p_date DATE, p_last_tip_at TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (community_id, username, date, tips_today, last_tip_at)
  VALUES (p_community_id, p_username, p_date, 1, p_last_tip_at)
  ON CONFLICT (community_id, username, date)
  DO UPDATE SET
    tips_today = rate_limits.tips_today + 1,
    last_tip_at = p_last_tip_at;
END;
$$ LANGUAGE plpgsql;

-- Insert your community
INSERT INTO communities (name, chat_id, tip_amount, daily_limit, min_score)
VALUES ('Your Community Name', 'your_telegram_chat_id', 2, 3, 7);
```

Enable Realtime on `evaluations` and `tips` tables: Supabase Dashboard → Database → Replication.

### 4. Run and Register Webhook

```bash
npm run dev
```

For local testing with ngrok:

```bash
ngrok http 9002

curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url/api/telegram&secret_token=<WEBHOOK_SECRET>"
```

### 5. Fund the Master Wallet

Visit `/admin`, copy the master wallet address, and send testnet USDt and ETH.

- Testnet USDt: [Pimlico faucet](https://faucet.pimlico.io) · [Candide faucet](https://faucet.candide.dev)
- Testnet ETH: [sepoliafaucet.com](https://sepoliafaucet.com)

---

## Third-Party Disclosures

| Service | Package / API | Purpose |
|---|---|---|
| **Tether WDK** | `@tetherto/wdk-wallet-evm` | HD wallet derivation, ERC-20 USDT transfers, contributor wallet management |
| **Google Gemini 2.5 Flash** | `@genkit-ai/googleai` | Message quality evaluation via structured output |
| **Firebase Genkit** | `genkit` | AI agent orchestration framework — typed flows, structured JSON output |
| **Supabase** | `@supabase/supabase-js` | PostgreSQL database with Realtime subscriptions |
| **Telegram Bot API** | `node-telegram-bot-api` | Group message ingestion via webhook, tip notifications |
| **Next.js 15** | `next` | Full-stack React framework — App Router, serverless API routes |
| **Vercel** | Platform | Serverless deployment, edge network, environment variable management |
| **ethers.js v6** | `ethers` | Native ETH transfers for contributor wallet gas seeding |
| **Tailwind CSS + ShadCN UI** | `tailwindcss`, `shadcn/ui` | Dashboard styling and components |
| **drpc.org** | RPC endpoint | Sepolia JSON-RPC provider (replaceable with any Sepolia RPC) |

No third-party service has access to the WDK seed phrase. All wallet operations execute within Valor's own runtime environment.

---

## Hackathon Disclosure

Valor was conceived and built entirely during the Tether Hackathon 
Galactica: WDK Edition 1 (March 2026). No prior codebase was used. 
All third-party services and libraries are disclosed in the 
Third-Party Disclosures section above.
```

---

## What's Next

Valor is architecturally complete for its core use case. The gaps between this testnet MVP and a production deployment are operational, not conceptual.

**Gas sponsorship via ERC-4337** — New contributor wallets are currently seeded with Sepolia ETH for withdrawal gas. The correct mainnet solution is `wdk-wallet-evm-erc-4337` with a Pimlico paymaster — gas is paid in USDT from the treasury, contributors never need ETH. WDK's interface is unchanged; this is a deployment environment upgrade.

**Mainnet deployment** — Switch the RPC endpoint and USDT contract address (`0xdAC17F958D2ee523a2206206994597C13D831ec7` on Ethereum mainnet). No application code changes required. The codebase is fully environment-configurable.

**Dynamic tip amounts** — Gemini already returns a 0–10 score for every message. The natural extension is score-proportional tips: score 7 = 1 USDT, score 10 = 5 USDT, configurable per community. The evaluation data is already stored; the change is a scoring-to-amount mapping in the tip execution logic.

**Multi-community support** — The database schema is fully multi-tenant (`community_id` on every table, separate wallet trees per community). The missing piece is a self-serve admin onboarding flow. The infrastructure is already there.

**Retry queue for failed tips** — Tips that fail due to network timeout or gas spikes are recorded with `status: transfer_failed`. A background retry job closes this loop.

**Platform model** — Open-source core, hosted managed version. Community admins who don't want to manage infrastructure pay a flat monthly fee. The moat is operational reliability and the WDK integration — not the code.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)

---

*Built by Khalid — The Web3 Wizard ([@khalidx_dev](https://twitter.com/khalidx_dev))*  
*Solo founder*  
*Building at the intersection of AI, Web3, and community infrastructure.*

*Every transaction hash in this README is real. Every claim is backed by code, a live URL, or an on-chain record.*

*Built for Tether Hackathon Galactica: WDK Edition 1 — Agent Wallets Track*
