/**
 * Adds optional scoring support to CMS assessments.
 *
 * Safe to run more than once.
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
  console.log('Adding cms_forms.scoring_enabled...');
  await pool.query('ALTER TABLE cms_forms ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN NOT NULL DEFAULT false');

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
