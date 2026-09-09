'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface WalletInfo { communityId: string; communityName: string; walletAddress: string; available: number; pending: number }

function ClaimForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('user');
  const sig = searchParams.get('sig');
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const qs = sig ? `?telegramUserId=${encodeURIComponent(userId)}&sig=${encodeURIComponent(sig)}` : `?telegramUserId=${encodeURIComponent(userId)}`;
    fetch(`/api/claim/verify${qs}`).then((r)=>r.json()).then((data)=>{ if(data.wallets) setWallets(data.wallets); else if(data.error) toast.error(data.error); }).catch(()=>toast.error('Failed to load wallet data')).finally(()=>setLoading(false));
  }, [userId, sig]);

  const totalAvailable = wallets.reduce((s,w)=>s+w.available,0);
  const totalPending = wallets.reduce((s,w)=>s+w.pending,0);

  async function handleRegister(wallet: WalletInfo) {
    const address = addresses[wallet.communityId]?.trim();
    if(!address || !isAddress(address)) { toast.error('Invalid EVM wallet address'); return; }
    try {
      const res = await fetch('/api/claim/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({communityId:wallet.communityId,telegramUserId:userId,walletAddress:address,sig:sig??undefined})});
      const data = await res.json();
      if(res.ok){ toast.success(data.tipsSucceeded>0?`Wallet registered! ${data.tipsSucceeded} pending tip(s) delivered.`:'Wallet registered!'); setAddresses((p)=>({...p,[wallet.communityId]:''})); setWallets((prev)=>prev.map((w)=>w.communityId===wallet.communityId?{...w,walletAddress:address,available:w.available+w.pending,pending:0}:w)); } else toast.error(data.error||'Registration failed');
    } catch { toast.error('Network error'); }
  }
  async function handleWithdraw(wallet: WalletInfo) {
    const address = addresses[wallet.communityId]?.trim();
    const amount = parseFloat(amounts[wallet.communityId]);
    if(!address || !isAddress(address)) { toast.error('Invalid EVM wallet address'); return; }
    if(!amount || amount<=0 || amount>wallet.available){ toast.error('Invalid withdrawal amount'); return; }
    setWithdrawing(wallet.communityId);
    try {
      const idempotencyKey = `${wallet.communityId}-${userId}-${Date.now()}`;
      const res = await fetch('/api/claim/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({communityId:wallet.communityId,telegramUserId:userId,walletAddress:wallet.walletAddress,destinationAddress:address,amount,sig:sig??undefined,idempotencyKey})});
      const data = await res.json();
      if(res.ok){ toast.success(`Withdrawal sent! Tx: ${(data.txHash??'').slice(0,10)}…`); setAddresses((p)=>({...p,[wallet.communityId]:''})); setAmounts((p)=>({...p,[wallet.communityId]:''})); setWallets((prev)=>prev.map((w)=>w.communityId===wallet.communityId?{...w,available:w.available-amount}:w)); } else toast.error(data.error||'Withdrawal failed');
    } catch { toast.error('Network error'); } finally { setWithdrawing(null); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 mesh-glow opacity-40" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <Card className="relative w-full max-w-xl border-white/10 bg-zinc-900/80 backdrop-blur-xl rounded-[28px] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-amber-400 to-emerald-500" />
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-3xl font-normal">Claim your USDC</CardTitle>
          <CardDescription>Powered by Valor • Base • HMAC-secured links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!userId && <p className="text-center text-sm text-zinc-400">Open a Valor tip link from Telegram to claim your rewards.<br /><span className="text-xs font-mono">…/claim?user=TELEGRAM_ID&amp;sig=…</span></p>}
          {loading && <p className="text-center text-sm text-zinc-500">Loading…</p>}
          {!loading && userId && wallets.length===0 && <p className="text-center text-sm text-zinc-500">You haven&apos;t earned any USDC yet. Join a community powered by Valor and start contributing!</p>}
          {wallets.length>0 && (
            <>
              <div className="rounded-[20px] border border-white/10 bg-black p-6 text-center">
                <p className="text-xs tracking-widest text-zinc-500">TOTAL AVAILABLE</p>
                <p className="text-4xl font-light mt-1">{totalAvailable.toFixed(2)} <span className="text-lg text-zinc-500">USDC</span></p>
                {totalPending>0 && <p className="text-sm text-amber-400 font-medium mt-2">+{totalPending.toFixed(2)} pending — register wallet to receive</p>}
                <div className="mt-4 flex justify-center gap-2 text-xs">
                  <span className="rounded-full bg-white text-black px-3 py-1 font-semibold">{wallets.length} {wallets.length===1?'community':'communities'}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Base • USDC 6 decimals</span>
                </div>
              </div>
              {wallets.map((wallet)=>(
                <div key={wallet.communityId} className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{wallet.communityName}</p>
                    <div className="text-right"><p className="text-sm font-mono font-semibold">{wallet.available.toFixed(2)} USDC</p>{wallet.pending>0 && <p className="text-xs text-amber-400">{wallet.pending.toFixed(2)} pending</p>}</div>
                  </div>
                  {wallet.pending>0 && !wallet.walletAddress && (
                    <div className="space-y-2">
                      <input type="text" placeholder="Your EVM wallet (0x…)" value={addresses[wallet.communityId]??''} onChange={(e)=>setAddresses((p)=>({...p,[wallet.communityId]:e.target.value}))} className="flex h-11 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary" />
                      <Button onClick={()=>handleRegister(wallet)} className="w-full rounded-full bg-primary text-black font-semibold h-11">Register &amp; receive pending →</Button>
                    </div>
                  )}
                  {wallet.available>0 && (
                    <div className="space-y-2">
                      <input type="text" placeholder="Destination EVM address (0x…)" value={addresses[wallet.communityId]??''} onChange={(e)=>setAddresses((p)=>({...p,[wallet.communityId]:e.target.value}))} className="flex h-11 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary" />
                      <div className="flex gap-2">
                        <input type="number" placeholder="Amount" max={wallet.available} step={0.01} value={amounts[wallet.communityId]??''} onChange={(e)=>setAmounts((p)=>({...p,[wallet.communityId]:e.target.value}))} className="flex h-11 w-28 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        <Button onClick={()=>handleWithdraw(wallet)} disabled={withdrawing===wallet.communityId} className="flex-1 rounded-full bg-white text-black font-semibold h-11 hover:bg-zinc-200">{withdrawing===wallet.communityId?'Sending…':'Withdraw →'}</Button>
                      </div>
                    </div>
                  )}
                  {wallet.walletAddress && <p className="text-xs font-mono text-zinc-500 break-all">Wallet: {wallet.walletAddress}</p>}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default function ClaimPage(){ return <Suspense fallback={<div className="min-h-screen grid place-items-center p-4"><p className="text-sm text-zinc-500">Loading…</p></div>}><ClaimForm /></Suspense>; }
