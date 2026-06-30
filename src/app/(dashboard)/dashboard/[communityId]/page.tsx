import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import type { InferSelectModel } from 'drizzle-orm';
import { communities as communitiesTable, evaluations as evaluationsTable, tips as tipsTable } from '@/db/schema';

type Community = InferSelectModel<typeof communitiesTable>;
type Evaluation = InferSelectModel<typeof evaluationsTable>;
type Tip = InferSelectModel<typeof tipsTable>;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function CommunityDashboardPage({ params }: Props) {
  const { communityId } = await params;
  const db = getDb();
  if (!db) notFound();

  let community: Community | null = null;
  let evaluations: Evaluation[] = [];
  let tips: Tip[] = [];

  try {
    const [c] = await db.select().from(schema.communities).where(eq(schema.communities.id, communityId));
    community = c ?? null;
  } catch (err) {
    console.error(JSON.stringify({ step: 'fetch_community', communityId, error: err instanceof Error ? err.message : 'Unknown error' }));
  }

  if (!community) {
    notFound();
  }

  try {
    const e = await db.select().from(schema.evaluations)
      .where(eq(schema.evaluations.communityId, communityId))
      .orderBy(desc(schema.evaluations.evaluatedAt))
      .limit(50);
    evaluations = e;
  } catch (err) {
    console.error(JSON.stringify({ step: 'fetch_evaluations', communityId, error: err instanceof Error ? err.message : 'Unknown error' }));
  }

  try {
    const t = await db.select().from(schema.tips)
      .where(eq(schema.tips.communityId, communityId))
      .orderBy(desc(schema.tips.tippedAt))
      .limit(50);
    tips = t;
  } catch (err) {
    console.error(JSON.stringify({ step: 'fetch_tips', communityId, error: err instanceof Error ? err.message : 'Unknown error' }));
  }

  const totalTips = tips?.reduce((s, t) => s + (t.transactionStatus === 'confirmed' ? Number(t.amount) : 0), 0) ?? 0;
  const totalEvals = evaluations?.length ?? 0;
  const tipsFired = tips?.filter((t) => t.transactionStatus === 'confirmed').length ?? 0;

  const topContributors = tips
    ?.filter((t) => t.transactionStatus === 'confirmed')
    .reduce<Record<string, { username: string; total: number }>>((acc, t) => {
      const key = t.telegramUserId;
      if (!acc[key]) acc[key] = { username: t.username, total: 0 };
      acc[key].total += Number(t.amount);
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
            USDC Balance: <strong>{community.usdcBalance}</strong>
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
