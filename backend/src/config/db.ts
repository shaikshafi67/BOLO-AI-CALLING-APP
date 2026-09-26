import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' || env.databaseUrl.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});
