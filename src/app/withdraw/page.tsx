'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BrainCircuit, 
  ArrowLeft, 
  Wallet, 
  Zap, 
  CheckCircle, 
  ExternalLink, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function WithdrawPage() {
  // Form State
  const [username, setUsername] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  
  // UI State
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    amount: number;
    destination: string;
    etherscanUrl: string;
  } | null>(null);

  const { toast } = useToast();

  const handleCheckBalance = async () => {
    if (!username || !communityId) {
      setError("Please enter both username and community ID.");
      return;
    }

    try {
      setIsCheckingBalance(true);
      setError(null);
      
      const cleanUsername = username.startsWith('@') ? username : `@${username}`;
      const res = await fetch(`/api/withdraw?username=${encodeURIComponent(cleanUsername)}&communityId=${encodeURIComponent(communityId)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setBalance(data.balance);
      if (data.balance === 0) {
        toast({
          title: "No Balance",
          description: "This account has no USDT tips available to withdraw.",
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check balance');
      setBalance(null);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleWithdraw = async () => {
    if (!username || !communityId || !destinationAddress || !amount) return;
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0 || (balance !== null && withdrawAmount > balance)) {
      setError("Invalid withdrawal amount.");
      return;
    }

    try {
      setIsWithdrawing(true);
      setError(null);

      const cleanUsername = username.startsWith('@') ? username : `@${username}`;
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          communityId,
          destinationAddress,
          amount: withdrawAmount
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSuccessData({
        amount: data.amount,
        destination: data.destinationAddress,
        etherscanUrl: data.etherscanUrl
      });
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setAmount('');
    setBalance(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                WITHDRAW
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
        <div className="max-w-2xl mx-auto">
          {successData ? (
            <Card className="bg-card/50 border-border rounded-xl animate-in fade-in zoom-in duration-300">
              <CardContent className="pt-12 pb-10 flex flex-col items-center text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Withdrawal Successful!</h2>
                  <p className="text-muted-foreground">
                    Your {successData.amount} USDT has been sent to your wallet.
                  </p>
                </div>
                
                <div className="w-full p-4 rounded-xl bg-black/20 border border-border/30 font-mono text-xs break-all text-muted-foreground">
                  Recipient: <span className="text-white">{successData.destination}</span>
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                  <a 
                    href={successData.etherscanUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full amber-gradient hover:opacity-90 font-bold gap-2">
                      <ExternalLink className="h-4 w-4" />
                      VIEW ON ETHERSCAN
                    </Button>
                  </a>
                  <Button variant="outline" onClick={resetForm} className="w-full">
                    Withdraw More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">Withdraw Your Tips</h2>
                <p className="text-muted-foreground text-lg">
                  Send your earned USDT to any wallet address.
                </p>
              </div>

              <Card className="bg-card/50 border-border rounded-xl">
                <CardContent className="pt-8 space-y-6">
                  {/* Field 1: Username */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Your Telegram Username</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="@username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-black/40 border-border/50 focus:ring-primary h-12"
                      />
                    </div>
                  </div>

                  {/* Field 2: Community ID */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Community ID</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Enter your community ID" 
                          value={communityId}
                          onChange={(e) => setCommunityId(e.target.value)}
                          className="bg-black/40 border-border/50 focus:ring-primary h-12"
                        />
                        <Button 
                          onClick={handleCheckBalance}
                          disabled={isCheckingBalance || !username || !communityId}
                          className="h-12 px-6 shrink-0 bg-secondary hover:bg-secondary/80 font-bold gap-2"
                        >
                          {isCheckingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                          Check Balance
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Your community ID can be found on the Valor dashboard.
                      </p>
                    </div>
                  </div>

                  {/* Balance Display */}
                  {balance !== null && (
                    <div className={cn(
                      "p-6 rounded-xl border flex items-center justify-between animate-in slide-in-from-top-2 duration-300",
                      balance > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-lg",
                          balance > 0 ? "bg-primary/10" : "bg-muted/50"
                        )}>
                          <Wallet className={cn("h-6 w-6", balance > 0 ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Available USDT Tips</p>
                          <p className="text-3xl font-black font-mono text-white">{balance.toFixed(2)}</p>
                        </div>
                      </div>
                      <Badge className={balance > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                        {balance > 0 ? 'Ready to Withdraw' : 'Empty'}
                      </Badge>
                    </div>
                  )}

                  {/* Withdrawal Form (Only if balance > 0) */}
                  {balance !== null && balance > 0 && (
                    <div className="space-y-6 pt-6 border-t border-border/50 animate-in fade-in duration-500">
                      {/* Field 3: Wallet Address */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Destination Wallet Address</label>
                        <Input 
                          placeholder="0x...." 
                          value={destinationAddress}
                          onChange={(e) => setDestinationAddress(e.target.value)}
                          className="bg-black/40 border-border/50 focus:ring-primary h-12 font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                          Enter the Ethereum address where you want to receive your USDT.
                        </p>
                      </div>

                      {/* Amount Field */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Amount to Withdraw (USDT)</label>
                        <div className="flex gap-2">
                          <Input 
                            type="number"
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-black/40 border-border/50 focus:ring-primary h-12"
                          />
                          <Button 
                            variant="secondary" 
                            onClick={() => setAmount(balance.toString())}
                            className="h-12 font-bold px-6"
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      {/* Error Alert */}
                      {error && (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* Submit Button */}
                      <div className="space-y-4">
                        <Button 
                          onClick={handleWithdraw}
                          disabled={isWithdrawing || !destinationAddress || !amount || parseFloat(amount) <= 0}
                          className="w-full h-14 amber-gradient hover:opacity-90 transition-opacity glow-primary font-black text-lg gap-3"
                        >
                          {isWithdrawing ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              PROCESSING...
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              WITHDRAW USDT
                            </>
                          )}
                        </Button>
                        {isWithdrawing && (
                          <p className="text-center text-xs text-primary animate-pulse font-medium">
                            Processing on-chain transaction... this may take 10-30 seconds.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Initial Error display if balance hasn't been checked yet */}
                  {balance === null && error && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 bg-card/20 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Valor Autonomous Agent System. Powered by WDK by Tether & Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
