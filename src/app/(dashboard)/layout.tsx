import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user;

  let communities: { id: string; name: string }[] = [];

  try {
    const db = getDb();
    if (db) {
      const c = await db.select({ id: schema.communities.id, name: schema.communities.name })
        .from(schema.communities)
        .where(eq(schema.communities.ownerUserId, user.id!))
        .orderBy(desc(schema.communities.createdAt));
      communities = c;
    }
  } catch {
    // db unavailable — render layout without data
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-card p-4 hidden lg:flex flex-col">
        <Link href="/" className="mb-8 block">
          <Image src="/logo.svg" alt="Valor" width={80} height={20} className="h-5 w-auto" priority />
        </Link>
        <nav className="space-y-1 flex-1">
          {communities.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">No communities yet</p>
          )}
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/${c.id}`}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <Link
          href="/onboard"
          className="block rounded-md px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
        >
          + New community
        </Link>
      </aside>
      <main className="flex-1 p-4 lg:p-8 overflow-auto pb-20 lg:pb-8">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-3 flex items-center justify-center gap-4 lg:hidden">
        {communities.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/${c.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-20 text-center"
          >
            {c.name}
          </Link>
        ))}
        <Link href="/onboard" className="text-xs text-primary shrink-0">+ New</Link>
      </nav>
    </div>
  );
}
