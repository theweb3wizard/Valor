'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  communityId: string;
  treasuryAddress: string;
  botUsername: string;
}

export function StepFundTreasury({ communityId, treasuryAddress, botUsername }: Props) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!communityId) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/community/${communityId}`);
        const data = await res.json();
        if (data.usdc_balance !== undefined) {
          setBalance(data.usdc_balance);
          if (data.usdc_balance > 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch {
        // silently retry
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [communityId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(treasuryAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Fund your treasury</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Send USDC on <strong className="text-foreground">Base network</strong> to the address below.
          A minimum of <strong className="text-foreground">10 USDC</strong> is recommended to start.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Treasury wallet address:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={treasuryAddress}
            className="flex h-10 flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono ring-offset-background select-all"
          />
          <Button variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted p-4 text-sm">
        <p className="font-medium text-foreground mb-1">Network: Base</p>
        <p className="text-muted-foreground">
          Bot username: @{botUsername}
        </p>
      </div>

      {balance !== null && (
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Treasury balance</p>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-success' : 'text-foreground'}`}>
            {balance} USDC
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => router.push(`/dashboard/${communityId}`)}
          disabled={!balance || balance <= 0}
        >
          Treasury funded — Go to dashboard
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Skip for now (use free tier)
        </Button>
      </div>
    </div>
  );
}
