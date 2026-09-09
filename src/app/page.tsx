import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main className="bg-background">
      <Hero />
      <HowItWorks />
      <Pricing />
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span className="font-mono text-xs">&copy; {new Date().getFullYear()} Valor • Base • Gemini • viem</span>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refund</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
