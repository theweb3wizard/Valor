import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPaddleClient } from '@/lib/paddle/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { planName } = await request.json();

    if (!planName || !['starter', 'pro', 'business'].includes(planName)) {
      return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
    }

    const { data: plan } = await supabase
      .from('plans')
      .select('paddle_price_id, price_monthly')
      .eq('name', planName)
      .single();

    if (!plan || !plan.paddle_price_id) {
      return NextResponse.json({ error: 'plan not available for checkout' }, { status: 400 });
    }

    const paddle = getPaddleClient();
    if (!paddle) {
      return NextResponse.json({ error: 'billing not configured' }, { status: 501 });
    }

    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId: plan.paddle_price_id,
          quantity: 1,
        },
      ],
      checkout: {},
      customData: {
        userId: user.id,
        planName,
      },
    });

    const checkoutUrl = transaction.checkout?.url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'billing_checkout',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'checkout creation failed' }, { status: 500 });
  }
}
