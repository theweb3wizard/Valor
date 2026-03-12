'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, BrainCircuit, MessageSquare, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';

export type EvaluationLog = {
  id: string;
  username: string;
  message_content: string;
  score: number;
  reason: string;
  should_tip: boolean;
  timestamp: string;
  tip?: {
    transaction_status: string;
    tx_hash: string | null;
  } | null;
};

type RawEval = {
  id: string;
  username: string;
  message_content: string;
  score: number;
  reason: string;
  should_tip: boolean;
  timestamp: string;
};

type RawTip = {
  username: string;
  transaction_status: string;
  tx_hash: string | null;
  timestamp: string;
};

// Fetch evaluations + merge with tips in a single function
async function fetchLogs(): Promise<EvaluationLog[]> {
  const { data: evals, error: evalError } = await supabase
    .from('evaluations')
    .select('id, username, message_content, score, reason, should_tip, timestamp')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (evalError || !evals || evals.length === 0) {
    if (evalError) console.error('[ActivityLog] Error fetching evaluations:', evalError.message);
    return [];
  }

  // Fetch tips for any eval that warranted a tip
  const tippedUsernames = (evals as RawEval[])
    .filter(e => e.should_tip)
    .map(e => e.username);

  let tips: RawTip[] = [];
  if (tippedUsernames.length > 0) {
    const { data: tipsData } = await supabase
      .from('tips')
      .select('username, transaction_status, tx_hash, timestamp')
      .in('username', tippedUsernames)
      .order('timestamp', { ascending: false });

    tips = (tipsData as RawTip[]) || [];
  }

  // Merge: for each eval, find the closest tip within a 60-second window
  return (evals as RawEval[]).map(evaluation => {
    if (!evaluation.should_tip) return { ...evaluation, tip: null };

    const evalTime = new Date(evaluation.timestamp).getTime();
    const matchingTip = tips.find(tip =>
      tip.username === evaluation.username &&
      Math.abs(new Date(tip.timestamp).getTime() - evalTime) < 60000
    );

    return {
      ...evaluation,
      tip: matchingTip
        ? { transaction_status: matchingTip.transaction_status, tx_hash: matchingTip.tx_hash }
        : null,
    };
  });
}

export function ActivityLog() {
  const [logs, setLogs] = useState<EvaluationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const data = await fetchLogs();
    setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();

    // Subscribe to new evaluations — reload full list on any insert
    // This ensures tip data is always fresh alongside the evaluation
    const channel = supabase
      .channel('activity_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evaluations' },
        () => {
          // Small delay to allow the tip insert to complete first
          setTimeout(() => loadLogs(), 1500);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tips' },
        () => {
          // Refresh when a tip lands so Etherscan link appears immediately
          setTimeout(() => loadLogs(), 500);
        }
      )
      .subscribe((status) => {
        console.log('[ActivityLog] Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  return (
    <Card className="bg-card border-border shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-semibold">Autonomous Activity Log</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-primary/20 text-primary/80">
          LIVE FEED
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10 opacity-20 animate-pulse" />
              <p>Loading activity...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p>No activity recorded yet. Valor is monitoring the group...</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{log.username}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 italic line-clamp-2">
                      &ldquo;{log.message_content.length > 80
                        ? log.message_content.substring(0, 80) + '...'
                        : log.message_content}&rdquo;
                    </p>
                    <p className="text-sm text-muted-foreground bg-secondary/30 p-2 rounded-md border border-border/30 mt-2">
                      <span className="font-semibold text-foreground/80">Agent Reasoning:</span> {log.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quality Score</span>
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border",
                        log.score >= 7
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-muted border-border text-muted-foreground"
                      )}>
                        {log.score}
                      </div>
                    </div>

                    {log.should_tip ? (
                      <div className="flex flex-col items-end animate-in fade-in slide-in-from-right-2 duration-500">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/50 hover:bg-green-500/20 gap-1.5 px-3 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          TIP WARRANTED
                        </Badge>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-green-500/70 uppercase tracking-tighter">
                            TIP SENT: 2 USDT to {log.username}
                          </span>
                          {log.tip?.transaction_status === 'confirmed' && log.tip?.tx_hash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${log.tip.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted-foreground hover:text-white transition-colors flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              View on Etherscan
                            </a>
                          )}
                          {log.tip?.transaction_status === 'transfer_failed' && (
                            <span className="text-[10px] text-yellow-500/70 uppercase tracking-tighter">
                              queued
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border gap-1.5 px-3 py-1">
                        <XCircle className="h-3.5 w-3.5" />
                        NO TIP
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}