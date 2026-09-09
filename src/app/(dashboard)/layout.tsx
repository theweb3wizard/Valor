import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user;
  let communities: { id: string; name: string }[] = [];
  try {
    const db = getDb();
    if (db) {
      const c = await db.select({ id: schema.communities.id, name: schema.communities.name }).from(schema.communities).where(eq(schema.communities.ownerUserId, user.id!)).orderBy(desc(schema.communities.createdAt));
      communities = c;
    }
  } catch {}
  return (
    <div className="flex min-h-screen bg-black">
      <aside className="w-[280px] border-r border-white/10 bg-zinc-950 p-5 hidden lg:flex flex-col sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <Image src="/logo.svg" alt="Valor" width={90} height={22} className="h-6 w-auto" priority />
          <span className="text-[11px] tracking-widest font-mono border border-white/10 rounded-full px-2 py-1 text-zinc-400">DASHBOARD</span>
        </Link>
        <p className="text-xs tracking-widest text-zinc-500 mb-3">COMMUNITIES</p>
        <nav className="space-y-1 flex-1 overflow-auto">
          {communities.length === 0 && <p className="text-sm text-zinc-500 px-3 py-2">No communities — create one.</p>}
          {communities.map((c) => (
            <Link key={c.id} href={`/dashboard/${c.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-white hover:text-black transition-colors">
              <span className="h-7 w-7 rounded-full bg-white/10 grid place-items-center text-xs">⬢</span>
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
        </nav>
        <Link href="/onboard" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white text-black h-10 text-sm font-semibold hover:bg-zinc-200 transition-colors">+ New community</Link>
        <p className="text-[11px] text-zinc-600 mt-3 text-center">{user.email}</p>
      </aside>
      <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 bg-gradient-to-b from-black via-zinc-950 to-black">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur p-3 flex items-center gap-2 lg:hidden overflow-x-auto">
        {communities.slice(0,5).map((c)=><Link key={c.id} href={`/dashboard/${c.id}`} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs bg-zinc-900 text-zinc-300">{c.name}</Link>)}
        <Link href="/onboard" className="shrink-0 rounded-full bg-white text-black px-4 py-1.5 text-xs font-semibold">+ New</Link>
      </nav>
    </div>
  );
}
