import type { Evaluation, Tip } from '@/types/database';

type FeedItem = {
  type: 'evaluation' | 'tip';
  data: Evaluation | Tip;
  timestamp: string;
};

interface Props {
  item: FeedItem;
}

export function TipEvent({ item }: Props) {
  const isTip = item.type === 'tip';
  const tip = isTip ? (item.data as Tip) : null;
  const evaluation = item.data as Evaluation;

  const borderClass = isTip && tip?.transaction_status === 'confirmed'
    ? 'border-l-2 border-primary'
    : 'border-l-2 border-muted';

  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${borderClass} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{evaluation.username}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(item.timestamp).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{evaluation.message_content}</p>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            evaluation.score >= 8
              ? 'bg-primary/10 text-primary'
              : evaluation.score >= 5
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {evaluation.score}/10
        </span>
        {isTip && tip?.transaction_status === 'confirmed' && (
          <>
            <span className="text-sm font-semibold text-success">+{tip.amount} USDC</span>
            {tip.tx_hash && (
              <a
                href={`https://basescan.org/tx/${tip.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline ml-auto"
              >
                BaseScan
              </a>
            )}
          </>
        )}
        {isTip && tip?.transaction_status === 'failed' && (
          <span className="text-xs text-destructive">Failed</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground italic">{evaluation.reason}</p>
    </div>
  );
}
