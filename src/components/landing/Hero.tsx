import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <div className="absolute top-8 left-6 lg:left-12">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Valor" width={100} height={25} className="h-6 w-auto" priority />
        </Link>
      </div>
      <div className="mx-auto max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Your best contributors are leaving.{' '}
            <span className="text-primary">Valor pays them to stay.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            AI-powered quality evaluation and autonomous USDC rewards for your Telegram community.
            No commands. No voting. No humans in the loop.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Start free — no credit card
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-transparent px-8 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                V
              </div>
              <div>
                <p className="font-medium text-sm">@alexei_eth</p>
                <p className="text-xs text-muted-foreground">replied to a question in #general</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              "The issue is that the Uniswap V3 pool uses a 0.05% fee tier, which means the
              impermanent loss threshold is higher when volatility spikes above 20%..."
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  9/10
                </span>
                <span className="text-sm font-semibold text-foreground">+2 USDC</span>
              </div>
              <a
                href="https://basescan.org"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                View on BaseScan →
              </a>
            </div>
            <p className="text-xs text-muted-foreground italic">
              "Clear, technically accurate explanation with specific DeFi details."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
