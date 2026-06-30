import Link from 'next/link';

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          Free for everyone
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          No hidden fees, no subscription tiers. All features included.
        </p>
        <div className="max-w-sm mx-auto">
          <div className="relative rounded-xl border border-border bg-card p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Free</h3>
              <p className="text-sm text-muted-foreground mt-1">Everything included</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Unlimited communities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Unlimited evaluations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Unlimited tips
              </li>
            </ul>
            <Link
              href="/login"
              className="block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <span>⚡ Built on Base — sub-cent transactions</span>
          <span>🤖 Powered by Gemini AI</span>
        </div>
      </div>
    </section>
  );
}
