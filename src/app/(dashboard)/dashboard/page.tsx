import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user;

  const db = getDb();
  if (!db) redirect('/login');

  const communities = await db.select({ id: schema.communities.id })
    .from(schema.communities)
    .where(eq(schema.communities.ownerUserId, user.id!))
    .limit(1);

  if (!communities || communities.length === 0) {
    redirect('/onboard');
  }

  redirect(`/dashboard/${communities[0].id}`);
}
