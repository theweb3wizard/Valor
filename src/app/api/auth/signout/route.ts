import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { clientConfig } from '@/lib/client-config';

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    clientConfig.supabaseUrl,
    clientConfig.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', clientConfig.appUrl));
}
