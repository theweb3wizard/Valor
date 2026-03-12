import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] WARNING: Supabase credentials missing. Data persistence will be unavailable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCommunitySettings(chatId: string) {
  const { data, error } = await supabase
    .from('communities')
    .select('id, tip_amount, daily_limit, min_score')
    .eq('chat_id', chatId)
    .single();

  if (error) {
    console.error(`[Supabase] getCommunitySettings failed for chat_id "${chatId}":`, error.message, '| code:', error.code);
    return null;
  }
  if (!data) {
    console.error(`[Supabase] getCommunitySettings: no row found for chat_id "${chatId}"`);
    return null;
  }
  return data;
}

export async function getWalletByUsername(username: string, communityId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`[Supabase] getWalletByUsername failed for ${username}:`, error.message, '| code:', error.code);
  }
  if (!data) return null;
  return data.wallet_address;
}

export async function getRateLimit(communityId: string, username: string, date: string) {
  // username already contains @ prefix — do not add another one in logs
  console.log(`[RateLimit] Reading rate limit — community: ${communityId} | user: ${username} | date: ${date}`);

  const { data, error } = await supabase
    .from('rate_limits')
    .select('tips_today, last_tip_at')
    .eq('community_id', communityId)
    .eq('username', username)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`[Supabase] getRateLimit failed for ${username}:`, error.message, '| code:', error.code);
    return null;
  }

  if (!data) {
    console.log(`[RateLimit] No existing rate limit row for ${username} on ${date} — first tip today`);
    return null;
  }

  console.log(`[RateLimit] Found — ${username}: tips_today=${data.tips_today}, last_tip_at=${data.last_tip_at}`);
  return data;
}

export async function updateRateLimit(communityId: string, username: string, date: string) {
  const now = new Date().toISOString();
  // username already contains @ prefix — do not add another one in logs
  console.log(`[RateLimit] Calling upsert_rate_limit RPC — community: ${communityId} | user: ${username} | date: ${date} | now: ${now}`);

  const { data, error } = await supabase.rpc('upsert_rate_limit', {
    p_community_id: communityId,
    p_username: username,
    p_date: date,
    p_last_tip_at: now
  });

  if (error) {
    console.error('[Supabase] updateRateLimit RPC FAILED:', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint);
    return false;
  }

  console.log(`[RateLimit] upsert_rate_limit RPC succeeded for ${username} — response:`, data);
  return true;
}

export async function getUserEvaluationCount(username: string, communityId: string) {
  const { count, error } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('username', username)
    .eq('community_id', communityId);

  if (error) {
    console.error(`[Supabase] getUserEvaluationCount failed for ${username}:`, error.message, '| code:', error.code);
    return 0;
  }

  const result = count || 0;
  console.log(`[Supabase] getUserEvaluationCount — ${username}: ${result} evaluations`);
  return result;
}