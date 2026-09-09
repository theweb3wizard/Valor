-- 003_rpc_functions.sql
-- Run this file THIRD in the Supabase SQL Editor (after 001 and 002).
-- Creates stored procedures used by the application.

-- ============================================================
-- upsert_rate_limit
-- Atomically increments the tip count for a user in a community on a given date.
-- Prevents race conditions that occur with read-modify-write patterns.
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_rate_limit(
  p_community_id UUID,
  p_telegram_user_id TEXT,
  p_date DATE,
  p_last_tip_at TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (community_id, telegram_user_id, date, tips_today, last_tip_at)
  VALUES (p_community_id, p_telegram_user_id, p_date, 1, p_last_tip_at)
  ON CONFLICT (community_id, telegram_user_id, date)
  DO UPDATE SET
    tips_today = rate_limits.tips_today + 1,
    last_tip_at = p_last_tip_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- get_community_usage
-- Returns evaluation and tip counts for the current month for a given community.
-- Used for plan enforcement checks.
-- ============================================================
CREATE OR REPLACE FUNCTION get_community_usage(p_community_id UUID)
RETURNS TABLE (
  evals_this_month INTEGER,
  tips_this_month INTEGER
) AS $$
DECLARE
  start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM evaluations
      WHERE community_id = p_community_id AND evaluated_at >= start_of_month),
    (SELECT COUNT(*)::INTEGER FROM tips
      WHERE community_id = p_community_id AND tipped_at >= start_of_month
        AND transaction_status = 'confirmed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
