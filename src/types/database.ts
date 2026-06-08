export interface Database {
  public: {
    Tables: {
      plans: {
        Row: Plan;
        Insert: Omit<Plan, 'id' | 'created_at'>;
        Update: Partial<Omit<Plan, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: User;
        Update: Partial<User>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>;
      };
      communities: {
        Row: Community;
        Insert: Omit<Community, 'id' | 'created_at' | 'usdc_balance'>;
        Update: Partial<Omit<Community, 'id' | 'created_at'>>;
      };
      wallets: {
        Row: Wallet;
        Insert: Omit<Wallet, 'id' | 'created_at'>;
        Update: Partial<Omit<Wallet, 'id' | 'created_at'>>;
      };
      evaluations: {
        Row: Evaluation;
        Insert: Omit<Evaluation, 'id' | 'evaluated_at'>;
        Update: Partial<Omit<Evaluation, 'id' | 'evaluated_at'>>;
      };
      tips: {
        Row: Tip;
        Insert: Omit<Tip, 'id' | 'tipped_at'>;
        Update: Partial<Omit<Tip, 'id' | 'tipped_at'>>;
      };
      rate_limits: {
        Row: RateLimit;
        Insert: Omit<RateLimit, 'id' | 'tips_today' | 'last_tip_at'>;
        Update: Partial<Omit<RateLimit, 'id'>>;
      };
    };
  };
}

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
  owner_user_id: string;
  plan_id: string | null;
  name: string;
  telegram_chat_id: string;
  bot_token: string;
  tip_amount_low: number;
  tip_amount_high: number;
  daily_limit_per_user: number;
  min_score: number;
  treasury_wallet_id: string | null;
  treasury_address: string | null;
  usdc_balance: number;
  eval_context: string;
  is_active: boolean;
  created_at: string;
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
