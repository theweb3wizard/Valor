'use client';

import { ActivityLog } from '@/components/dashboard/activity-log';
import { MessageSimulator } from '@/components/dashboard/message-simulator';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { BrainCircuit, ShieldCheck, Github, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
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
            <a 
              href="https://github.com/theweb3wizard/Valor.git" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-muted-foreground hover:text-white transition-colors"
            >
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
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Zap className="h-8 w-8 text-primary shrink-0 mt-1" />
                <p className="text-primary text-xl font-bold leading-tight">
                  Valor watches your Telegram group, scores every message with AI, and automatically sends USDT to contributors who add real value — no commands, no voting, no humans.
                </p>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed pl-4 border-l-2 border-border/50">
                Powered by Gemini AI and Tether's WDK. Every tip is a real on-chain USDT transaction, settled autonomously the moment a quality message is detected.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <StatsCards />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <ActivityLog />
          </div>
          <div className="order-1 lg:order-2">
            <MessageSimulator onNewEvaluation={() => {}} />
            
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

            {/* How It Works Card */}
            <div className="mt-6 p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">How It Works</h3>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-[10px] font-mono text-primary/50 mt-0.5 shrink-0">01</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Valor monitors every message in your Telegram group in real time.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] font-mono text-primary/50 mt-0.5 shrink-0">02</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Two instant filters remove spam and low-effort messages before any AI cost.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] font-mono text-primary/50 mt-0.5 shrink-0">03</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Gemini AI scores qualifying messages 1–10 for insight and usefulness.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] font-mono text-primary/50 mt-0.5 shrink-0">04</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    High-scoring messages trigger an automatic USDT transfer via WDK — on-chain, no human needed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] font-mono text-primary/50 mt-0.5 shrink-0">05</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Contributors withdraw their earned USDT anytime from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 bg-card/20 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Valor Autonomous Agent System. Powered by WDK by Tether & Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
