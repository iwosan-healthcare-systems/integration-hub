/**
 * One-time migration: creates the CMS forms and form responses tables.
 * Safe to run more than once (CREATE TABLE/INDEX IF NOT EXISTS).
 *
 * Usage: node scripts/migrate-forms.js
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
  console.log('Creating cms_forms table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_forms (
      id                SERIAL      PRIMARY KEY,
      title             TEXT        NOT NULL,
      description       TEXT        NOT NULL DEFAULT '',
      questions         JSONB       NOT NULL DEFAULT '[]'::jsonb,
      entities          TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
      live_session_id   INTEGER     REFERENCES live_sessions(id) ON DELETE SET NULL,
      starts_at         TIMESTAMPTZ NOT NULL,
      expires_at        TIMESTAMPTZ NOT NULL,
      hide_when_expired BOOLEAN     NOT NULL DEFAULT false,
      sort_order        INTEGER     NOT NULL DEFAULT 0,
      is_active         BOOLEAN     NOT NULL DEFAULT true,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cms_forms_date_window CHECK (expires_at > starts_at)
    )
  `);

  console.log('Ensuring cms_forms live_session_id exists...');
  await pool.query(`
    ALTER TABLE cms_forms
    ADD COLUMN IF NOT EXISTS live_session_id INTEGER REFERENCES live_sessions(id) ON DELETE SET NULL
  `);

  console.log('Creating cms_form_responses table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_form_responses (
      id           SERIAL      PRIMARY KEY,
      form_id      INTEGER     NOT NULL REFERENCES cms_forms(id) ON DELETE CASCADE,
      user_id      INTEGER     REFERENCES users(id) ON DELETE SET NULL,
      user_email   TEXT        NOT NULL,
      user_name    TEXT        NOT NULL DEFAULT '',
      user_entity  TEXT,
      answers      JSONB       NOT NULL DEFAULT '{}'::jsonb,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log('Creating indexes...');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_forms_sort_idx ON cms_forms (sort_order, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_forms_entities_idx ON cms_forms USING GIN (entities)');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_forms_live_session_idx ON cms_forms (live_session_id)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS cms_forms_one_active_per_session_idx ON cms_forms (live_session_id) WHERE is_active = true AND live_session_id IS NOT NULL');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_forms_active_dates_idx ON cms_forms (is_active, starts_at, expires_at)');
  await pool.query('CREATE INDEX IF NOT EXISTS cms_form_responses_form_idx ON cms_form_responses (form_id, submitted_at DESC)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS cms_form_responses_once_idx ON cms_form_responses (form_id, user_id) WHERE user_id IS NOT NULL');

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
