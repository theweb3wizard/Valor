'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onNext: (name: string) => void;
}

export function StepNameCommunity({ onNext }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Name your community</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Give your Telegram community a name. You&apos;ll need a Telegram bot token to continue.
          Create one at{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            t.me/BotFather
          </a>
        </p>
      </div>
      <input
        type="text"
        placeholder="e.g., My DeFi Community"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <Button onClick={() => onNext(name)} disabled={!name.trim()}>
        Continue
      </Button>
    </div>
  );
}
