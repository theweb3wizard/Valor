# Valor — Judge's Demo Guide

**Live URL:** [valor-tgbot.vercel.app](https://valor-tgbot.vercel.app)  
**Network:** Ethereum Sepolia Testnet  
**Bot:** [@ValorAgentBot](https://t.me/ValorAgentBot)

---

## What You're About to See

Valor is a live, deployed autonomous agent. The pipeline running at this URL is the same one that produced the real on-chain transactions in the README. Nothing is mocked. Nothing is simulated.

When you visit the dashboard, you are looking at a real-time feed of AI evaluations and on-chain USDT transfers happening autonomously — triggered by real Telegram messages, settled on Sepolia.

---

## 2-Minute Quick Demo (Do This First)

### Step 1 — Open the Dashboard
Visit [valor-tgbot.vercel.app](https://valor-tgbot.vercel.app)

You will see:
- The autonomous activity log — every message Valor has evaluated, with score and AI reasoning
- Stats cards showing total USDT distributed, average quality score, and active contributors
- "View on Etherscan" links on confirmed tips — click any of them to verify on-chain

### Step 2 — Send a Message to Valor

Join the live Telegram group: **[t.me/ValorTestGroup](https://t.me/+fxMNQrSKSOBmYjM0)**

Send any message. Try both:

**A message that should NOT tip** (spam/low effort):
```
gm
```
```
LFG 🚀🚀🚀
```

**A message that SHOULD tip** (genuine technical content):
```
Can anyone explain how impermanent loss works on a DEX? 
I've been providing liquidity on Uniswap and I noticed my 
position is worth less than if I'd just held. What's happening?
```

Watch the dashboard. Within 8–12 seconds you will see the evaluation appear in the activity log — with the score Gemini assigned and the one-sentence reasoning. If the score meets the threshold, you will see a tip fire with an Etherscan link.

### Step 3 — Check the Admin Page
Visit [valor-tgbot.vercel.app/admin](https://valor-tgbot.vercel.app/admin)

You will see the master treasury wallet address. Click it to view the funding history on Sepolia Etherscan.

### Step 4 — Check the Withdraw Page
Visit [valor-tgbot.vercel.app/withdraw](https://valor-tgbot.vercel.app/withdraw)

Enter the username `@theweb3wizard00` to see a contributor wallet with an earned balance. This is the wallet that received the tip in transaction `0x70c5e648...`.

---

## Verified On-Chain Transactions

Both of these are real. Open them in a new tab.

| Transaction | Hash | Description |
|---|---|---|
| Autonomous Tip | [0x70c5e648...](https://sepolia.etherscan.io/tx/0x70c5e648d4a52bfeb3ae10111840c99a7c3024cebe426e2584d3ce963df34f6d) | 2 USDt sent autonomously after Gemini scored a message 9/10 |
| Contributor Withdrawal | [0x3b07888d...](https://sepolia.etherscan.io/tx/0x3b07888da4085c50119e0e7dd7f4b55b00389baf32c78df334dd0662493606f7) | Contributor withdrawing earned USDT to external wallet |

**Master Treasury Wallet:** [0x1edD6aD1...4828cA](https://sepolia.etherscan.io/address/0x1edD6aD1a3f4456dF80d6150f93F5d008a4828cA)

---

## What to Look For

**The autonomous decision:** Every evaluation in the activity log includes the AI's reasoning — one sentence explaining exactly why a message scored what it scored. This is Gemini making a judgment call in real time, not a rule-based system.

**The speed:** From message sent to dashboard update is typically 8–12 seconds. The entire pipeline — webhook receipt, two filters, Gemini evaluation, rate limit check, WDK wallet lookup or creation, USDT transfer, Telegram notification, Supabase log — completes in that window.

**The Etherscan links:** Every confirmed tip in the activity log links directly to the on-chain transaction. These are real ERC-20 transfers on Sepolia. Not database entries pretending to be transactions.

**The withdraw flow:** A contributor who earned tips can visit /withdraw, enter their Telegram username, see their real on-chain balance, and withdraw to any external wallet address. The withdrawal is a real WDK transfer.

---

## Frequently Asked Questions

**"Is this mainnet?"**  
No — this is Ethereum Sepolia testnet, which is appropriate for a hackathon demo. All transactions are real on-chain transfers using real ERC-20 mechanics on Sepolia. Mainnet deployment requires switching the RPC endpoint and USDT contract address. No application code changes.

**"How do I set up Valor for my own community?"**  
See the README Setup section. You need a Supabase project, a Telegram bot token, a Google AI API key, and a BIP-39 seed phrase. Fund the master wallet with testnet USDt and add the bot to your group as admin.

**"What stops someone from farming tips?"**  
Three independent rate limiting layers: daily tip maximum per user, 30-minute cooldown between tips to the same user, and a new user penalty requiring a higher score for users with fewer than 5 total evaluations. The two pre-filters also eliminate over 90% of low-effort messages before they reach Gemini.

**"What happens if the WDK transfer fails?"**  
The tip is recorded in the database with `transaction_status: transfer_failed`. The Telegram group receives a "tip queued" notification. A retry queue is on the roadmap. No funds are lost — the master wallet retains the USDT until a successful transfer.

**"Why not use the ERC-4337 WDK module?"**  
The ERC-4337 package requires `sodium-native`, a C++ native binary that cannot run in Vercel's serverless Lambda environment. The standard EVM package deploys cleanly. ERC-4337 gasless mode is the planned mainnet upgrade on a persistent Node.js host. See ARCHITECTURE.md for full technical details.

---

*Valor is a real product. Every number on this page is verifiable. Every link goes somewhere real.*
