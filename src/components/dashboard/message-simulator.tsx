'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Zap, Loader2 } from "lucide-react";
import { processMessage } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { EvaluationLog } from './activity-log';

interface MessageSimulatorProps {
  onNewEvaluation: (log: EvaluationLog) => void;
}

export function MessageSimulator({ onNewEvaluation }: MessageSimulatorProps) {
  const [username, setUsername] = useState('crypto_enthusiast');
  const [content, setContent] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const handleSimulate = async () => {
    if (!content.trim()) return;
    
    setIsPending(true);
    const result = await processMessage(content);
    setIsPending(false);

    if (result.success && result.data) {
      onNewEvaluation({
        id: Math.random().toString(36).substr(2, 9),
        username,
        message: content,
        score: result.data.score,
        reason: result.data.reason,
        shouldTip: result.data.should_tip,
        timestamp: new Date(),
      });
      setContent('');
      
      if (result.data.should_tip) {
        toast({
          title: "Valuable Contribution Detected",
          description: `Score: ${result.data.score}/10. Simulating 2 USDT tip to @${username}.`,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Evaluation Failed",
        description: "The AI agent encountered an error during message analysis.",
      });
    }
  };

  return (
    <Card className="bg-card border-border shadow-xl h-fit sticky top-6">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-primary fill-primary" />
          <CardTitle className="text-xl">Telegram Simulator</CardTitle>
        </div>
        <CardDescription>
          Manually test how Valor evaluates messages in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground">@</span>
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="pl-7 bg-secondary/50 border-border/50 focus:ring-primary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Message Content</label>
          <Textarea 
            placeholder="Type a helpful answer or a spam message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] bg-secondary/50 border-border/50 focus:ring-primary resize-none"
          />
        </div>
        <Button 
          onClick={handleSimulate} 
          disabled={isPending || !content.trim()}
          className="w-full amber-gradient hover:opacity-90 transition-opacity glow-primary font-bold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AGENT EVALUATING...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              SEND TO VALOR
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}