import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { serverConfig } from '@/lib/config';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createCommunityTreasury } from '@/lib/cdp/wallets';
import { setBotWebhook } from '@/lib/telegram/notify';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabase();
    const { data: communities } = await serviceSupabase
      .from('communities')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json(communities ?? []);
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'list_communities',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, botToken, telegramChatId } = body as {
      name: string;
      botToken: string;
      telegramChatId: string;
    };

    if (!name || !botToken) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabase();

    const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botData = await botRes.json();
    if (!botData.ok || !botData.result?.username) {
      return NextResponse.json({ error: 'invalid bot token' }, { status: 400 });
    }

    const { data: existingBot } = await serviceSupabase
      .from('communities')
      .select('id')
      .eq('bot_token', botToken)
      .single();

    if (existingBot) {
      return NextResponse.json({ error: 'bot token already registered' }, { status: 409 });
    }

    const { count: communityCount } = await serviceSupabase
      .from('communities')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', user.id)
      .eq('is_active', true);

    const { data: subscription } = await serviceSupabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .single();

    let maxCommunities = 1;
    if (subscription?.plan_id) {
      const { data: plan } = await serviceSupabase
        .from('plans')
        .select('max_communities')
        .eq('id', subscription.plan_id)
        .single();
      if (plan && plan.max_communities !== -1) {
        maxCommunities = plan.max_communities;
      } else if (plan) {
        maxCommunities = Infinity;
      }
    }

    if ((communityCount ?? 0) >= maxCommunities) {
      return NextResponse.json({ error: 'community limit reached' }, { status: 403 });
    }

    const { data: userRow } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userRow) {
      await serviceSupabase.from('users').insert({ id: user.id, email: user.email });
    }

    const { data: freePlan } = await serviceSupabase
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .single();

    const chatId = telegramChatId || `pending-${botToken.slice(0, 8)}`;

    const { data: community, error: communityError } = await serviceSupabase
      .from('communities')
      .insert({
        owner_user_id: user.id,
        name,
        telegram_chat_id: chatId,
        bot_token: botToken,
        plan_id: freePlan?.id || null,
      })
      .select()
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'failed to create community' }, { status: 500 });
    }

    const webhookSecret = createHash('sha256')
      .update(botToken + (serverConfig.hasCronSecret ? serverConfig.cronSecret : 'dev-fallback-secret'))
      .digest('hex');

    const webhookUrl = `${serverConfig.appUrl}/api/webhook/${botToken}`;

    await setBotWebhook({ botToken, webhookUrl, secretToken: webhookSecret });

    let treasury: { walletId: string; address: string } | null = null;
    try {
      treasury = await createCommunityTreasury(community.id);
    } catch (err) {
      console.error(
        JSON.stringify({
          step: 'onboarding_treasury',
          communityId: community.id,
          error: err instanceof Error ? err.message : 'unknown',
        })
      );
    }

    return NextResponse.json({
      community: {
        ...community,
        treasury_wallet_id: treasury?.walletId || null,
        treasury_address: treasury?.address || null,
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'create_community',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
