'use client';

import { Card, CardContent } from "@/components/ui/card";
import { EvaluationLog } from "./activity-log";
import { Trophy, TrendingUp, Users, Coins } from "lucide-react";

interface StatsCardsProps {
  logs: EvaluationLog[];
}

export function StatsCards({ logs }: StatsCardsProps) {
  const totalTips = logs.filter(l => l.shouldTip).length;
  const totalUsdt = totalTips * 2;
  const avgScore = logs.length > 0 
    ? (logs.reduce((acc, l) => acc + l.score, 0) / logs.length).toFixed(1)
    : 0;
  const uniqueContributors = new Set(logs.map(l => l.username)).size;

  const stats = [
    { label: "Total Distributed", value: `${totalUsdt} USDT`, icon: Coins, color: "text-primary" },
    { label: "Avg. Quality Score", value: `${avgScore}/10`, icon: TrendingUp, color: "text-blue-400" },
    { label: "High Value Tips", value: totalTips, icon: Trophy, color: "text-green-400" },
    { label: "Active Contributors", value: uniqueContributors, icon: Users, color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold font-mono">{stat.value}</p>
            </div>
            <stat.icon className={`h-8 w-8 ${stat.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}