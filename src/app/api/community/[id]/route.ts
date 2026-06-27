import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { deleteBotWebhook } from '@/lib/telegram/notify';

async function getCommunity(id: string) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const serviceSupabase = createServiceSupabase();
  const { data: community } = await serviceSupabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single();

  if (!community || community.owner_user_id !== user.id) return null;

  return { user, community, serviceSupabase };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCommunity(id);
    if (!ctx) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(ctx.community);
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'get_community',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patchId } = await params;
    const ctx = await getCommunity(patchId);
    if (!ctx) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = [
      'name', 'min_score', 'tip_amount_low', 'tip_amount_high',
      'daily_limit_per_user', 'eval_context', 'is_active',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
    }

    const { data: updated, error } = await ctx.serviceSupabase
      .from('communities')
      .update(updates)
      .eq('id', ctx.community.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'update_community',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deleteId } = await params;
    const ctx = await getCommunity(deleteId);
    if (!ctx) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const { community, serviceSupabase } = ctx;

    await deleteBotWebhook({ botToken: community.bot_token });

    await serviceSupabase
      .from('communities')
      .update({ is_active: false })
      .eq('id', community.id);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'delete_community',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
