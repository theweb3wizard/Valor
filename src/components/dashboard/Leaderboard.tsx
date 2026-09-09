interface Entry { telegramUserId: string; username: string; total: number }

export function Leaderboard({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <div className="rounded-[20px] border border-dashed border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">No tips yet — your community\'s first earner will appear here.</div>;
  }
  return (
    <div className="rounded-[20px] border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-xs tracking-widest text-zinc-500">TOP EARNERS</p>
        <span className="text-[11px] font-mono bg-white text-black rounded-full px-2 py-1">{entries.length} • ranked</span>
      </div>
      <div className="divide-y divide-white/5">
        {entries.map((e, i) => (
          <div key={e.telegramUserId} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors">
            <span className={`h-7 w-7 grid place-items-center rounded-full text-xs font-bold ${i===0?'bg-primary text-black':i===1?'bg-zinc-200 text-black':i===2?'bg-amber-700 text-white':'bg-white/10 text-zinc-400'}`}>{i+1}</span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 grid place-items-center text-xs">{e.username[0]?.toUpperCase()}</div>
            <span className="text-sm font-medium truncate">@{e.username}</span>
            <span className="ml-auto text-sm font-mono font-semibold">{e.total.toFixed(2)} <span className="text-zinc-500 font-normal">USDC</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
