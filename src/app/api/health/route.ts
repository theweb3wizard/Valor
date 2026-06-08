import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';
import { createServiceSupabase } from '@/lib/supabase/server';
import { refreshTreasuryBalance } from '@/lib/cdp/wallets';

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
    const supabase = createServiceSupabase();

    const { error: dbError } = await supabase.from('communities').select('id', { count: 'exact', head: true });

    if (dbError) {
      return NextResponse.json({ status: 'error', error: dbError.message }, { status: 500 });
    }

    const { data: activeCommunities } = await supabase
      .from('communities')
      .select('id')
      .eq('is_active', true);

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
