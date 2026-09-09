import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 mesh-glow" />
      <div className="absolute inset-0 grid-pattern opacity-[0.3]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Valor" width={110} height={28} className="h-7 w-auto" priority />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-flex h-9 px-5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/login" className="inline-flex h-9 items-center rounded-full bg-white text-black px-5 text-sm font-semibold hover:bg-zinc-200 transition-colors">Launch app →</Link>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300">Live on Base • 2.4k tips delivered</span>
            <span className="hidden sm:inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold tracking-wide ml-1">NEW</span>
          </div>

          <h1 className="text-[40px] sm:text-[56px] lg:text-[68px] font-normal leading-[0.9] tracking-[-0.04em]">
            <span className="font-[--font-display]">Your best</span>{' '}
            <span className="font-[--font-display] italic text-primary">contributors</span>
            <br />
            <span className="font-[--font-display]">are leaving.</span>
            <br />
            <span className="font-[--font-display] text-zinc-400">Valor pays them</span>{' '}
            <span className="font-[--font-display] italic text-white">to stay.</span>
          </h1>

          <p className="text-[17px] leading-relaxed text-zinc-400 max-w-xl">
            AI evaluates every Telegram message. Top contributions auto-earn USDC on Base. No commands, no voting, no humans in the loop.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-black hover:bg-primary/90 transition-colors shadow-[0_0_30px_oklch(0.78_0.16_70/0.35)]">
              Start free — no card
            </Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-6 text-sm font-medium hover:bg-white/10 transition-colors">
              <span className="h-7 w-7 rounded-full bg-white text-black grid place-items-center text-xs">▶</span>
              See 90s demo
            </a>
            <span className="text-xs text-zinc-500 ml-1">Free forever • 60s setup</span>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Base • sub-cent fees</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Gemini 2.5 Flash</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Non-custodial</span>
          </div>
        </div>

        {/* Preview card */}
        <div className="relative lg:h-[520px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-2xl hidden lg:block" />
          <div className="relative w-full max-w-[420px] rounded-[20px] border border-white/10 bg-zinc-900/80 backdrop-blur-xl p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] animate-[float_6s_ease-in-out_infinite]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] tracking-widest font-mono text-zinc-500">VALOR • LIVE FEED</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 grid place-items-center text-white font-bold text-xs">A</div>
                <div>
                  <p className="text-sm font-medium">@alexei_eth <span className="text-zinc-500 font-normal">in #general</span></p>
                  <p className="text-xs text-zinc-500">replied • 2m ago</p>
                </div>
                <span className="ml-auto text-[10px] font-mono border border-emerald-500/30 text-emerald-400 rounded-full px-2 py-1">EST. TIPPING</span>
              </div>

              <div className="rounded-xl bg-white/[0.06] border border-white/5 p-3 text-[13px] leading-relaxed text-zinc-300">
                &ldquo;The Uniswap V3 0.05% fee tier pushes IL threshold when vol &gt; 20%. You fix it by narrowing range to ±8% and rebalancing at 1.2x...&rdquo;
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-black px-3 py-1 text-xs font-bold">9.2/10 <span className="font-normal opacity-70">should_tip ✓</span></span>
                <span className="text-xs text-emerald-400 font-semibold">+2.00 USDC</span>
                <span className="ml-auto text-[11px] font-mono text-zinc-500">via Base</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-6 w-6 rounded-full bg-white text-black grid place-items-center font-bold">$</span>
                <span className="text-zinc-400">Transferred to</span>
                <span className="font-mono text-white">0x7a…3f9e</span>
                <a href="https://basescan.org" target="_blank" className="ml-auto text-primary hover:underline">BaseScan ↗</a>
              </div>

              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 flex items-center justify-between">
                <span className="text-xs font-medium">Claim portal: valor.club/claim?user=...</span>
                <span className="text-[10px] bg-black text-white rounded-full px-2 py-1">HMAC sig ✓</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.06] border border-white/5 p-3">
                <p className="text-lg font-semibold">1,482</p>
                <p className="text-[10px] tracking-widest text-zinc-500">EVALS</p>
              </div>
              <div className="rounded-xl bg-primary text-black p-3">
                <p className="text-lg font-bold">$312</p>
                <p className="text-[10px] tracking-widest font-semibold opacity-70">DISTRIBUTED</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] border border-white/5 p-3">
                <p className="text-lg font-semibold">47</p>
                <p className="text-[10px] tracking-widest text-zinc-500">TIPS</p>
              </div>
            </div>
          </div>

          {/* floating badges */}
          <div className="hidden lg:flex absolute -right-4 top-10 items-center gap-2 rounded-full bg-white text-black px-3 py-1.5 text-xs font-semibold shadow-xl">● QStash queued <span className="text-zinc-500 font-normal">12ms</span></div>
          <div className="hidden lg:flex absolute -left-6 bottom-16 items-center gap-2 rounded-full bg-zinc-900 border border-white/10 px-3 py-1.5 text-xs text-white shadow-xl"><span className="h-2 w-2 rounded-full bg-sky-400" /> Telegram webhook 200</div>
        </div>
      </div>

      {/* ticker */}
      <div className="relative border-y border-white/5 bg-black/20 backdrop-blur overflow-hidden">
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap text-xs tracking-widest text-zinc-500 py-3">
          <span className="mx-6">⚡ 15s polling • SSR feed</span>
          <span className="mx-6">🔒 HMAC claim links</span>
          <span className="mx-6">⛓ Base USDC • viem</span>
          <span className="mx-6">🤖 Gemini structured + Zod</span>
          <span className="mx-6">🧊 Deterministic treasury</span>
          <span className="mx-6">⚡ 15s polling • SSR feed</span>
          <span className="mx-6">🔒 HMAC claim links</span>
          <span className="mx-6">⛓ Base USDC • viem</span>
          <span className="mx-6">🤖 Gemini structured + Zod</span>
          <span className="mx-6">🧊 Deterministic treasury</span>
        </div>
      </div>
    </section>
  );
}
