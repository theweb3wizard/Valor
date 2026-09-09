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

export default async function CommunityDashboardPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const db = getDb();
  if (!db) notFound();
  let community: Community | null = null;
  let evaluations: Evaluation[] = [];
  let tips: Tip[] = [];
  try { const [c] = await db.select().from(schema.communities).where(eq(schema.communities.id, communityId)); community = c ?? null; } catch {}
  if (!community) notFound();
  try { evaluations = await db.select().from(schema.evaluations).where(eq(schema.evaluations.communityId, communityId)).orderBy(desc(schema.evaluations.evaluatedAt)).limit(50); } catch {}
  try { tips = await db.select().from(schema.tips).where(eq(schema.tips.communityId, communityId)).orderBy(desc(schema.tips.tippedAt)).limit(50); } catch {}
  const totalTips = tips.reduce((s, t) => s + (t.transactionStatus === 'confirmed' ? Number(t.amount) : 0), 0);
  const totalEvals = evaluations.length;
  const tipsFired = tips.filter((t) => t.transactionStatus === 'confirmed').length;
  const topContributors = tips.filter((t) => t.transactionStatus === 'confirmed').reduce<Record<string, { username: string; total: number }>>((acc, t) => {
    if (!acc[t.telegramUserId]) acc[t.telegramUserId] = { username: t.username, total: 0 };
    acc[t.telegramUserId].total += Number(t.amount);
    return acc;
  }, {});
  const leaderboard = Object.entries(topContributors).map(([telegramUserId, data]) => ({ telegramUserId, ...data })).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-zinc-500">COMMUNITY</p>
          <h1 className="text-3xl font-normal">{community.name}</h1>
          <p className="text-sm text-zinc-400 mt-1 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs border border-white/10 rounded-full px-3 py-1">Treasury {community.treasuryAddress ? `${community.treasuryAddress.slice(0,6)}…${community.treasuryAddress.slice(-4)}` : 'not set'}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3 py-1 text-xs font-semibold">${Number(community.usdcBalance).toFixed(2)} USDC</span>
            <span className={`h-6 inline-flex items-center rounded-full px-3 text-xs font-semibold ${community.isActive ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>{community.isActive ? '● active' : '○ paused'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/${communityId}/settings`} className="h-10 inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur px-5 text-sm font-medium hover:bg-white hover:text-black transition-colors">Settings</Link>
          <a href={`https://basescan.org/address/${community.treasuryAddress}`} target="_blank" className="h-10 inline-flex items-center rounded-full bg-primary text-black px-5 text-sm font-semibold hover:bg-primary/90 transition-colors">BaseScan ↗</a>
        </div>
      </div>

      <StatsRow totalTips={totalTips} totalEvals={totalEvals} tipsFired={tipsFired} topContributor={leaderboard[0]?.username ?? 'N/A'} topContributorAmount={leaderboard[0]?.total ?? 0} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Activity feed <span className="text-zinc-500 font-normal">• live • 15s</span></h2>
            <span className="text-xs font-mono border border-white/10 rounded-full px-2.5 py-1 text-zinc-400">{evaluations.length + tips.length} events</span>
          </div>
          <ActivityFeed communityId={communityId} initialEvaluations={evaluations} initialTips={tips} />
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold">Leaderboard</h2>
          <Leaderboard entries={leaderboard} />
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-400">
            <p className="font-semibold text-white">How scoring works</p>
            <p className="mt-1">Gemini 2.5 Flash scores 0–10 (Zod-forced). ≥ minScore tips. 30-min cooldown + daily limit per user.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
