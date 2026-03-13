# Valor — Architecture Deep Dive

This document covers the full system design, the reasoning behind every major technical decision, the cost model at scale, and the production migration path. It is written for engineers and technical judges who want to go beyond the README.

---

## System Overview

Valor is a serverless autonomous agent built on four primitives:

1. **Telegram Webhook** — event source. Every group message triggers the pipeline.
2. **Genkit + Gemini** — reasoning layer. Evaluates message quality, returns structured decisions.
3. **WDK** — financial execution layer. Derives wallets, transfers USDT, reads balances.
4. **Supabase** — state layer. Persists evaluations, wallets, tips, rate limits. Drives live dashboard.

These four primitives are loosely coupled. Each can be replaced or upgraded independently without touching the others.

---

## Request Lifecycle

Every Telegram webhook POST to `/api/telegram` follows this exact path:

```
1. Webhook arrives at Vercel edge
2. Secret token verified (TELEGRAM_WEBHOOK_SECRET header check)
3. Update type check — only process Message updates
4. processWebhookUpdate() called synchronously
5. Filter 1 runs (pure TypeScript, ~0.1ms)
6. Filter 2 runs (pure TypeScript, ~0.1ms)
7. Gemini evaluation via Genkit flow (~1,500–3,000ms)
8. Supabase evaluation insert (async, ~200ms)
9. Rate limit checks — 3 Supabase reads (~300ms total)
10. WDK wallet lookup or creation (~500–2,000ms)
11. WDK USDT transfer (~2,000–5,000ms, waits for confirmation)
12. ETH gas seed if new wallet (~1,000–2,000ms, non-blocking)
13. Telegram tip notification (~300ms)
14. Supabase tip insert + rate limit upsert (~300ms)
15. Response 200 returned to Telegram
```

**Total wall clock time for a tipped message: 8–12 seconds.**

Telegram requires a webhook response within 10 seconds or it retries. The architecture is designed to return 200 early if needed and complete wallet operations async — but in practice the full flow completes within the window on Sepolia.

---

## The Two-Filter System — Cost Engineering

The most important architectural decision in Valor is not WDK or Gemini. It is the two pre-filters that run before any external API call.

### Why This Matters at Scale

A Telegram group with 500 active members generating 200 messages per day:

| Scenario | Messages/day reaching Gemini | Estimated monthly Gemini cost |
|---|---|---|
| No filters | 200 | ~$12–18/month |
| Filter 1 only | ~80 | ~$5–7/month |
| Filter 1 + Filter 2 | ~20 | ~$1–2/month |

Filter 2 alone eliminates ~75% of messages that pass Filter 1. The combination makes Valor economically viable on the free tier for small communities and keeps costs negligible even at moderate scale.

### Filter 1 — Hard Rules

Runs in pure TypeScript with zero external dependencies. Executes in under 1ms.

```
Discard if ANY of:
- sender.is_bot === true
- message.text is undefined or empty
- message.text.startsWith('/')
- word count of stripped text < 4
```

The word count check strips emojis and unicode before counting. This prevents emoji-inflated messages ("gm 🚀🔥💎🙌 ser") from passing on character count while being caught on word count.

### Filter 2 — Substance Signal

Also pure TypeScript, zero external dependencies, under 1ms.

```
Pass if ANY of:
- message contains '?'
- word count > 8
- message contains a crypto domain keyword
```

**Crypto keyword list** (24 terms): wallet, token, blockchain, contract, protocol, defi, nft, gas, bridge, stake, yield, liquidity, chain, transaction, address, seed, exchange, dex, cex, rugpull, whitepaper, tokenomics, airdrop, mint, burn.

The keyword list is intentionally domain-specific. Generic English words (how, why, what, explain) were explicitly excluded after analysis showed they appear constantly in non-substantive messages ("how are you", "what time is it"). Crypto keywords carry genuine signal — they almost never appear in low-effort spam.

---

## The Gemini Evaluation Layer

### Why Genkit

Genkit is Google's AI orchestration framework. It wraps Gemini calls in typed flows with defined input/output schemas validated by Zod. This means:

- Gemini always returns valid, parseable JSON — not a freeform string
- Input/output types are enforced at compile time
- The flow can be tested in isolation without a running server
- It serves as Valor's agent reasoning framework — the equivalent of OpenClaw in the WDK track requirements

### Evaluation Schema

```typescript
const EvaluationInput = z.object({
  messageText: z.string(),
  parentMessageText: z.string().optional(), // reply context
  communityContext: z.string(),             // evaluation criteria
});

const EvaluationOutput = z.object({
  score: z.number().min(0).max(10),
  reason: z.string(),       // one sentence, visible to community
  should_tip: z.boolean(),  // true if score >= community min_score
});
```

### Reply Context

When a message is a Telegram reply, the `reply_to_message` field from the webhook update is extracted and passed to Gemini as `parentMessageText`. This prevents a technically correct but context-dependent reply ("Yes, exactly — and that's why slippage matters") from being scored in isolation and receiving a low score for apparent brevity.

### Score Calibration

The community's `min_score` is configurable (default: 7). The Gemini prompt includes this threshold explicitly. Observed scoring behavior in production:

| Message type | Typical score |
|---|---|
| "gm" / "LFG" / single emoji | 0–2 |
| Vague question with no context | 3–4 |
| Decent question or partial answer | 5–6 |
| Clear, accurate technical answer | 7–8 |
| Detailed explanation with examples | 9–10 |

---

## WDK Integration — Full Technical Detail

### Package Choice

`@tetherto/wdk-wallet-evm` — standard EVM module, no native binary dependencies.

The alternative, `wdk-wallet-evm-erc-4337`, was evaluated and rejected for this deployment. It depends on the Safe SDK, which requires `sodium-native` — a C++ native binary compiled with node-gyp. Vercel's serverless Lambda environment does not allow compiled `.node` addon files. The package fails to load at cold start with a module resolution error. This is not a limitation of WDK itself — it is a Vercel constraint. On a persistent Node.js host (Railway, Render, a VPS), the ERC-4337 module works correctly.

### HD Wallet Derivation

Valor uses BIP-44 hierarchical deterministic wallet derivation from a single master seed phrase:

```
Master Seed (BIP-39 mnemonic, 12 words, env var only)
    │
    ├── m/44'/60'/0'/0/0  → index 0 = Master Treasury
    ├── m/44'/60'/0'/0/1  → index 1 = First contributor
    ├── m/44'/60'/0'/0/2  → index 2 = Second contributor
    └── m/44'/60'/0'/0/N  → index N = Nth contributor
```

**Why deterministic derivation matters:**

- **Recovery:** If the Supabase database is completely lost, every contributor wallet address can be re-derived from the master seed and a sequential scan of indices. No funds are permanently lost.
- **Security:** Only `wallet_address` and `account_index` are stored in Supabase. Private keys never exist as stored values — they are derived on demand and held in memory only during the transaction.
- **Auditability:** Any wallet in the system can be independently verified to derive from the master seed, proving it was created by Valor and not injected externally.

### Transfer Flow

```typescript
// 1. Get or derive contributor wallet
const existingWallet = await getWalletByUsername(username, communityId);
let accountIndex: number;

if (existingWallet) {
  accountIndex = existingWallet.account_index;
} else {
  accountIndex = await getNextAccountIndex(communityId);
  const newAccount = await manager.getAccount(accountIndex);
  const newAddress = await newAccount.getAddress();
  await insertWallet(username, newAddress, accountIndex, communityId);
  
  // Seed ETH for withdrawal gas (non-blocking)
  seedEthForGas(newAddress).catch(err => console.error('[GasSeed] Failed:', err));
}

// 2. Execute USDT transfer from master (index 0) to contributor
const masterAccount = await manager.getAccount(0);
const contributorAccount = await manager.getAccount(accountIndex);
const contributorAddress = await contributorAccount.getAddress();

const result = await masterAccount.transfer({
  token: USDT_CONTRACT_ADDRESS,
  recipient: contributorAddress,
  amount: BigInt(tipAmount * 1_000_000), // 6 decimals
});

// result.hash is the confirmed transaction hash
```

### Rate Limit Atomicity

Rate limit increments use a PostgreSQL RPC function (`upsert_rate_limit`) rather than a read-modify-write in application code. This prevents race conditions if two webhook calls for the same user arrive within milliseconds of each other — both would read `tips_today: 0`, both would increment to 1, and both would fire. The SQL `ON CONFLICT DO UPDATE` is atomic at the database level.

---

## Anti-Gaming Design

Valor handles a real economic incentive system. Where there is money, there are farmers. The anti-gaming layers are designed around a core principle: **raise the cost of farming without punishing genuine contributors.**

### Layer 1 — Pre-filter Cost Barrier
Over 90% of messages never reach Gemini. A farming attempt using copy-pasted generic messages fails at Filter 1 or Filter 2. The attacker must craft messages that genuinely look like crypto community contributions to even reach the evaluation layer.

### Layer 2 — AI Evaluation Quality Bar
Gemini scores 0–10 and only `should_tip: true` messages proceed. The threshold is configurable. A determined farmer using GPT-generated crypto explanations can potentially score 7–8 consistently — but this requires generating genuinely high-quality crypto content, which has real effort cost.

### Layer 3 — Daily Tip Limit
Maximum configurable tips per user per day (default: 3). A farmer who generates 3 high-quality messages in a day and earns 3 tips at 2 USDT each earns 6 USDT. This is not an exploitable return on the effort required.

### Layer 4 — Cooldown
30-minute minimum between tips to the same user. Burst farming — sending 10 high-quality messages in rapid succession — is blocked.

### Layer 5 — New User Penalty
Users with fewer than 5 total evaluations require `min_score + 1` to tip. This creates a warmup period. A fresh account farming immediately faces a higher bar. Genuine new contributors who ask one good question earn their first tip legitimately — but the bar ensures the very first message can't farm maximum value.

### Layer 6 — Economic Deterrent
The master wallet is funded by the community admin with real USDT. The admin controls the treasury. If gaming is detected, the admin can reduce tip amounts, increase the min_score, or drain the treasury. The agent is configurable in real time via direct Supabase edits.

---

## Dashboard Architecture

The dashboard at `/` is a Next.js 15 App Router page with two data streams:

**Initial load:** Server component fetches recent evaluations and tips from Supabase on render. Page arrives pre-populated.

**Live updates:** Client component subscribes to Supabase Realtime channels for `evaluations` and `tips` tables. New rows appear in the activity log without page refresh, in real time, as messages are processed by the webhook.

**Stats cards:** Refresh every 30 seconds via a client-side interval, re-fetching aggregate counts from Supabase.

This architecture means the dashboard works correctly even if JavaScript is disabled (initial server render) while providing a live experience when JavaScript is available.

---

## Cost Model at Scale

Estimated monthly operating cost for a production Valor deployment:

| Component | 500 members · 200 msg/day | 5,000 members · 2,000 msg/day |
|---|---|---|
| Vercel (serverless) | Free tier | ~$20/month (Pro) |
| Supabase (database) | Free tier | ~$25/month (Pro) |
| Gemini API (~20 calls/day) | ~$1–2/month | ~$10–15/month |
| WDK / Sepolia ETH | ~$0 testnet | Gas costs at actual scale |
| **Total** | **~$1–2/month** | **~$55–60/month** |

The two-filter system is what makes the Gemini cost negligible. Without it, Gemini costs scale linearly with group activity. With it, they scale with genuine contribution volume — which grows much more slowly.

---

## Production Migration Path

Moving Valor from Sepolia testnet to Ethereum mainnet requires four changes:

```env
# Change these environment variables only
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
NETWORK_NAME=mainnet
ETHERSCAN_BASE_URL=https://etherscan.io
```

No application code changes. No schema changes. No redeployment required beyond environment variable updates.

**Additional production requirements:**
- Fund master wallet with real USDT (Tether ERC-20 on Ethereum mainnet)
- Fund master wallet with ETH for gas (until ERC-4337 upgrade)
- Set up monitoring/alerts for master wallet balance
- Consider Arbitrum or Base for lower gas fees (RPC and contract address changes only)

---

## Known Limitations and Honest Gaps

**Single community per deployment.** The database schema supports multiple communities (`community_id` on every table) but the bot loads one community at startup via `TELEGRAM_CHAT_ID` env var. Multi-community requires a community creation flow in the admin UI and dynamic community resolution per webhook call.

**No automatic ETH gas monitoring.** If the master wallet runs out of ETH, gas seeds fail silently for new contributor wallets. A monitoring job that alerts when ETH balance drops below a threshold is not yet built.

**No retry queue.** Tips that fail due to network timeout or gas price spikes are recorded as `transfer_failed` and not automatically retried. A background job is on the roadmap.

**Testnet only.** Real USDT does not move in this demo. Sepolia USDt is worthless test currency. This is appropriate for a hackathon demonstration.

**English-language communities.** The filter keywords and Gemini evaluation prompt are English-centric. Non-English communities will see degraded filter performance. Multi-language support requires localized keyword lists and prompt engineering.

---

## Security Considerations

**Seed phrase protection:** The BIP-39 master seed exists only in Vercel environment variables. It is never logged, never stored in Supabase, never transmitted to any external service except the WDK library running in-process.

**Webhook verification:** Every POST to `/api/telegram` is verified against `TELEGRAM_WEBHOOK_SECRET`. Requests without the correct secret token are rejected before any processing occurs.

**No private key storage:** Only wallet addresses and BIP-44 derivation indices are stored in Supabase. A full database compromise exposes contributor wallet addresses (public information) but no private keys or seed material.

**Rate limiting as abuse prevention:** The three-layer rate limiting system (daily limit, cooldown, new user penalty) protects the master wallet from being drained by a single determined attacker. Combined with the community admin's ability to configure `min_score` and `tip_amount` in real time, the system has meaningful resistance to economic attack.

---

*For setup instructions, see the README. For a live demo walkthrough, see DEMO.md.*
