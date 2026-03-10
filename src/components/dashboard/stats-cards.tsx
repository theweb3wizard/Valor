
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, Users, Coins } from "lucide-react";
import { supabase } from '@/lib/supabase';

export function StatsCards() {
  const [stats, setStats] = useState({
    totalUsdt: 0,
    avgScore: "0.0",
    totalTips: 0,
    activeUsers: 0
  });

  const fetchStats = async () => {
    try {
      // 1. Total USDT Distributed (tips count * 2)
      const { count: tipCount } = await supabase
        .from('tips')
        .select('*', { count: 'exact', head: true });
      
      // 2. Average Score
      const { data: scores } = await supabase
        .from('evaluations')
        .select('score');
      
      const avg = scores && scores.length > 0 
        ? (scores.reduce((acc, s) => acc + s.score, 0) / scores.length).toFixed(1)
        : "0.0";

      // 3. High Value Tips (evaluations with should_tip = true)
      const { count: highValueCount } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('should_tip', true);

      // 4. Active Contributors (distinct usernames)
      const { data: contributors } = await supabase
        .from('evaluations')
        .select('username');
      
      const distinctUsers = new Set(contributors?.map(c => c.username)).size;

      setStats({
        totalUsdt: (tipCount || 0) * 2,
        avgScore: avg,
        totalTips: highValueCount || 0,
        activeUsers: distinctUsers
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const statsDisplay = [
    { label: "Total Distributed", value: `${stats.totalUsdt} USDT`, icon: Coins, color: "text-primary" },
    { label: "Avg. Quality Score", value: `${stats.avgScore}/10`, icon: TrendingUp, color: "text-blue-400" },
    { label: "High Value Tips", value: stats.totalTips, icon: Trophy, color: "text-green-400" },
    { label: "Active Contributors", value: stats.activeUsers, icon: Users, color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statsDisplay.map((stat, i) => (
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
