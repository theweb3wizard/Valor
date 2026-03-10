# Valor — AI Rules & Architecture Reference

## What Valor Is
Valor is an autonomous AI agent that monitors Telegram 
group conversations, evaluates message quality using 
Gemini AI via Genkit, and automatically distributes 
USDT tips to genuine contributors. No human commands 
required. Built for the Tether Hackathon Galactica 
WDK Edition.

## Golden Rule
Never over-build. Never add features not explicitly 
requested. Never over-polish. Build exactly what is 
asked, nothing more. When in doubt, ask.

## Technology Stack — STRICT
- Frontend: Next.js + TypeScript + Tailwind + ShadCN
- AI: Genkit with googleai/gemini-2.5-flash
- Database: Supabase (PostgreSQL) — NEVER Firestore
- Telegram: node-telegram-bot-api (polling mode)
- Wallet: WDK (@tetherto/wdk) for USDT transfers
- Auth: Supabase Auth

## Database Schema — SOURCE OF TRUTH
communities: id, name, chat_id, tip_amount(default 2),
  daily_limit(default 3), min_score(default 7),
  usdt_balance(default 0), created_at

evaluations: id, community_id, username, 
  message_content, score, reason, should_tip, timestamp

tips: id, community_id, username, amount, 
  wallet_address, tx_status, timestamp

wallets: id, community_id, username, 
  wallet_address, balance, registered_at

rate_limits: id, community_id, username, 
  tips_today, last_tip_at, date
  UNIQUE(community_id, username, date)

## Bot Architecture — STRICT
Messages must pass TWO filters before reaching Gemini:

FILTER 1 - Hard Rules (skip if any are true):
- Message under 20 characters
- Only emoji, sticker, or media with no text
- Starts with /
- Sender is a bot
- Is a poll or system message

FILTER 2 - Substance Signal (skip if none present):
- Contains a question mark, OR
- Message is over 8 words, OR
- Contains technical/substantive keywords

Only ~20% of messages should reach Gemini evaluation.

## Tip Eligibility — STRICT
Before firing any tip, check ALL of these:
1. should_tip is true (score >= min_score)
2. User has not exceeded daily_limit tips today
   (check rate_limits table for today's date)
3. Last tip to this user was over 30 minutes ago
If any check fails, no tip fires. Log evaluation only.

## Anti-Abuse Rules
- Max tips per user per day: daily_limit (default 3)
- Cooldown between tips per user: 30 minutes
- New users (fewer than 5 evaluated messages): 
  threshold is min_score + 1
- Commands and bot messages never evaluated

## Wallet Architecture
- One master WDK wallet per community
- Tips accumulate as balance in wallets table
- Contributors withdraw via dashboard withdrawal page
- No private message registration needed
- Withdrawal requires: username + external wallet address

## Dashboard Pages
- / : Main activity log + stats (already built)
- /admin : Community setup + USDT pool deposit
- /withdraw : Contributor withdrawal page
- All pages use dark theme + amber (#F5A623) accents

## What NOT To Do
- Never use Firestore or any Firebase database
- Never add unrequested features or pages
- Never handle /register via private Telegram messages
- Never evaluate bot messages or commands
- Never send duplicate tip notifications
- Never break the existing working bot and dashboard

## Current Build Status
DONE:
- Genkit AI evaluation flow
- Telegram bot (polling, group monitoring)
- Supabase persistence (evaluations + tips + wallets)
- Real-time activity log dashboard
- Stats cards
- Telegram group tip notifications

TO BUILD NEXT (in order):
1. Smart message filtering (Filter 1 + Filter 2)
2. Rate limiting + cooldown logic
3. WDK master wallet integration
4. /admin page
5. /withdraw page