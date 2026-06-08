# Manual.md — Manual Setup Requirements for Valor 2.0

> This file tracks all tasks that require external human action (creating accounts, API keys, dashboard configurations, etc.).
> Created during the refactor from Valor v1 (WDK/Genkit/sync) → Valor 2.0 (CDP/Vercel AI SDK/async).

---

## [ ] Manual Requirement for Prompt 2: Run SQL Migrations in Supabase Dashboard
- **Context / Why it is needed:** The database schema, RLS policies, and RPC functions are defined as SQL migration files but must be executed manually in the Supabase SQL Editor. The existing Supabase project (`episwuloprhrgdmvemgr.supabase.co`) already has live data — running these migrations may conflict. Options: (a) create a new Supabase project and run migrations fresh, or (b) drop existing tables and re-run, or (c) manually reconcile.
- **Environment variables or configurations to add:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point to the target project. Set `SUPABASE_SERVICE_ROLE_KEY` to the service role key.

---

## [ ] Manual Requirement for Prompt 5+: Coinbase CDP API Setup
- **Context / Why it is needed:** The CDP SDK requires API credentials from portal.cdp.coinbase.com.
- **Exact steps for the developer to execute:**
  1. Create account at portal.cdp.coinbase.com
  2. Create a new project and generate API keys
  3. Set `CDP_API_KEY_NAME` and `CDP_API_KEY_PRIVATE_KEY` in .env.local
  4. Start with `CDP_NETWORK_ID=base-sepolia` for testing

---

## [ ] Manual Requirement for Prompt 5+: Upstash QStash Setup
- **Context / Why it is needed:** QStash handles async job delivery for the tip pipeline.
- **Exact steps for the developer to execute:**
  1. Create account at upstash.com (free tier)
  2. Go to QStash section
  3. Copy Token, Current Signing Key, and Next Signing Key into .env.local

---

## [ ] Manual Requirement for Prompt 9+: Paddle Billing Setup
- **Context / Why it is needed:** Paddle is the Merchant of Record for subscription billing.
- **Exact steps for the developer to execute:**
  1. Create account at paddle.com (free, no monthly fee)
  2. Start in Sandbox mode
  3. Create three products: Valor Starter ($29/mo), Valor Pro ($79/mo), Valor Business ($179/mo)
  4. Copy each product's Price ID into the `paddle_price_id` column in the `plans` table
  5. Set up webhook endpoint: `https://your-domain.vercel.app/api/billing/webhook`
  6. Copy API key and webhook secret into .env.local

---

## [ ] Manual Requirement for Prompt 7: Gemini API Key
- **Context / Why it is needed:** Gemini 2.5 Flash is used for message quality evaluation.
- **Exact steps for the developer to execute:**
  1. Go to aistudio.google.com
  2. Get an API key
  3. Set `GEMINI_API_KEY` in .env.local
