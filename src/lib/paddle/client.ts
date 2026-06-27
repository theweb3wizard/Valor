import { Paddle as PaddleSDK, Environment } from '@paddle/paddle-node-sdk';
import { clientConfig } from '@/lib/client-config';
import { serverConfig } from '@/lib/config';
import { createServiceSupabase } from '@/lib/supabase/server';

let _paddle: PaddleSDK | null = null;

export function getPaddleClient(): PaddleSDK | null {
  if (!serverConfig.hasPaddleConfig) return null;

  if (!_paddle) {
    _paddle = new PaddleSDK(serverConfig.paddleApiKey, {
      environment: clientConfig.paddleEnvironment === 'production'
        ? Environment.production
        : Environment.sandbox,
    });
  }
  return _paddle;
}

export async function getPaddlePriceIds(): Promise<Record<string, string | null>> {
  const supabase = createServiceSupabase();
  const { data: plans } = await supabase.from('plans').select('name, paddle_price_id');
  if (!plans) return {};

  const result: Record<string, string | null> = {};
  for (const plan of plans) {
    result[plan.name] = plan.paddle_price_id;
  }
  return result;
}
