'use client';

import { useState } from 'react';
import { ActivityLog, type EvaluationLog } from '@/components/dashboard/activity-log';
import { MessageSimulator } from '@/components/dashboard/message-simulator';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { BrainCircuit, ShieldCheck, Github } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [logs, setLogs] = useState<EvaluationLog[]>([]);

  const handleNewEvaluation = (log: EvaluationLog) => {
    setLogs(prev => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation / Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <BrainCircuit className="h-6 w-6 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                VALOR
              </h1>
              <p className="text-[10px] font-bold text-primary/80 -mt-1 tracking-[0.2em]">
                AUTONOMOUS AGENT
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex border-green-500/30 text-green-500 gap-1.5 px-3 py-1 bg-green-500/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              NODE ACTIVE
            </Badge>
            <a href="#" className="text-muted-foreground hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              The AI Guardian of Group Quality.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Valor autonomously monitors Telegram conversations, rewarding deep insights and helpful answers with instant USDT tips. No human intervention, just pure meritocracy powered by Gemini.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <StatsCards logs={logs} />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <ActivityLog logs={logs} />
          </div>
          <div className="order-1 lg:order-2">
            <MessageSimulator onNewEvaluation={handleNewEvaluation} />
            
            {/* Agent Criteria Box */}
            <div className="mt-6 p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Evaluation Protocol</h3>
              </div>
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <span>Reward: Clear answers to community questions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <span>Reward: Genuine, specific technical information.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <span>Reward: Problem-solving for other members.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1 shrink-0" />
                  <span>Penalize: One-word replies and "Gm" spam.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1 shrink-0" />
                  <span>Penalize: Self-promotion and empty marketing.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 bg-card/20 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 Valor Autonomous Agent System. Built with Genkit & Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}