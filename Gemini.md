# Valor — AI Rules for Gemini in Firebase Studio

## Project Identity
This project is called Valor. It is an autonomous AI agent 
that monitors Telegram groups, evaluates message quality 
using Gemini AI via Genkit, and automatically tips USDT 
to valuable contributors. Built for the Tether Hackathon 
Galactica WDK Edition.

## Technology Stack — STRICT RULES
- Frontend: Next.js + TypeScript + Tailwind CSS + ShadCN
- AI Layer: Genkit with googleai/gemini-2.5-flash
- Database: Supabase (PostgreSQL) — NOT Firestore, 
  NOT Firebase database of any kind
- Telegram: node-telegram-bot-api package
- Wallet: WDK (@tetherto/wdk) for USDT transfers

## Database Rules — CRITICAL
- NEVER suggest Firestore or any Firebase database
- ALWAYS use Supabase for all data persistence
- When database setup is needed, provide SQL commands 
  for the user to run in their Supabase dashboard
- Required environment variables for Supabase:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY

## Coding Standards
- Always use TypeScript
- Never use Firebase Admin SDK or Firestore SDK
- Install Supabase client: @supabase/supabase-js
- All database operations go through Supabase client
- Keep code modular — separate files for bot, AI, 
  and database logic

## When Asked About Database
Always respond with Supabase SQL first, then build 
the integration using @supabase/supabase-js client.
Never default to Firestore even if it seems easier.