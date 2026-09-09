'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      const signInResult = await signIn('credentials', { email, password, redirect: false });
      if (signInResult?.error) { setError('Account created. Please log in.'); return; }
      router.push('/onboard');
    } catch { setError('Network error. Please try again.'); } finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-black border-r border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 mesh-glow opacity-40" />
        <Link href="/" className="relative"><Image src="/logo.svg" alt="Valor" width={100} height={24} className="h-6 w-auto" priority /></Link>
        <div className="relative">
          <h2 className="text-4xl leading-none">Start free.<br /><span className="text-zinc-500">Keep your best.</span></h2>
          <p className="text-sm text-zinc-400 mt-4">60s setup • No card • Apache-2.0</p>
        </div>
        <p className="relative text-xs text-zinc-600">© Valor</p>
      </div>
      <div className="flex items-center justify-center p-6 bg-gradient-to-b from-zinc-950 to-black">
        <Card className="w-full max-w-sm border-white/10 bg-zinc-900 rounded-[24px]">
          <CardHeader className="text-center items-center pt-8">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Free forever • 8+ chars password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required className="flex h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} className="flex h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full h-11 rounded-full bg-primary text-black font-semibold hover:bg-primary/90" disabled={loading}>{loading ? 'Creating…' : 'Create account →'}</Button>
            </form>
            <p className="text-center text-sm text-zinc-500 mt-4">Already have an account? <Link href="/login" className="text-white hover:underline">Sign in</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
