const steps = [
  {
    n: '01',
    title: 'Connect bot',
    desc: 'Paste your @BotFather token. Valor verifies via getMe and registers the webhook with X-Telegram-Bot-Api-Secret-Token.',
    icon: '●',
    acc: 'from-violet-500 to-fuchsia-500',
  },
  {
    n: '02',
    title: 'Fund treasury',
    desc: 'Deterministic per-community wallet derived from your master key. Send USDC on Base — you own the budget.',
    icon: '◐',
    acc: 'from-amber-400 to-orange-600',
  },
  {
    n: '03',
    title: 'Auto-tip',
    desc: 'Two-stage filter (0ms) → Gemini 2.5 Flash (Zod) → idempotent QStash job → USDC transfer → Telegram notify.',
    icon: '⬢',
    acc: 'from-emerald-400 to-teal-600',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs tracking-[0.2em] text-primary mb-3">HOW IT WORKS</p>
            <h2 className="text-4xl sm:text-5xl leading-none">Set &amp; forget.<br /><span className="text-zinc-500">Valor handles the rest.</span></h2>
          </div>
          <p className="text-sm text-zinc-400 max-w-md">60s setup, then fully autonomous. Built for serverless — webhook returns in &lt;50ms, heavy work queues to signed jobs.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="group relative rounded-[24px] border border-white/10 bg-zinc-900 p-7 overflow-hidden hover:border-white/15 transition-colors">
              <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${s.acc} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-5xl font-light text-white/10 tracking-tighter">{s.n}</span>
                  <span className={`h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br ${s.acc} text-white text-sm`}>{s.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{s.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <span className="h-px flex-1 bg-white/10" />
                  <span>~0ms pre-filter</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Architecture mini */}
        <div className="mt-8 rounded-[24px] border border-white/10 bg-black p-6 lg:p-8 overflow-x-auto">
          <p className="text-xs tracking-widest text-zinc-500 mb-4">REQUEST LIFECYCLE</p>
          <div className="flex items-center gap-3 min-w-[720px] text-xs font-mono">
            {['Telegram msg','POST /webhook','filter 1+2','QStash enqueue → 200','/jobs/evaluate','Gemini Zod','idempotency','USDC viem','notify+BaseScan'].map((t,i)=>(
              <div key={t} className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1.5 whitespace-nowrap ${i===4?'bg-white text-black border-white':'bg-white/5 border-white/10 text-zinc-300'}`}>{t}</span>
                {i<8 && <span className="text-zinc-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
