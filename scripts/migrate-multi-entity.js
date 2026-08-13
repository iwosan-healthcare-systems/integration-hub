/**
 * One-time migration: lets a session be tagged to more than one entity.
 * Adds `live_sessions.entities` (TEXT[]), backfills it from the old
 * single-value `entity` column if that column still exists (preserving
 * whatever was already tagged), then drops `entity`.
 * Safe to run more than once — each step is idempotent.
 *
 * Usage: node scripts/migrate-multi-entity.js
 * Reads the same DB env vars as the app (DATABASE_URL, or DB_HOST/DB_PORT/
 * DB_NAME/DB_USER/DB_PASSWORD/DB_SSL) — loads .env then .env.local if
 * present, exactly like server.js does.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const name of ['.env', '.env.local']) {
  try {
    const content = readFileSync(resolve(__dirname, '..', name), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq > 0) {
        const key = t.slice(0, eq).trim();
        const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
    console.log(`✓ Loaded ${name}`);
  } catch {
    console.log(`Note: ${name} not found — skipping.`);
  }
}

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

async function main() {
  console.log('Adding live_sessions.entities …');
  await pool.query(
    "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS entities TEXT[] NOT NULL DEFAULT ARRAY['iwosan-healthcare']::TEXT[]"
  );

  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'live_sessions' AND column_name = 'entity'`
  );
  if (rows.length > 0) {
    console.log('Backfilling entities from the old entity column …');
    await pool.query('UPDATE live_sessions SET entities = ARRAY[entity] WHERE entity IS NOT NULL');
    console.log('Dropping the old entity column …');
    await pool.query('ALTER TABLE live_sessions DROP COLUMN entity');
  } else {
    console.log('No old entity column found — nothing to backfill.');
  }

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
