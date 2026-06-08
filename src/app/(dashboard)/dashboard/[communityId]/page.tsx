import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Leaderboard } from '@/components/dashboard/Leaderboard';

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function CommunityDashboardPage({ params }: Props) {
  const { communityId } = await params;
  const supabase = await createServerSupabase();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single();

  if (!community) {
    notFound();
  }

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*')
    .eq('community_id', communityId)
    .order('evaluated_at', { ascending: false })
    .limit(50);

  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .eq('community_id', communityId)
    .order('tipped_at', { ascending: false })
    .limit(50);

  const totalTips = tips?.reduce((s, t) => s + (t.transaction_status === 'confirmed' ? t.amount : 0), 0) ?? 0;
  const totalEvals = evaluations?.length ?? 0;
  const tipsFired = tips?.filter((t) => t.transaction_status === 'confirmed').length ?? 0;

  const topContributors = tips
    ?.filter((t) => t.transaction_status === 'confirmed')
    .reduce<Record<string, { username: string; total: number }>>((acc, t) => {
      const key = t.telegram_user_id;
      if (!acc[key]) acc[key] = { username: t.username, total: 0 };
      acc[key].total += t.amount;
      return acc;
    }, {});

  const leaderboard = Object.entries(topContributors ?? {})
    .map(([telegramUserId, data]) => ({ telegramUserId, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{community.name}</h1>
          <p className="text-sm text-muted-foreground">
            USDC Balance: <strong>{community.usdc_balance}</strong>
          </p>
        </div>
        <Link
          href={`/dashboard/${communityId}/settings`}
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
        >
          Settings
        </Link>
      </div>

      <StatsRow
        totalTips={totalTips}
        totalEvals={totalEvals}
        tipsFired={tipsFired}
        topContributor={leaderboard[0]?.username ?? 'N/A'}
        topContributorAmount={leaderboard[0]?.total ?? 0}
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Activity Feed</h2>
          <ActivityFeed
            communityId={communityId}
            initialEvaluations={evaluations ?? []}
            initialTips={tips ?? []}
          />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <Leaderboard entries={leaderboard} />
        </div>
      </div>
    </div>
  );
}
