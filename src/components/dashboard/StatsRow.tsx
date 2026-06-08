interface StatsRowProps {
  totalTips: number;
  totalEvals: number;
  tipsFired: number;
  topContributor: string;
  topContributorAmount: number;
}

export function StatsRow({
  totalTips,
  totalEvals,
  tipsFired,
  topContributor,
  topContributorAmount,
}: StatsRowProps) {
  const stats = [
    { label: 'Total USDC Distributed', value: `${totalTips.toFixed(1)}` },
    { label: 'Messages Evaluated', value: totalEvals.toLocaleString() },
    { label: 'Tips Fired', value: tipsFired.toLocaleString() },
    {
      label: 'Top Contributor',
      value: topContributor !== 'N/A' ? `${topContributor} (${topContributorAmount.toFixed(1)} USDC)` : topContributor,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="text-lg font-semibold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
