'use client';

import { useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { clientConfig } from '@/lib/config';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const { error: signInError } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${clientConfig.appUrl}/auth/callback`,
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center items-center">
          <Image src="/logo.svg" alt="Valor" width={96} height={24} className="h-6 w-auto mb-2" priority />
          <CardDescription>
            {sent
              ? 'Check your email for a login link'
              : 'Sign in with your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              We sent a magic link to <strong className="text-foreground">{email}</strong>.
              Click the link in the email to sign in.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full">
                Send magic link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
