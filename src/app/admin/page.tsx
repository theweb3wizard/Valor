'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BrainCircuit, 
  ArrowLeft, 
  Info, 
  Wallet, 
  Copy, 
  CheckCheck, 
  ExternalLink, 
  Zap,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface WalletData {
  masterAddress: string;
  balance: number;
  network: string;
  tokenContract: string;
}

export default function AdminPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/wallet');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWallet(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.masterAddress);
    setCopied(true);
    toast({
      title: "Address Copied",
      description: "Treasury wallet address copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
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
                ADMIN PANEL
              </p>
            </div>
          </div>
          
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-white gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Community Setup</h2>
            <p className="text-muted-foreground text-lg">
              Manage Valor's treasury wallet and community configuration.
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-background font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 w-px bg-border/50" />
              </div>
              <Card className="flex-1 bg-card/50 border-border rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Add Valor Bot to Your Group</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Search for the Valor bot on Telegram and add it as an administrator to your community group.
                  </p>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/90 leading-relaxed font-medium">
                      Valor requires "Send Messages" and "Manage Chat" permissions to announce tip evaluations and track user contributions autonomously.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-background font-bold shrink-0">
                  2
                </div>
                <div className="flex-1 w-px bg-border/50" />
              </div>
              <Card className="flex-1 bg-card/50 border-border rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Fund the Treasury Wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full rounded-lg bg-white/5" />
                      <Skeleton className="h-24 w-full rounded-lg bg-white/5" />
                    </div>
                  ) : error ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                      {error}
                    </div>
                  ) : wallet && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Master Treasury Address</label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-black/40 border border-border/50 p-3 rounded-lg font-mono text-xs text-white break-all flex items-center">
                            {wallet.masterAddress}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="icon" variant="secondary" onClick={handleCopy} className="shrink-0">
                              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <a href={`https://sepolia.etherscan.io/address/${wallet.masterAddress}`} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="secondary" className="shrink-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">USDT Balance (Sepolia)</p>
                            <p className="text-2xl font-black font-mono text-white">{wallet.balance} <span className="text-xs text-muted-foreground">USDT</span></p>
                          </div>
                        </div>
                        <Badge 
                          className={wallet.balance < 10 
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                          }
                          variant="outline"
                        >
                          {wallet.balance < 10 ? 'Low Balance' : 'Funded'}
                        </Badge>
                      </div>

                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-primary/90 leading-relaxed font-medium">
                          Send USDT (ERC-20) on the Sepolia Testnet to this address. Valor uses this pool to distribute rewards instantly to contributors.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-background font-bold shrink-0">
                3
              </div>
              <Card className="flex-1 bg-card/50 border-border rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Valor Is Now Active</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Once funded, Valor monitors your group autonomously. No manual triggers or voting required. High-quality messages will fire tips directly from the treasury.
                  </p>
                  <Link href="/">
                    <Button className="w-full amber-gradient hover:opacity-90 transition-opacity glow-primary font-bold gap-2">
                      <Zap className="h-4 w-4" />
                      GO TO DASHBOARD
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
