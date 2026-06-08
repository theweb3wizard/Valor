import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name')
    .eq('owner_user_id', user.id);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-card p-4 hidden lg:flex flex-col">
        <Link href="/" className="mb-8 block">
          <Image src="/logo.svg" alt="Valor" width={80} height={20} className="h-5 w-auto" priority />
        </Link>
        <nav className="space-y-1 flex-1">
          {communities?.map((c) => (
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
      <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
