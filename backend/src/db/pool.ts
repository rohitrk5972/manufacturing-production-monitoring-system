import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const connectionString = env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
