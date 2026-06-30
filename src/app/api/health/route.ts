import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';
import { refreshTreasuryBalance } from '@/lib/cdp/wallets';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isAuthenticated = serverConfig.hasCronSecret && authHeader === `Bearer ${serverConfig.cronSecret}`;

  if (!isAuthenticated) {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const db = getDb();
    if (!db) return NextResponse.json({ status: 'error', error: 'database not configured' }, { status: 500 });

    try {
      await db.execute(sql`SELECT 1`);
    } catch (dbError) {
      return NextResponse.json({ status: 'error', error: dbError instanceof Error ? dbError.message : 'database error' }, { status: 500 });
    }

    const activeCommunities = await db
      .select({ id: schema.communities.id })
      .from(schema.communities)
      .where(eq(schema.communities.isActive, true));

    let communitiesRefreshed = 0;
    if (activeCommunities) {
      await Promise.allSettled(
        activeCommunities.map(async (c) => {
          await refreshTreasuryBalance(c.id);
          communitiesRefreshed++;
        })
      );
    }

    return NextResponse.json({
      status: 'ok',
      communitiesRefreshed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'health_check',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ status: 'error', error: 'internal error' }, { status: 500 });
  }
}
