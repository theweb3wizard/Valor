interface Props {
  totalTips: number;
  totalEvals: number;
  tipsFired: number;
  topContributor: string;
  topContributorAmount: number;
}

export function StatsRow({ totalTips, totalEvals, tipsFired, topContributor, topContributorAmount }: Props) {
  const stats = [
    { k: 'Distributed', v: `$${totalTips.toFixed(2)}`, sub: 'USDC on Base', accent: 'bg-primary text-black', icon: '$' },
    { k: 'Evaluated', v: totalEvals.toLocaleString(), sub: 'messages', accent: 'bg-white text-black', icon: '◐' },
    { k: 'Tips fired', v: String(tipsFired), sub: 'confirmed', accent: 'bg-emerald-500 text-black', icon: '⬢' },
    { k: 'Top earner', v: topContributor !== 'N/A' ? topContributor : '—', sub: topContributor !== 'N/A' ? `${topContributorAmount.toFixed(2)} USDC` : 'no tips yet', accent: 'bg-zinc-800 text-white border border-white/10', icon: '★' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.k} className="relative overflow-hidden rounded-[20px] border border-white/10 bg-zinc-900 p-4">
          <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-20 ${s.accent.includes('primary') ? 'bg-primary' : s.accent.includes('emerald') ? 'bg-emerald-500' : 'bg-white'}`} />
          <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold ${s.accent}`}>{s.icon}</div>
          <p className="text-[11px] tracking-widest text-zinc-500 mt-3">{s.k.toUpperCase()}</p>
          <p className="text-xl font-semibold truncate">{s.v}</p>
          <p className="text-xs text-zinc-500 truncate">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
