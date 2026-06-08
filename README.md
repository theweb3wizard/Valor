<p align="center">
  <img src="public/banner.png" alt="Valor Logo" width="120" />
</p>

# Valor — Autonomous Community Intelligence Agent

> **Valor watches your Telegram group, decides who contributed real value, and sends them USDC on Base. No commands. No voting. No humans in the loop.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Network](https://img.shields.io/badge/network-Base-blueviolet.svg)](https://basescan.org)
[![Stack](https://img.shields.io/badge/stack-CDP%20|%20AI%20SDK%20|%20QStash-orange.svg)]()

**Live Dashboard:** [valorapp.com](https://valorapp.com)

---

## What Valor Is

Valor is an AI agent that lives inside a Telegram group and runs a continuous quality loop. Every message is evaluated by Gemini 2.5 Flash. When a message earns a tip, Valor creates a CDP wallet for the contributor and sends USDC on Base — no commands, no registration, no human decision.

**This is not a tipping bot.** Tipping bots wait for someone to type `/tip @user`. Valor *perceives, decides, and acts* autonomously.

---

## v2.0 Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend & API | Next.js 15 (App Router) + TypeScript | Serverless, App Router, Vercel-native |
| AI Evaluation | **Vercel AI SDK** + Gemini 2.5 Flash | Structured JSON output, streaming, typed tool calls |
| Wallet Infrastructure | **Coinbase CDP** (`coinbase-sdk`) | MPC wallets, ERC-20 USDC transfers, no seed phrase management |
| Message Queue | **Upstash QStash** | Async webhook processing — avoids Vercel 10s timeout |
| Database | Supabase (PostgreSQL + Realtime) | Live dashboard subscriptions, atomic RPC |
| Payments | **Paddle** | Subscription billing, tax compliance, invoicing |
| Telegram | `node-telegram-bot-api` (webhook mode) | Webhooks scale on Vercel; polling requires a persistent process |
| Deployment | Vercel | Zero-config Next.js, serverless functions |
| Blockchain | **Base (Coinbase L2)** | Low fees (< $0.01/tx), native USDC, EVM-compatible |

---

## Architecture

```
Telegram Member —> Message —> POST /api/telegram
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  processWebhookUpdate │
                         │  (synchronous)        │
                         │  • Hard filters       │
                         │  • Substance check    │
                         │  • Enqueue to QStash  │
                         └──────────┬───────────┘
                                    │ QStash message
                                    ▼
                         ┌──────────────────────┐
                         │  /api/evaluate        │
                         │  (async, no timeout)  │
                         │  • Gemini 2.5 Flash   │
                         │  • Score + reason     │
                         │  • Store evaluation   │
                         │  • If tip: enqueue    │
                         └──────────┬───────────┘
                                    │ QStash message
                                    ▼
                         ┌──────────────────────┐
                         │  /api/execute-tip     │
                         │  (async, no timeout)  │
                         │  • CDP wallet derive  │
                         │  • Treasury balance   │
                         │  • Rate limit check   │
                         │  • USDC transfer      │
                         │  • Telegram notify    │
                         └──────────────────────┘
```

Key change from v1: **QStash decouples the webhook**. Telegram's webhook has a 10-second timeout. With QStash, the webhook handler just filters and enqueues. The heavy work (AI evaluation, blockchain transfer) happens asynchronously with no timeout constraint.

---

## Coinbase CDP Integration

Valor v2.0 replaces the WDK wallet infrastructure with Coinbase Developer Platform's **MPC wallets**:

```typescript
import { Coinbase } from '@coinbase/coinbase-sdk';

// Server-side WalletManager
class CDPWalletManager {
  async getOrCreateWallet(communityId: string, userId: string): Promise<Wallet> {
    // CDP creates MPC wallets — no seed phrase, no private keys
    return await Wallet.create({ networkId: NetworkId.BaseSepolia });
  }

  async transferUSDC(from: Wallet, to: string, amount: number): Promise<string> {
    const transfer = await from.createTransfer({
      amount,
      assetId: 'usdc',
      destination: to,
    });
    return transfer.getTransactionHash();
  }
}
```

Key advantages over WDK:
- **No seed phrase management** — CDP handles key sharding with MPC
- **Gasless** — CDP can sponsor gas or the treasury covers it
- **Any EVM chain** — Base, Base Sepolia, Polygon, Ethereum mainnet
- **No native dependencies** — pure TypeScript, deploys cleanly to Vercel

---

## How It Works

### Flow: Telegram Message → USDC Tip

1. **Message arrives** via webhook at `/api/telegram`
2. **Hard filters** drop bots, commands, short messages (~60% eliminated)
3. **Substance check** passes only messages with questions, length, or domain keywords (~80% of remainder eliminated)
4. **QStash enqueue** — heavy work is queued, webhook returns 200 immediately
5. **Gemini evaluation** at `/api/evaluate` — returns score (0–10) + reason
6. **Rate limit check** — daily limit, cooldown, new-user penalty
7. **CDP wallet** get-or-create for the contributor
8. **USDC transfer** from community treasury → contributor's CDP wallet
9. **Telegram notification** with score, reason, and claim link

### AI Evaluation

```typescript
const { text } = await generateText({
  model: gemini25Flash,
  system: `You evaluate Telegram messages for quality on a scale of 0-10.
Score 7+ merits a USDC reward.
Reward: accurate answers, technical explanations, genuine insight.
Penalize: spam, self-promotion, low-effort, one-word replies.`,
  prompt: `Message: "${messageContent}"
${isReply ? `In reply to: "${parentContent}"` : ''}`,
});
```

---

## Pages

| Path | Description |
|---|---|
| `/` | Landing page (Hero, How It Works, Pricing) |
| `/login` | Email magic link authentication |
| `/dashboard` | Live feed + stats (Supabase Realtime) |
| `/admin` | Community setup, wallet funding, configuration |
| `/claim` | Contributors claim tips to external wallets |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |
| `/refund` | Refund Policy |
| `/faq` | Frequently Asked Questions |

---

## Pricing

| Plan | Price | Communities | Evals/mo | Tips/mo |
|---|---|---|---|---|
| Free | $0 | 1 | 100 | 10 |
| Starter | $29/mo | 1 | 5,000 | 500 |
| Pro | $79/mo | 5 | 25,000 | 2,500 |
| Business | Custom | Unlimited | Custom | Custom |

Billed monthly via Paddle. You only pay Vercel infrastructure costs on top.

---

## Running Locally

### Prerequisites

- Node.js 20+
- Supabase project
- Telegram bot token ([@BotFather](https://t.me/botfather))
- Google AI API key (Gemini)
- Coinbase CDP API key
- Upstash QStash token
- Paddle API credentials (optional for local)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/Valor.git
cd valor
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# AI
GEMINI_API_KEY=

# Coinbase CDP
CDP_API_KEY_NAME=
CDP_API_KEY_PRIVATE_KEY=
CDP_NETWORK_ID=base-sepolia

# Upstash QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database

```sql
-- Core tables (see src/db/ for full schema)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chat_id TEXT NOT NULL UNIQUE,
  creator_user_id UUID NOT NULL,
  tip_amount NUMERIC NOT NULL DEFAULT 2,
  daily_limit INTEGER NOT NULL DEFAULT 5,
  min_score INTEGER NOT NULL DEFAULT 7,
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  usdc_balance NUMERIC NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
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
  amount NUMERIC NOT NULL,
  wallet_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL,
  fail_reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  paddle_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Run

```bash
npm run dev
```

For Telegram webhook:

```bash
ngrok http 3000

curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url/api/telegram&secret_token=<WEBHOOK_SECRET>"
```

### 5. Fund Treasury

Copy the community treasury wallet address from the admin dashboard and send USDC on Base Sepolia (testnet) or Base (mainnet).

---

## Third-Party Services

| Service | Purpose |
|---|---|
| **Coinbase CDP** | MPC wallets, USDC transfers on Base |
| **Google Gemini 2.5 Flash** | Message quality evaluation |
| **Vercel AI SDK** | AI orchestration framework |
| **Supabase** | Database + auth + Realtime |
| **Upstash QStash** | Async message queue |
| **Paddle** | Subscription billing |
| **Telegram Bot API** | Message ingestion + notifications |
| **Vercel** | Hosting + serverless functions |
| **Tailwind CSS + shadcn/ui** | UI components |

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)

---

*Built by Khalid — The Web3 Wizard ([@khalidx_dev](https://twitter.com/khalidx_dev))*
