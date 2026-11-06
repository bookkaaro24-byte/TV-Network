// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const isDatabaseConfigured = (): boolean => {
  return Boolean(
    process.env.SQL_HOST &&
    process.env.SQL_USER &&
    process.env.SQL_DB_NAME
  );
};

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || 'localhost',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'apex_broadcast',
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('[PostgreSQL Pool] Notice on idle SQL client:', err.message);
    });
  }
  return global._postgresPool;
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!isDatabaseConfigured()) return false;
  try {
    const pool = createPool();
    const res = await pool.query('SELECT 1');
    return res.rowCount !== null && res.rowCount > 0;
  } catch (err: any) {
    console.warn('[DatabaseHealth] Connection check notice:', err.message);
    return false;
  }
};

const pool = createPool();

export const db = drizzle(pool, { schema });
