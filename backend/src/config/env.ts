import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().default('postgresql://rohitkumar@localhost:5432/manufacturing_db'),
  TEST_DATABASE_URL: z.string().url().default('postgresql://rohitkumar@localhost:5432/manufacturing_test_db'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
