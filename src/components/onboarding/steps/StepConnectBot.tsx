'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onNext: (botToken: string, botUsername: string) => void;
}

export function StepConnectBot({ onNext }: Props) {
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  async function handleVerify() {
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/community/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      onNext(token.trim(), data.username);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Connect your bot</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Go to{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            @BotFather
          </a>{' '}
          on Telegram and create a new bot. Paste the token below.
        </p>
      </div>
      <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
        <li>Open Telegram and search for @BotFather</li>
        <li>Send /newbot and follow the prompts</li>
        <li>Copy the HTTP API token (looks like 123456:ABCdef...)</li>
        <li>Paste it below and click Verify</li>
      </ol>
      <input
        type="text"
        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleVerify} disabled={!token.trim() || verifying}>
        {verifying ? 'Verifying...' : 'Verify bot'}
      </Button>
    </div>
  );
}
