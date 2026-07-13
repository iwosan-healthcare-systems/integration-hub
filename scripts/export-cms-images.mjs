/**
 * Backup: download every image stored in the `cms_images` table to local
 * disk, so there's an offline copy independent of the database.
 *
 * Run against the PRODUCTION database:
 *   DATABASE_URL=postgres://...  node scripts/export-cms-images.mjs
 *
 * Optional: choose where files are written (defaults to
 * ./cms-images-backup/<today's date>/):
 *   OUTPUT_DIR=./my-backup-folder DATABASE_URL=... node scripts/export-cms-images.mjs
 */
import pg from 'pg';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required. Example:\n   DATABASE_URL=postgres://... node scripts/export-cms-images.mjs');
  process.exit(1);
}

const today = new Date().toISOString().split('T')[0];
const OUTPUT_DIR = resolve(process.env.OUTPUT_DIR ?? `./cms-images-backup/${today}`);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  console.log(`✓ Connected to database`);

  try {
    const { rows } = await client.query(
      `SELECT id, mime_type, data, created_at FROM cms_images ORDER BY created_at`
    );

    if (rows.length === 0) {
      console.log('No images found in cms_images. Nothing to export.');
      return;
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Writing ${rows.length} image(s) to ${OUTPUT_DIR}\n`);

    for (const row of rows) {
      const filePath = resolve(OUTPUT_DIR, row.id);
      await writeFile(filePath, row.data);
      console.log(`  ${row.id} (${(row.data.length / 1024).toFixed(0)} KB, ${row.mime_type})`);
    }

    console.log(`\n─────────────────────────────────────────`);
    console.log(`Exported ${rows.length} image(s) to ${OUTPUT_DIR}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Export failed:', err.message);
  process.exit(1);
});
