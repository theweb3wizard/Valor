'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { TipEvent } from '@/components/dashboard/TipEvent';
import type { Evaluation, Tip } from '@/types/database';

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
      timestamp: e.evaluated_at,
    }));
    const tips: FeedItem[] = (initialTips ?? []).map((t) => ({
      type: 'tip' as const,
      data: t,
      timestamp: t.tipped_at,
    }));
    return [...evals, ...tips].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  useEffect(() => {
    const evalChannel = supabaseBrowser
      .channel(`evaluations:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'evaluations',
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          const newEval = payload.new as Evaluation;
          setItems((prev) => [
            { type: 'evaluation', data: newEval, timestamp: newEval.evaluated_at },
            ...prev,
          ]);
        }
      )
      .subscribe();

    const tipChannel = supabaseBrowser
      .channel(`tips:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tips',
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          const newTip = payload.new as Tip;
          setItems((prev) => [
            { type: 'tip', data: newTip, timestamp: newTip.tipped_at },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(evalChannel);
      supabaseBrowser.removeChannel(tipChannel);
    };
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
