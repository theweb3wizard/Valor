'use client';
import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) setError('Invalid email or password'); else router.push('/dashboard');
    setLoading(false);
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-black border-r border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 mesh-glow opacity-40" />
        <Link href="/" className="relative"><Image src="/logo.svg" alt="Valor" width={100} height={24} className="h-6 w-auto" priority /></Link>
        <div className="relative space-y-6">
          <h2 className="text-4xl leading-none">&ldquo;We went from ghost town to <span className="text-primary italic">daily signal</span>.&rdquo;</h2>
          <p className="text-sm text-zinc-400">Valor turned our Telegram into a meritocracy. Best answers get paid — instantly.</p>
          <div className="flex gap-2 text-xs font-mono text-zinc-500"><span className="border border-white/10 rounded-full px-3 py-1">1.4k evals</span><span className="border border-white/10 rounded-full px-3 py-1">$312 USDC</span></div>
        </div>
        <p className="relative text-xs text-zinc-600">© Valor • Base • Apache-2.0</p>
      </div>
      <div className="flex items-center justify-center p-6 bg-gradient-to-b from-zinc-950 to-black">
        <Card className="w-full max-w-sm border-white/10 bg-zinc-900 rounded-[24px]">
          <CardHeader className="text-center items-center pt-8">
            <Image src="/logo.svg" alt="Valor" width={96} height={24} className="h-6 w-auto mb-2 lg:hidden" priority />
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Free forever • no credit card</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required className="flex h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="flex h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full h-11 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold" disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</Button>
            </form>
            <p className="text-center text-sm text-zinc-500 mt-4">Don&apos;t have an account? <Link href="/register" className="text-white hover:underline">Register</Link></p>
            <p className="text-center text-xs text-zinc-600 mt-3">Demo: use any email, password ≥8 chars — creates account on fly.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
