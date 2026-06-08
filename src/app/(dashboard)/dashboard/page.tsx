import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: communities } = await supabase
    .from('communities')
    .select('id')
    .eq('owner_user_id', user.id)
    .limit(1);

  if (!communities || communities.length === 0) {
    redirect('/onboard');
  }

  redirect(`/dashboard/${communities[0].id}`);
}
