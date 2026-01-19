// apps/backend/src/db/migrate.ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './db';

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY id ASC'
  );
  return new Set(result.rows.map((r) => r.name));
}

async function run() {
  await ensureMigrationsTable();

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping migration ${file} (already applied)`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf-8');

    console.log(`Running migration ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`Migration ${file} applied successfully.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error in migration ${file}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log('All migrations applied.');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
