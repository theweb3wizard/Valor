import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { evaluations, tips } from '@/db/schema';
import { eq, and, desc, gt, sql } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params;
    const { searchParams } = new URL(_req.url);
    const since = searchParams.get('since') || '';

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'database not configured' }, { status: 500 });
    }

    let evalFilter = eq(evaluations.communityId, communityId);
    let tipFilter = eq(tips.communityId, communityId);

    if (since) {
      evalFilter = and(evalFilter, gt(evaluations.evaluatedAt, new Date(since)))!;
      tipFilter = and(tipFilter, gt(tips.tippedAt, new Date(since)))!;
    }

    const [evaluationsData, tipsData] = await Promise.all([
      db.select().from(evaluations).where(evalFilter).orderBy(desc(evaluations.evaluatedAt)).limit(25),
      db.select().from(tips).where(tipFilter).orderBy(desc(tips.tippedAt)).limit(25),
    ]);

    return NextResponse.json({
      evaluations: evaluationsData,
      tips: tipsData,
    });
  } catch (err) {
    console.error(JSON.stringify({ step: 'feed', error: err instanceof Error ? err.message : 'Unknown error' }));
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
