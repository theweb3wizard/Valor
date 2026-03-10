import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Data persistence will be unavailable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCommunitySettings(chatId: string) {
  const { data, error } = await supabase
    .from('communities')
    .select('id, tip_amount, daily_limit, min_score')
    .eq('chat_id', chatId)
    .single();
  
  if (error || !data) {
    console.warn(`No community settings found for chat_id: ${chatId}. Using defaults.`);
    return null;
  }
  return data;
}

export async function getWalletByUsername(username: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('username', username)
    .single();
  
  if (error || !data) return null;
  return data.wallet_address;
}

export async function getRateLimit(communityId: string, username: string, date: string) {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('tips_today, last_tip_at')
    .eq('community_id', communityId)
    .eq('username', username)
    .eq('date', date)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function updateRateLimit(communityId: string, username: string, date: string) {
  // Use upsert to handle first tip of the day
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('tips_today')
    .eq('community_id', communityId)
    .eq('username', username)
    .eq('date', date)
    .single();

  const tips_today = (existing?.tips_today || 0) + 1;

  await supabase.from('rate_limits').upsert({
    community_id: communityId,
    username,
    date,
    tips_today,
    last_tip_at: new Date().toISOString()
  }, {
    onConflict: 'community_id,username,date'
  });
}

export async function getUserEvaluationCount(username: string) {
  const { count, error } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('username', username);
  
  if (error) return 0;
  return count || 0;
}
