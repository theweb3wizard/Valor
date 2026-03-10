import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Data persistence will be unavailable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Queries the wallets table for a registered wallet address.
 * Wallet registration is handled exclusively via the dashboard.
 */
export async function getWalletByUsername(username: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('username', username)
    .single();
  
  if (error || !data) return null;
  return data.wallet_address;
}
