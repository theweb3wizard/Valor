'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WalletInfo {
  communityId: string;
  communityName: string;
  walletAddress: string;
  available: number;
  pending: number;
}

function ClaimForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('user');

  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/claim/verify?telegramUserId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.wallets) setWallets(data.wallets);
      })
      .catch(() => toast.error('Failed to load wallet data'))
      .finally(() => setLoading(false));
  }, [userId]);

  const totalAvailable = wallets.reduce((s, w) => s + w.available, 0);
  const totalPending = wallets.reduce((s, w) => s + w.pending, 0);

  async function handleRegister(wallet: WalletInfo) {
    const address = addresses[wallet.communityId]?.trim();

    if (!address || !isAddress(address)) {
      toast.error('Invalid EVM wallet address');
      return;
    }

    try {
      const res = await fetch('/api/claim/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: wallet.communityId,
          telegramUserId: userId,
          walletAddress: address,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.tipsSucceeded > 0
          ? `Wallet registered! ${data.tipsSucceeded} pending tip(s) delivered.`
          : 'Wallet registered!');
        setAddresses((prev) => ({ ...prev, [wallet.communityId]: '' }));
        setWallets((prev) =>
          prev.map((w) =>
            w.communityId === wallet.communityId
              ? { ...w, walletAddress: address, available: w.available + w.pending, pending: 0 }
              : w
          )
        );
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      toast.error('Network error');
    }
  }

  async function handleWithdraw(wallet: WalletInfo) {
    const address = addresses[wallet.communityId]?.trim();
    const amount = parseFloat(amounts[wallet.communityId]);

    if (!address || !isAddress(address)) {
      toast.error('Invalid EVM wallet address');
      return;
    }

    if (!amount || amount <= 0 || amount > wallet.available) {
      toast.error('Invalid withdrawal amount');
      return;
    }

    setWithdrawing(wallet.communityId);

    try {
      const res = await fetch('/api/claim/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: wallet.communityId,
          telegramUserId: userId,
          walletAddress: wallet.walletAddress,
          destinationAddress: address,
          amount,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Withdrawal sent! Tx: ${(data.txHash ?? '').slice(0, 10)}...`);
        setAddresses((prev) => ({ ...prev, [wallet.communityId]: '' }));
        setAmounts((prev) => ({ ...prev, [wallet.communityId]: '' }));
        setWallets((prev) =>
          prev.map((w) =>
            w.communityId === wallet.communityId
              ? { ...w, available: w.available - amount }
              : w
          )
        );
      } else {
        toast.error(data.error || 'Withdrawal failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setWithdrawing(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl tracking-tight">Claim Your USDC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!userId && (
            <p className="text-center text-sm text-muted-foreground">
              Open a Valor tip link from Telegram to claim your rewards.
            </p>
          )}

          {loading && <p className="text-center text-sm text-muted-foreground">Loading...</p>}

          {!loading && userId && wallets.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              You haven&apos;t earned any USDC yet. Join a community powered by Valor and start contributing!
            </p>
          )}

          {wallets.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-muted p-4 text-center space-y-1">
                <p className="text-sm text-muted-foreground">Total available to withdraw</p>
                <p className="text-3xl font-bold">{totalAvailable.toFixed(2)} USDC</p>
                {totalPending > 0 && (
                  <p className="text-sm text-amber-500 font-medium">
                    +{totalPending.toFixed(2)} USDC pending — register your wallet to receive
                  </p>
                )}
              </div>

              {wallets.map((wallet) => (
                <div key={wallet.communityId} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{wallet.communityName}</p>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{wallet.available.toFixed(2)} USDC</p>
                      {wallet.pending > 0 && (
                        <p className="text-xs text-amber-500">{wallet.pending.toFixed(2)} pending</p>
                      )}
                    </div>
                  </div>

                  {wallet.pending > 0 && !wallet.walletAddress && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Your EVM wallet address (0x...)"
                        value={addresses[wallet.communityId] ?? ''}
                        onChange={(e) =>
                          setAddresses((prev) => ({ ...prev, [wallet.communityId]: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                      <Button
                        onClick={() => handleRegister(wallet)}
                        className="w-full"
                        variant="default"
                      >
                        Register wallet & receive pending tips
                      </Button>
                    </div>
                  )}

                  {wallet.available > 0 && (
                    <>
                      <input
                        type="text"
                        placeholder="Destination EVM address (0x...)"
                        value={addresses[wallet.communityId] ?? ''}
                        onChange={(e) =>
                          setAddresses((prev) => ({ ...prev, [wallet.communityId]: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          max={wallet.available}
                          step={0.01}
                          value={amounts[wallet.communityId] ?? ''}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [wallet.communityId]: e.target.value }))
                          }
                          className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <Button
                          onClick={() => handleWithdraw(wallet)}
                          disabled={withdrawing === wallet.communityId}
                          className="flex-1"
                        >
                          {withdrawing === wallet.communityId ? 'Sending...' : 'Withdraw to wallet'}
                        </Button>
                      </div>
                    </>
                  )}

                  {wallet.walletAddress && (
                    <p className="text-xs text-muted-foreground break-all font-mono">
                      Wallet: {wallet.walletAddress.slice(0, 10)}...
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4"><p className="text-center text-sm text-muted-foreground">Loading...</p></div>}>
      <ClaimForm />
    </Suspense>
  );
}
