/**
 * One-time migration: lets up to two active forms be linked to a live session
 * and adds an attendance flag for session-linked forms.
 *
 * Usage: node scripts/migrate-linked-session-forms.js
 * Reads the same DB env vars as the app (DATABASE_URL, or DB_HOST/DB_PORT/
 * DB_NAME/DB_USER/DB_PASSWORD/DB_SSL) - loads .env then .env.local if present.
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
    console.log(`Loaded ${name}`);
  } catch {
    console.log(`Note: ${name} not found - skipping.`);
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
  console.log('Adding cms_forms.is_attendance...');
  await pool.query('ALTER TABLE cms_forms ADD COLUMN IF NOT EXISTS is_attendance BOOLEAN NOT NULL DEFAULT false');

  console.log('Removing one-form-per-session constraint...');
  await pool.query('DROP INDEX IF EXISTS cms_forms_one_active_per_session_idx');

  console.log('Ensuring live session form lookup index exists...');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_forms_live_session_idx ON cms_forms (live_session_id)');

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
