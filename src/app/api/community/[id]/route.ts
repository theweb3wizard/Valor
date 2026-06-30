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
    const allowedFields = [
      'name', 'min_score', 'tip_amount_low', 'tip_amount_high',
      'daily_limit_per_user', 'eval_context', 'is_active',
    ];

    const columnMap: Record<string, string> = {
      name: 'name',
      min_score: 'minScore',
      tip_amount_low: 'tipAmountLow',
      tip_amount_high: 'tipAmountHigh',
      daily_limit_per_user: 'dailyLimitPerUser',
      eval_context: 'evalContext',
      is_active: 'isActive',
    };

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[columnMap[key]] = body[key];
      }
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
