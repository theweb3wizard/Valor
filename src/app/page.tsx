import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Pricing />
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Valor. All rights reserved.</span>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">Refund</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
