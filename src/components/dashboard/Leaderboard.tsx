interface LeaderboardEntry {
  telegramUserId: string;
  username: string;
  total: number;
}

interface Props {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No tips yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {entries.map((entry, i) => (
        <div
          key={entry.telegramUserId}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-6 text-sm font-bold ${
                i === 0 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className="text-sm">{entry.username}</span>
          </div>
          <span className="text-sm font-medium">{entry.total.toFixed(1)} USDC</span>
        </div>
      ))}
    </div>
  );
}
