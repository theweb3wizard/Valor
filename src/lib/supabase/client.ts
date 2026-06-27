import { createBrowserClient } from '@supabase/ssr';
import { clientConfig } from '@/lib/client-config';
import type { Database } from '@/types/database';

export function getBrowserClient() {
  return createBrowserClient<Database>(
    clientConfig.supabaseUrl || '',
    clientConfig.supabaseAnonKey || ''
  );
}

export const supabaseBrowser = getBrowserClient();
