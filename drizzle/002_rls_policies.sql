-- 002_rls_policies.sql
-- Run this file SECOND in the Supabase SQL Editor (after 001, before 003).
-- Enables Row Level Security on all tables with appropriate policies.

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_own ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- COMMUNITIES
-- ============================================================
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY communities_select_own ON communities
  FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY communities_insert_own ON communities
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY communities_update_own ON communities
  FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY communities_delete_own ON communities
  FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================
-- WALLETS
-- ============================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_select_community ON wallets
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- EVALUATIONS
-- ============================================================
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY evaluations_select_community ON evaluations
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- TIPS
-- ============================================================
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY tips_select_community ON tips
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- RATE_LIMITS
-- ============================================================
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_select_community ON rate_limits
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- PLANS — Public read for pricing, no write from clients
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_all ON plans
  FOR SELECT USING (true);
