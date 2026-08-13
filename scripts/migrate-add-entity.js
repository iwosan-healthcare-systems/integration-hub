/**
 * One-time migration: adds the `entity` column to `users` and
 * `live_sessions` for entity-scoped Sessions. Safe to run more than once
 * (uses ADD COLUMN IF NOT EXISTS) and safe to run against a DB that was
 * already created fresh from schema.sql (which now includes these columns).
 *
 * Usage: node scripts/migrate-add-entity.js
 * Reads the same DB env vars as the app (DATABASE_URL, or DB_HOST/DB_PORT/
 * DB_NAME/DB_USER/DB_PASSWORD/DB_SSL) — loads .env then .env.local if
 * present, exactly like server.js does, so it works the same way whether
 * it's run on the AWS box (.env) or locally (.env.local).
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
  console.log('Adding users.entity …');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS entity TEXT');

  console.log("Adding live_sessions.entity (default 'iwosan-healthcare' — existing sessions become general) …");
  await pool.query(
    "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS entity TEXT NOT NULL DEFAULT 'iwosan-healthcare'"
  );

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
