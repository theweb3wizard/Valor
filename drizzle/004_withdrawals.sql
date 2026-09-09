-- 004_withdrawals: add withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_community_user ON withdrawals(community_id, telegram_user_id);
-- Help pending lookup for retryPendingTips
CREATE INDEX IF NOT EXISTS idx_tips_pending_lookup ON tips(community_id, telegram_user_id, transaction_status, failure_reason);
-- Expand legacy CHECK to allow processing if present (ignore error if no CHECK)
DO $$ BEGIN
  ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_transaction_status_check;
  ALTER TABLE tips ADD CONSTRAINT tips_transaction_status_check CHECK (transaction_status IN ('pending','confirmed','failed','processing'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
