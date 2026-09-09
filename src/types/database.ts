// Deprecated: Supabase-era types. Use Drizzle InferSelectModel from src/db/schema instead.
// Kept for reference only — will be removed. Do not import in new code.
export type Database_Deprecated = unknown;

export interface Plan {
  id: string;
  name: 'free' | 'starter' | 'pro' | 'business';
  price_monthly: number;
  max_communities: number;
  max_evals_monthly: number;
  max_tips_monthly: number;
  paddle_price_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_end: string | null;
  created_at: string;
}

export interface Community {
  id: string;
  ownerUserId: string;
  planId: string | null;
  name: string;
  telegramChatId: string;
  botToken: string;
  tipAmountLow: string;
  tipAmountHigh: string;
  dailyLimitPerUser: number;
  minScore: number;
  treasuryWalletId: string | null;
  treasuryAddress: string | null;
  usdcBalance: string;
  evalContext: string;
  isActive: boolean;
  createdAt: string;
}

export interface Wallet {
  id: string;
  community_id: string;
  telegram_user_id: string;
  username: string;
  cdp_wallet_id: string;
  wallet_address: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  community_id: string;
  telegram_user_id: string;
  username: string;
  telegram_message_id: number;
  message_content: string;
  score: number;
  reason: string;
  should_tip: boolean;
  evaluated_at: string;
}

export interface Tip {
  id: string;
  community_id: string;
  evaluation_id: string | null;
  telegram_user_id: string;
  username: string;
  amount: number;
  wallet_address: string | null;
  cdp_transfer_id: string | null;
  tx_hash: string | null;
  transaction_status: 'pending' | 'confirmed' | 'failed';
  failure_reason: string | null;
  idempotency_key: string;
  tipped_at: string;
}

export interface RateLimit {
  id: string;
  community_id: string;
  telegram_user_id: string;
  tips_today: number;
  last_tip_at: string | null;
  date: string;
}
