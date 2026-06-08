import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { clientConfig, serverConfig } from '@/lib/config';

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    clientConfig.supabaseUrl,
    clientConfig.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — middleware handles session refresh
          }
        },
      },
    }
  );
}

export function createServiceSupabase() {
  return createClient(
    serverConfig.supabaseUrl,
    serverConfig.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
