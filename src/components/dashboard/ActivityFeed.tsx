'use client';

import { useEffect, useState, useRef } from 'react';
import { TipEvent } from '@/components/dashboard/TipEvent';
import type { InferSelectModel } from 'drizzle-orm';
import { evaluations, tips } from '@/db/schema';
type Evaluation = InferSelectModel<typeof evaluations>;
type Tip = InferSelectModel<typeof tips>;

interface Props {
  communityId: string;
  initialEvaluations: Evaluation[];
  initialTips: Tip[];
}

type FeedItem = {
  type: 'evaluation' | 'tip';
  data: Evaluation | Tip;
  timestamp: string;
};

export function ActivityFeed({ communityId, initialEvaluations, initialTips }: Props) {
  const [items, setItems] = useState<FeedItem[]>(() => {
    const evals: FeedItem[] = (initialEvaluations ?? []).map((e) => ({
      type: 'evaluation' as const,
      data: e,
      timestamp: e.evaluatedAt?.toISOString() ?? '',
    }));
    const tips: FeedItem[] = (initialTips ?? []).map((t) => ({
      type: 'tip' as const,
      data: t,
      timestamp: t.tippedAt?.toISOString() ?? '',
    }));
    return [...evals, ...tips].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  const latestTimestampRef = useRef<string>((() => {
    const all = [...(initialEvaluations ?? []), ...(initialTips ?? [])] as (Evaluation | Tip)[];
    const dates = all.map((item) => {
      if ('evaluatedAt' in item && item.evaluatedAt) return item.evaluatedAt.getTime();
      if ('tippedAt' in item && item.tippedAt) return item.tippedAt.getTime();
      return 0;
    });
    const max = Math.max(...dates, 0);
    return max ? new Date(max).toISOString() : '';
  })());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/community/${communityId}/feed?since=${encodeURIComponent(latestTimestampRef.current)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        const newItems: FeedItem[] = [];
        for (const e of data.evaluations ?? []) {
          const ts = e.evaluatedAt?.toISOString() ?? '';
          if (ts > latestTimestampRef.current) {
            newItems.push({ type: 'evaluation', data: e, timestamp: ts });
          }
        }
        for (const t of data.tips ?? []) {
          const ts = t.tippedAt?.toISOString() ?? '';
          if (ts > latestTimestampRef.current) {
            newItems.push({ type: 'tip', data: t, timestamp: ts });
          }
        }
        if (newItems.length > 0) {
          latestTimestampRef.current = newItems.reduce((l, i) => i.timestamp > l ? i.timestamp : l, latestTimestampRef.current);
          setItems((prev) => [...newItems, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      } catch {
        // silently retry on next poll
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [communityId]);

  return (
    <div className="space-y-2">

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No activity yet. Messages will appear here once the community starts receiving tips.
        </p>
      )}
      {items.map((item, i) => (
        <TipEvent
          key={`${item.type}-${(item.data as Evaluation).id || (item.data as Tip).id}-${i}`}
          item={item}
        />
      ))}
    </div>
  );
}
