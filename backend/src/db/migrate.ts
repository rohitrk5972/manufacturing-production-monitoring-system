import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration(customUrl?: string) {
  const targetUrl = customUrl || (env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL);
  const pool = new Pool({ connectionString: targetUrl });
  
  try {
    console.log(`🚀 Connecting to PostgreSQL at ${targetUrl.replace(/:[^:]*@/, ':***@')}...`);
    const client = await pool.connect();
    
    try {
      console.log('📄 Reading schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      console.log('⚙️ Executing database migration...');
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('✅ Database migration completed successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed and rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

// Run directly if called as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
