import { beforeAll, afterAll } from 'vitest';
import { runMigration } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

beforeAll(async () => {
  // Ensure test database is migrated and freshly seeded before test suite runs
  await runMigration(env.TEST_DATABASE_URL);
  await runSeed(env.TEST_DATABASE_URL);
});

afterAll(async () => {
  await pool.end();
});
