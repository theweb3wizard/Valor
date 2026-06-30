import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@/db/schema';
import { serverConfig } from '@/lib/config';

if (!serverConfig.databaseUrl) {
  console.warn('DATABASE_URL not configured. Database features will not work.');
}

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export function getDb() {
  if (!serverConfig.databaseUrl) return null;

  if (!_db) {
    _pool = new Pool({ connectionString: serverConfig.databaseUrl, max: 10 });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function getPool() {
  if (!serverConfig.databaseUrl) return null;
  if (!_pool) {
    _pool = new Pool({ connectionString: serverConfig.databaseUrl, max: 10 });
  }
  return _pool;
}
