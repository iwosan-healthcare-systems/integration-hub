/**
 * One-time migration: creates the `video_albums` and `videos` tables for
 * the Video Library feature, and adds optional `video` columns to `news`
 * and `courses`. Safe to run more than once (CREATE TABLE/ADD COLUMN IF
 * NOT EXISTS).
 *
 * Usage: node scripts/migrate-videos.js
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
  console.log('Creating video_albums table …');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_albums (
      id          SERIAL      PRIMARY KEY,
      title       TEXT        NOT NULL,
      description TEXT        NOT NULL DEFAULT '',
      sort_order  INTEGER     NOT NULL DEFAULT 0,
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log('Creating videos table …');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id          SERIAL      PRIMARY KEY,
      album_id    INTEGER     REFERENCES video_albums(id) ON DELETE SET NULL,
      title       TEXT        NOT NULL,
      description TEXT        NOT NULL DEFAULT '',
      s3_key      TEXT        NOT NULL,
      thumbnail   TEXT        NOT NULL DEFAULT '',
      duration    TEXT        NOT NULL DEFAULT '',
      file_size   BIGINT      NOT NULL DEFAULT 0,
      sort_order  INTEGER     NOT NULL DEFAULT 0,
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Adding videos.album_id (if upgrading an existing table) …');
  await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES video_albums(id) ON DELETE SET NULL');

  console.log('Creating indexes …');
  await pool.query('CREATE INDEX IF NOT EXISTS videos_sort_idx ON videos (sort_order, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS videos_album_idx ON videos (album_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS video_albums_sort_idx ON video_albums (sort_order, created_at DESC)');

  console.log('Adding news.video and courses.video columns …');
  await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS video TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS video TEXT NOT NULL DEFAULT ''");

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
