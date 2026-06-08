-- 001_initial_schema.sql
-- Run this file FIRST in the Supabase SQL Editor before 002 and 003.
-- Creates all tables for the Valor 2.0 multi-tenant community rewards platform.

-- ============================================================
-- 1. PLANS — Subscription tiers
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('free', 'starter', 'pro', 'business')),
  price_monthly NUMERIC NOT NULL,
  max_communities INTEGER NOT NULL,       -- -1 = unlimited
  max_evals_monthly INTEGER NOT NULL,     -- -1 = unlimited
  max_tips_monthly INTEGER NOT NULL,      -- -1 = unlimited
  paddle_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USERS — Mirrors Supabase auth.users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SUBSCRIPTIONS — Paddle subscription tracking
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  paddle_subscription_id TEXT UNIQUE,
  paddle_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- ============================================================
-- 4. COMMUNITIES — One per Telegram community
-- ============================================================
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  name TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL UNIQUE,
  bot_token TEXT NOT NULL UNIQUE,
  tip_amount_low NUMERIC NOT NULL DEFAULT 1,    -- USDC for score 7-8
  tip_amount_high NUMERIC NOT NULL DEFAULT 2,   -- USDC for score 9-10
  daily_limit_per_user INTEGER NOT NULL DEFAULT 3,
  min_score INTEGER NOT NULL DEFAULT 7,
  treasury_wallet_id TEXT,                       -- CDP wallet ID
  treasury_address TEXT,
  usdc_balance NUMERIC NOT NULL DEFAULT 0,
  eval_context TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communities_owner_user_id ON communities(owner_user_id);
CREATE INDEX idx_communities_bot_token ON communities(bot_token);

-- ============================================================
-- 5. WALLETS — CDP contributor wallets
-- ============================================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  cdp_wallet_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, telegram_user_id)
);

CREATE INDEX idx_wallets_wallet_address ON wallets(wallet_address);

-- ============================================================
-- 6. EVALUATIONS — AI evaluation results
-- ============================================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  telegram_message_id BIGINT NOT NULL,
  message_content TEXT NOT NULL,
  score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  should_tip BOOLEAN NOT NULL DEFAULT false,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_community_evaluated ON evaluations(community_id, evaluated_at DESC);

-- ============================================================
-- 7. TIPS — Every attempted tip (with idempotency)
-- ============================================================
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES evaluations(id),
  telegram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  wallet_address TEXT,
  cdp_transfer_id TEXT,
  tx_hash TEXT,
  transaction_status TEXT NOT NULL DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'confirmed', 'failed')),
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  tipped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tips_community_tipped ON tips(community_id, tipped_at DESC);

-- ============================================================
-- 8. RATE_LIMITS — Daily tip tracking per user per community
-- ============================================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  tips_today INTEGER NOT NULL DEFAULT 0,
  last_tip_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(community_id, telegram_user_id, date)
);

-- ============================================================
-- Enable Realtime on evaluations and tips
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE tips;

-- ============================================================
-- Seed plan data
-- ============================================================
INSERT INTO plans (name, price_monthly, max_communities, max_evals_monthly, max_tips_monthly)
VALUES
  ('free', 0, 1, 100, 10),
  ('starter', 29, 1, 2000, 200),
  ('pro', 79, 5, 10000, 1000),
  ('business', 179, -1, -1, -1);
