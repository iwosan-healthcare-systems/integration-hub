/**
 * Runs idempotent database migrations in filename order.
 *
 * Only scripts named migrate-*.js are included. The .mjs migration utilities
 * are intentionally excluded because they may perform one-off asset/data moves
 * that should not run automatically on every deploy.
 *
 * Usage:
 *   node scripts/run-migrations.js
 *   node scripts/run-migrations.js --dry-run
 */
import { readFileSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const self = basename(__filename);
const dryRun = process.argv.includes('--dry-run');
const MIGRATION_LOCK_ID = 20260902;

const migrations = readdirSync(__dirname)
  .filter((file) => /^migrate-.+\.js$/.test(file) && file !== self)
  .sort((a, b) => a.localeCompare(b));

if (migrations.length === 0) {
  console.log('No migration scripts found.');
  process.exit(0);
}

if (dryRun) {
  console.log('Migrations that would run:');
  for (const migration of migrations) console.log(`- ${migration}`);
  process.exit(0);
}

for (const name of ['.env', '.env.local']) {
  try {
    const content = readFileSync(join(__dirname, '..', name), 'utf-8');
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

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT        PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function hasRun(filename) {
  const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
  return rows.length > 0;
}

async function markRun(filename) {
  await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING', [filename]);
}

async function main() {
  await pool.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    await ensureMigrationTable();

    for (const migration of migrations) {
      if (await hasRun(migration)) {
        console.log(`Skipping ${migration} - already applied.`);
        continue;
      }

      console.log(`\nRunning ${migration}...`);
      const result = spawnSync(process.execPath, [join(__dirname, migration)], {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
      });

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0) {
        const failure = new Error(`Migration failed: ${migration}`);
        failure.exitCode = result.status ?? 1;
        throw failure;
      }

      await markRun(migration);
    }
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    await pool.end();
  }

  console.log('\nAll migrations completed.');
}

main().catch(async (err) => {
  console.error('Migration runner failed:', err);
  await pool.end().catch(() => {});
  process.exit(err.exitCode ?? 1);
});
