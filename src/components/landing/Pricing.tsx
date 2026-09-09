import Link from 'next/link';

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs tracking-[0.2em] text-primary mb-3">PRICING</p>
          <h2 className="text-4xl sm:text-5xl">Free for everyone.</h2>
          <p className="text-zinc-400 mt-3">No tiers. No caps. No billing. Just fund your treasury with USDC.</p>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          <div className="relative rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-8 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-60 w-60 bg-primary/20 blur-[80px] rounded-full" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3 py-1 text-xs font-bold">● FREE FOREVER</div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-6xl font-light">$0</span>
                <span className="text-zinc-500">/month</span>
                <span className="ml-auto text-xs font-mono border border-white/10 rounded-full px-3 py-1 text-zinc-400">USDC only</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {['Unlimited communities','Unlimited evaluations • Gemini','Unlimited USDC tips • Base','Telegram webhook + HMAC','Claim portal + withdrawals','Dashboard • 15s polling • SSR'].map(f=>(
                  <li key={f} className="flex items-center gap-3"><span className="h-5 w-5 grid place-items-center rounded-full bg-emerald-500 text-black text-xs">✓</span><span className="text-zinc-300">{f}</span></li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 flex h-12 items-center justify-center rounded-full bg-primary text-black font-semibold hover:bg-primary/90 transition-colors">Create community →</Link>
              <p className="text-center text-xs text-zinc-500 mt-3">You only pay gas + USDC you distribute</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/10 bg-zinc-900 p-6">
              <h3 className="font-semibold">Why free?</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Portfolio/demo build. No Paddle, no plans. The previous `plans`/`subscriptions` tables remain in DB but are inert — perfect for forking billing back in later.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-black border border-white/10 p-3"><p className="text-sm font-mono">100%</p><p className="text-[10px] tracking-widest text-zinc-500">OPEN</p></div>
                <div className="rounded-xl bg-black border border-white/10 p-3"><p className="text-sm font-mono">∞</p><p className="text-[10px] tracking-widest text-zinc-500">EVALS</p></div>
                <div className="rounded-xl bg-black border border-white/10 p-3"><p className="text-sm font-mono">∞</p><p className="text-[10px] tracking-widest text-zinc-500">TIPS</p></div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white text-black p-6">
              <p className="text-sm font-mono tracking-widest">COST AT SCALE</p>
              <p className="text-2xl font-light mt-2">~$1–2/mo <span className="text-sm text-zinc-500">Gemini via two-filter gate</span></p>
              <p className="text-xs text-zinc-500 mt-2">Pure-TS pre-filters drop 90%+ messages before any LLM call. Fail-closed on 429.</p>
            </div>
            <div className="flex gap-2 text-xs text-zinc-500 justify-center">
              <span>⚡ Base &lt;1¢ tx</span><span>•</span><span>🔒 Non-custodial</span><span>•</span><span>📜 Apache-2.0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
