import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  try {
    const res = await pool.query('SELECT current_database(), version();');
    console.log(`🏭 Manufacturing Monitoring Backend running on http://localhost:${PORT}`);
    console.log(`📦 Connected to database: ${res.rows[0].current_database}`);
  } catch (err) {
    console.error('❌ Failed to verify database connection on startup:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});
