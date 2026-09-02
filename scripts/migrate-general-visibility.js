/**
 * One-time migration: separates the visibility-only `general` marker from
 * `iwosan-healthcare` for live sessions and assessments.
 *
 * This updates database defaults and converts legacy rows that used the old
 * single `iwosan-healthcare` marker as "visible to everyone" into `general`.
 *
 * Usage: node scripts/migrate-general-visibility.js
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

async function tableExists(tableName) {
  const { rows } = await pool.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
  return Boolean(rows[0]?.table_name);
}

async function columnExists(tableName, columnName) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function migrateLiveSessions() {
  if (!(await tableExists('live_sessions'))) {
    console.log('Skipping live_sessions - table not found.');
    return;
  }

  console.log("Ensuring live_sessions.entities defaults to 'general'...");
  await pool.query(
    "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS entities TEXT[] NOT NULL DEFAULT ARRAY['general']::TEXT[]"
  );
  await pool.query("ALTER TABLE live_sessions ALTER COLUMN entities SET DEFAULT ARRAY['general']::TEXT[]");

  if (await columnExists('live_sessions', 'entity')) {
    console.log('Backfilling live_sessions.entities from legacy live_sessions.entity...');
    const result = await pool.query(`
      UPDATE live_sessions
      SET entities = ARRAY[
        CASE WHEN entity = 'iwosan-healthcare' THEN 'general' ELSE entity END
      ]::TEXT[]
      WHERE entity IS NOT NULL
    `);
    console.log(`Backfilled ${result.rowCount} live session row(s) from legacy entity.`);

    console.log('Dropping legacy live_sessions.entity...');
    await pool.query('ALTER TABLE live_sessions DROP COLUMN entity');
  }

  const emptyResult = await pool.query(
    "UPDATE live_sessions SET entities = ARRAY['general']::TEXT[] WHERE entities IS NULL OR cardinality(entities) = 0"
  );
  console.log(`Set ${emptyResult.rowCount} empty live session visibility row(s) to general.`);

  const legacyResult = await pool.query(
    "UPDATE live_sessions SET entities = ARRAY['general']::TEXT[] WHERE entities = ARRAY['iwosan-healthcare']::TEXT[]"
  );
  console.log(`Converted ${legacyResult.rowCount} legacy Iwosan-healthcare-as-general live session row(s).`);

  await pool.query('ALTER TABLE live_sessions ALTER COLUMN entities SET NOT NULL');
}

async function migrateCmsForms() {
  if (!(await tableExists('cms_forms'))) {
    console.log('Skipping cms_forms - table not found.');
    return;
  }

  console.log("Ensuring cms_forms.entities defaults to 'general'...");
  await pool.query("ALTER TABLE cms_forms ADD COLUMN IF NOT EXISTS entities TEXT[] DEFAULT ARRAY['general']::TEXT[]");
  await pool.query("ALTER TABLE cms_forms ALTER COLUMN entities SET DEFAULT ARRAY['general']::TEXT[]");

  const emptyResult = await pool.query(
    "UPDATE cms_forms SET entities = ARRAY['general']::TEXT[] WHERE entities IS NULL OR cardinality(entities) = 0"
  );
  console.log(`Set ${emptyResult.rowCount} empty assessment visibility row(s) to general.`);

  const legacyResult = await pool.query(
    "UPDATE cms_forms SET entities = ARRAY['general']::TEXT[] WHERE entities = ARRAY['iwosan-healthcare']::TEXT[]"
  );
  console.log(`Converted ${legacyResult.rowCount} legacy Iwosan-healthcare-as-general assessment row(s).`);

  await pool.query('ALTER TABLE cms_forms ALTER COLUMN entities SET NOT NULL');
}

async function main() {
  await migrateLiveSessions();
  await migrateCmsForms();
  await pool.end();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
