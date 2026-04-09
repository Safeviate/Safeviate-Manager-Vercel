import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { getMissingEnvVars } from '@/lib/server/env';

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const databaseUrl = process.env.NEON2_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    const missing = getMissingEnvVars([['DATABASE_URL', 'NEON2_DATABASE_URL']]);
    throw new Error(`[env] Missing required environment variables for database access: ${missing.join(', ')}`);
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!db) {
    db = createDb();
  }

  return db;
}

export { schema };
