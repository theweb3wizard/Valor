import type { InferSelectModel } from 'drizzle-orm';
import { evaluations, tips } from '@/db/schema';
type Evaluation = InferSelectModel<typeof evaluations>;
type Tip = InferSelectModel<typeof tips>;

type FeedItem = { type: 'evaluation' | 'tip'; data: Evaluation | Tip; timestamp: string };

export function TipEvent({ item }: { item: FeedItem }) {
  const isTip = item.type === 'tip';
  const tip = isTip ? (item.data as Tip) : null;
  const ev = item.data as Evaluation;
  const date = new Date(item.timestamp);
  const time = Number.isNaN(date.getTime()) ? item.timestamp : date.toLocaleString();

  const score = ev.score;
  const scoreTone = score >= 9 ? 'bg-primary text-black' : score >= 7 ? 'bg-white text-black' : score >= 5 ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 border border-white/10';

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-zinc-900 p-4 hover:border-white/15 transition-colors overflow-hidden">
      {isTip && tip?.transactionStatus === 'confirmed' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 grid place-items-center text-white text-xs font-bold">{ev.username[0]?.toUpperCase() || '?'}</div>
          <div>
            <p className="text-sm font-medium">@{ev.username} <span className="text-zinc-500 font-normal">• {ev.telegramUserId.slice(0,4)}…</span></p>
            <p className="text-xs text-zinc-500">{time}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone}`}>{score}/10</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-300 line-clamp-3">&ldquo;{ev.messageContent}&rdquo;</p>
      <p className="mt-2 text-xs italic text-zinc-500">{ev.reason}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isTip && tip?.transactionStatus === 'confirmed' && (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-black px-3 py-1 text-xs font-bold">+{tip.amount} USDC</span>
            {tip.txHash && <a href={`https://basescan.org/tx/${tip.txHash}`} target="_blank" className="text-xs font-mono border border-white/10 rounded-full px-3 py-1 hover:bg-white hover:text-black transition-colors">BaseScan ↗</a>}
            <span className="ml-auto text-[11px] font-mono text-emerald-400">confirmed • {tip.walletAddress?.slice(0,6)}…</span>
          </>
        )}
        {isTip && tip?.transactionStatus === 'pending' && tip?.failureReason === 'no_wallet' && <span className="text-xs rounded-full bg-amber-500 text-black px-3 py-1 font-semibold">pending • no wallet</span>}
        {isTip && tip?.transactionStatus === 'pending' && tip?.failureReason === 'processing' && <span className="text-xs rounded-full bg-white/10 border border-white/15 px-3 py-1">processing…</span>}
        {isTip && tip?.transactionStatus === 'failed' && <span className="text-xs rounded-full bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1">failed: {tip.failureReason?.slice(0,30)}</span>}
        {!isTip && <span className="text-xs rounded-full bg-white/5 border border-white/10 px-3 py-1 text-zinc-400">evaluated • not tipped</span>}
      </div>
    </div>
  );
}
