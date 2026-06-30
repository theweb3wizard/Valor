'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Community } from '@/types/database';

export default function CommunitySettingsPage() {
  const params = useParams();
  const communityId = params.communityId as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [minScore, setMinScore] = useState(7);
  const [tipLow, setTipLow] = useState(1);
  const [tipHigh, setTipHigh] = useState(2);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [evalContext, setEvalContext] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/community/${communityId}`)
      .then((r) => r.json())
      .then((data) => {
        setCommunity(data);
        setMinScore(Number(data.minScore ?? 7));
        setTipLow(Number(data.tipAmountLow ?? 1));
        setTipHigh(Number(data.tipAmountHigh ?? 2));
        setDailyLimit(Number(data.dailyLimitPerUser ?? 3));
        setEvalContext(data.evalContext ?? '');
      })
      .catch(() => toast.error('Failed to load community settings'));
  }, [communityId]);

  async function saveScoring() {
    if (tipLow <= 0 || tipHigh <= 0 || dailyLimit < 1) {
      toast.error('Invalid values: tip amounts must be positive, daily limit at least 1');
      setSaving(null);
      return;
    }
    setSaving('scoring');
    const res = await fetch(`/api/community/${communityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        min_score: minScore,
        tip_amount_low: tipLow,
        tip_amount_high: tipHigh,
        daily_limit_per_user: dailyLimit,
      }),
    });
    if (res.ok) toast.success('Scoring settings saved');
    else toast.error('Failed to save scoring settings');
    setSaving(null);
  }

  async function saveContext() {
    setSaving('context');
    const res = await fetch(`/api/community/${communityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eval_context: evalContext }),
    });
    if (res.ok) toast.success('Community context saved');
    else toast.error('Failed to save community context');
    setSaving(null);
  }

  async function testConnection() {
    if (!community) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${community.botToken}/getWebhookInfo`);
      const data = await res.json();
      if (data.ok) {
        toast.success(
          `Webhook: ${data.result.url || 'not set'} | Pending: ${data.result.pending_update_count}`
        );
      } else {
        toast.error('Telegram API error');
      }
    } catch {
      toast.error('Failed to connect to Telegram');
    }
  }

  async function reRegisterWebhook() {
    if (!community) return;
    const res = await fetch(`/api/community/${communityId}/re-register-webhook`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) toast.success('Webhook re-registered');
    else toast.error(data.error || 'Failed to re-register webhook');
  }

  async function deactivate() {
    const res = await fetch(`/api/community/${communityId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Community deactivated');
      window.location.href = '/dashboard';
    } else {
      toast.error('Failed to deactivate community');
    }
  }

  if (!community) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Configuration</CardTitle>
          <CardDescription>
            Configure how messages are scored and how much to tip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Minimum quality score threshold: <strong>{minScore}</strong>
            </label>
            <input
              type="range"
              min={5}
              max={9}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>9</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tip amount (score 7-8)</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={tipLow}
                onChange={(e) => setTipLow(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tip amount (score 9-10)</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={tipHigh}
                onChange={(e) => setTipHigh(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Daily tip limit per user</label>
            <input
              type="number"
              min={1}
              max={20}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={saveScoring} disabled={saving === 'scoring'}>
            {saving === 'scoring' ? 'Saving...' : 'Save scoring settings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Community Context</CardTitle>
          <CardDescription>
            Describe your community to improve AI scoring accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <textarea
              placeholder="e.g., This is a DeFi protocol community focused on technical questions about liquidity pools, yield strategies, and smart contract security. Reward detailed technical explanations and penalize FUD and price speculation."
              value={evalContext}
              onChange={(e) => {
                if (e.target.value.length <= 500) setEvalContext(e.target.value);
              }}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground text-right">
              {evalContext.length} / 500
            </p>
          </div>
          <Button onClick={saveContext} disabled={saving === 'context'}>
            {saving === 'context' ? 'Saving...' : 'Save context'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bot Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Bot: </span>
              <span className="font-mono">@{community.botToken?.slice(0, 20)}...</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={testConnection}>
              Test connection
            </Button>
            <Button variant="outline" onClick={reRegisterWebhook}>
              Re-register webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deactivating will stop all evaluations and tips. Data is preserved and can be reactivated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Deactivate community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate community?</DialogTitle>
                <DialogDescription>
                  This will stop processing all messages and remove the Telegram webhook.
                  Your data will not be deleted. You can reactivate later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={deactivate}>
                  Deactivate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
