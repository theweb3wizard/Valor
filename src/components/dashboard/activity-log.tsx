
'use client';

import { useEffect, useState } from 'react';
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
  tips?: Array<{
    transaction_status: string;
    tx_hash: string;
  }>;
};

export function ActivityLog() {
  const [logs, setLogs] = useState<EvaluationLog[]>([]);

  useEffect(() => {
    // 1. Initial fetch from Supabase
    const fetchInitialLogs = async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*, tips(transaction_status, tx_hash)')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (data && !error) {
        setLogs(data as EvaluationLog[]);
      } else if (error) {
        console.error('Error fetching logs:', error);
      }
    };

    fetchInitialLogs();

    // 2. Subscribe to real-time updates
    const channel = supabase
      .channel('evaluations_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evaluations' },
        (payload) => {
          const newEval = payload.new as EvaluationLog;
          setLogs((current) => [newEval, ...current].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          {logs.length === 0 ? (
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
                      <span className="font-bold text-primary">@{log.username}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 italic line-clamp-2">
                      "{log.message_content.length > 80 ? log.message_content.substring(0, 80) + '...' : log.message_content}"
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
                        log.score >= 7 ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
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
                            TIP SENT: 2 USDT to @{log.username}
                          </span>
                          {log.tips && log.tips[0] && log.tips[0].transaction_status === 'confirmed' && log.tips[0].tx_hash && (
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${log.tips[0].tx_hash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted-foreground hover:text-white transition-colors flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              View on Etherscan
                            </a>
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
