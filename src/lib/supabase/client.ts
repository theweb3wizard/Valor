import { createBrowserClient } from '@supabase/ssr';
import { clientConfig } from '@/lib/config';
import type { Database } from '@/types/database';

export const supabaseBrowser = createBrowserClient<Database>(
  clientConfig.supabaseUrl,
  clientConfig.supabaseAnonKey
);
