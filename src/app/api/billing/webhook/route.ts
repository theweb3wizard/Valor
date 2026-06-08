import { NextRequest, NextResponse } from 'next/server';
import { WebhooksValidator } from '@paddle/paddle-node-sdk';
import { serverConfig } from '@/lib/config';
import { createServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!serverConfig.hasPaddleConfig) {
    return NextResponse.json({ error: 'billing not configured' }, { status: 501 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature') || '';

    const validator = new WebhooksValidator();
    const isValid = await validator.isValidSignature(
      rawBody,
      serverConfig.paddleWebhookSecret,
      signature
    );

    if (!isValid) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.event_type || '';
    const eventData = payload.data as Record<string, unknown> | undefined;

    if (!eventType || !eventData) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const supabase = createServiceSupabase();

    if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
      const subscriptionId = eventData.id as string;
      const customerId = eventData.customer_id as string;
      const status = eventData.status as string;
      const customData = eventData.custom_data as Record<string, string> | undefined;
      const items = eventData.items as Array<{ price?: { id: string } }> | undefined;
      const billingPeriod = eventData.current_billing_period as
        | { starts_at?: string; ends_at?: string }
        | undefined;

      const currentPeriodEnd = billingPeriod?.ends_at || null;
      const userId = customData?.userId;

      let planId: string | undefined;

      if (customData?.planName) {
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('name', customData.planName)
          .single();
        if (plan) planId = plan.id;
      } else if (items?.[0]?.price?.id) {
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('paddle_price_id', items[0].price.id)
          .single();
        if (plan) planId = plan.id;
      }

      const dbStatus = status === 'active' ? 'active' : 'trialing';

      if (userId) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id, plan_id')
            .eq('paddle_subscription_id', subscriptionId)
            .single();

        if (existingSub) {
          await supabase
            .from('subscriptions')
            .update({
              status: dbStatus,
              current_period_end: currentPeriodEnd,
              plan_id: planId || existingSub.plan_id,
            })
            .eq('id', existingSub.id);
        } else {
          await supabase.from('users').upsert({ id: userId }, { onConflict: 'id' });

          await supabase.from('subscriptions').insert({
            user_id: userId,
            plan_id: planId || null,
            paddle_subscription_id: subscriptionId,
            paddle_customer_id: customerId,
            status: dbStatus,
            current_period_end: currentPeriodEnd,
          });
        }

        if (planId) {
          await supabase
            .from('communities')
            .update({ plan_id: planId })
            .eq('owner_user_id', userId);
        }
      }
    } else if (eventType === 'subscription.updated') {
      const subscriptionId = eventData.id as string;
      const status = eventData.status as string;
      const billingPeriod = eventData.current_billing_period as
        | { starts_at?: string; ends_at?: string }
        | undefined;

      if (subscriptionId) {
        const statusMap: Record<string, string> = {
          active: 'active',
          canceled: 'cancelled',
          past_due: 'past_due',
          paused: 'cancelled',
          trialing: 'trialing',
        };

        await supabase
          .from('subscriptions')
          .update({
            status: statusMap[status] || 'active',
            current_period_end: billingPeriod?.ends_at || null,
          })
          .eq('paddle_subscription_id', subscriptionId);
      }
    } else if (eventType === 'subscription.cancelled') {
      const subscriptionId = eventData.id as string;

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('paddle_subscription_id', subscriptionId);

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('paddle_subscription_id', subscriptionId)
          .single();

        if (sub?.user_id) {
          const { data: freePlan } = await supabase
            .from('plans')
            .select('id')
            .eq('name', 'free')
            .single();

          if (freePlan) {
            await supabase
              .from('communities')
              .update({ plan_id: freePlan.id })
              .eq('owner_user_id', sub.user_id);
          }
        }
      }
    } else if (eventType === 'subscription.past_due') {
      const subscriptionId = eventData.id as string;

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('paddle_subscription_id', subscriptionId);

        console.error(
          JSON.stringify({
            step: 'paddle_webhook',
            eventType,
            subscriptionId,
            message: 'Subscription past due — notification not yet implemented',
          })
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'paddle_webhook',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ ok: true });
  }
}
