'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  communityName: string;
  botToken: string;
  botUsername: string;
  onCreated: (id: string, treasuryAddress: string) => void;
}

export function StepAddToGroup({ communityName, botToken, botUsername, onCreated }: Props) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [treasuryAddress, setTreasuryAddress] = useState('');
  const [communityId, setCommunityId] = useState('');
  const router = useRouter();

  async function handleVerify() {
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: communityName, botToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create community');
        return;
      }

      const c = data.community || data;
      setTreasuryAddress(c.treasury_address || '');
      setCommunityId(c.id);
      onCreated(c.id, c.treasury_address || '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Add bot to group</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Add{' '}
          <strong className="text-foreground">@{botUsername}</strong> to your Telegram group
          as an <strong className="text-foreground">admin</strong>.
        </p>
      </div>

      {!treasuryAddress ? (
        <>
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Instructions:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Open your Telegram group</li>
              <li>Tap the group name → Add Members</li>
              <li>Search for @{botUsername} and add</li>
              <li>Promote @{botUsername} to admin (needed to read messages)</li>
              <li>Click Verify below to finish setup</li>
            </ol>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? 'Setting up...' : 'Verify installation'}
          </Button>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <p className="font-medium text-foreground">Bot installed successfully!</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Treasury wallet address:</p>
            <p className="text-sm font-mono bg-muted rounded p-2 break-all select-all">
              {treasuryAddress}
            </p>
          </div>
          <Button onClick={() => router.push(`/onboard?communityId=${communityId}`)}>
            Continue to funding
          </Button>
        </div>
      )}
    </div>
  );
}
