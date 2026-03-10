import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Data persistence will be unavailable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Queries the wallets table for a registered wallet address.
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

/**
 * Registers or updates a wallet address for a user.
 */
export async function registerWallet(username: string, address: string) {
  const { data, error } = await supabase
    .from('wallets')
    .upsert({ username, wallet_address: address }, { onConflict: 'username' })
    .select();
  
  if (error) throw error;
  return data;
}
