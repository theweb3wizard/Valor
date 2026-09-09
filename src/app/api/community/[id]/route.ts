import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteBotWebhook } from '@/lib/telegram/notify';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

async function getCommunity(id: string) {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user;

  const db = getDb();
  if (!db) return null;

  const [community] = await db.select().from(schema.communities).where(eq(schema.communities.id, id)).limit(1);

  if (!community || community.ownerUserId !== user.id) return null;

  return { user, community, db };
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
    // Zod-like manual validation to avoid extra dep at krit path
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 80) return NextResponse.json({ error: 'invalid name' }, { status: 400 });
      updates.name = body.name.trim();
    }
    if (body.min_score !== undefined) {
      const v = Number(body.min_score);
      if (!Number.isInteger(v) || v < 1 || v > 10) return NextResponse.json({ error: 'invalid min_score' }, { status: 400 });
      updates.minScore = v;
    }
    if (body.tip_amount_low !== undefined) {
      const v = Number(body.tip_amount_low);
      if (!Number.isFinite(v) || v < 0 || v > 100) return NextResponse.json({ error: 'invalid tip_amount_low' }, { status: 400 });
      updates.tipAmountLow = String(v);
    }
    if (body.tip_amount_high !== undefined) {
      const v = Number(body.tip_amount_high);
      if (!Number.isFinite(v) || v < 0 || v > 100) return NextResponse.json({ error: 'invalid tip_amount_high' }, { status: 400 });
      updates.tipAmountHigh = String(v);
    }
    if (body.daily_limit_per_user !== undefined) {
      const v = Number(body.daily_limit_per_user);
      if (!Number.isInteger(v) || v < 1 || v > 100) return NextResponse.json({ error: 'invalid daily_limit_per_user' }, { status: 400 });
      updates.dailyLimitPerUser = v;
    }
    if (body.eval_context !== undefined) {
      if (typeof body.eval_context !== 'string' || body.eval_context.length > 2000) return NextResponse.json({ error: 'invalid eval_context' }, { status: 400 });
      updates.evalContext = body.eval_context;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') return NextResponse.json({ error: 'invalid is_active' }, { status: 400 });
      updates.isActive = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
    }

    const [updated] = await ctx.db.update(schema.communities).set(updates).where(eq(schema.communities.id, ctx.community.id)).returning();

    if (!updated) {
      return NextResponse.json({ error: 'update failed' }, { status: 500 });
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

    const { community, db } = ctx;

    await deleteBotWebhook({ botToken: community.botToken });

    await db.update(schema.communities).set({ isActive: false }).where(eq(schema.communities.id, community.id));

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
