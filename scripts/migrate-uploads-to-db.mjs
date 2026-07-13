/**
 * One-off migration: find CMS-uploaded images referenced in the `news` table
 * that point at the old disk-based /uploads/* route, try to recover the
 * actual file from the live server, and store it in the new `cms_images`
 * table (see schema.sql) so it survives future redeploys.
 *
 * Run against the PRODUCTION database:
 *   DATABASE_URL=postgres://...  node scripts/migrate-uploads-to-db.mjs
 *
 * Optional: point at a different API host to fetch the original files from
 * (defaults to https://api.iwosaninnovationhub.com):
 *   API_BASE_URL=https://api.iwosaninnovationhub.com DATABASE_URL=... node scripts/migrate-uploads-to-db.mjs
 *
 * Safe to re-run — already-migrated images are skipped (ON CONFLICT DO NOTHING).
 * This script only touches rows whose `image` contains "/uploads/"; external
 * image URLs (news items linking to other sites' CDNs) are left untouched.
 */
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required. Example:\n   DATABASE_URL=postgres://... node scripts/migrate-uploads-to-db.mjs');
  process.exit(1);
}

const API_BASE = (process.env.API_BASE_URL ?? 'https://api.iwosaninnovationhub.com').replace(/\/$/, '');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
});

const extToMime = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

async function main() {
  const client = await pool.connect();
  console.log(`✓ Connected to database`);
  console.log(`✓ Fetching original files from ${API_BASE}\n`);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_images (
        id          TEXT        PRIMARY KEY,
        mime_type   TEXT        NOT NULL,
        data        BYTEA       NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Only match filenames our own upload endpoint generates
    // (`${Date.now()}-${randomBytes(6).toString('hex')}.<ext>`, e.g.
    // "1783161291695-26fa6d0ce470.jpg"). A plain "%/uploads/%" LIKE match is
    // too broad — it also catches external URLs like WordPress media paths
    // (".../wp-content/uploads/2026/04/foo.webp") that were never uploaded
    // through this app's CMS.
    const { rows } = await client.query(
      `SELECT id, title, image FROM news
       WHERE image ~ '/uploads/[0-9]{10,}-[0-9a-f]{12}\\.[a-zA-Z]+$'
       ORDER BY id`
    );

    if (rows.length === 0) {
      console.log('No self-hosted /uploads/ images found in the news table. Nothing to migrate.');
      return;
    }

    console.log(`Found ${rows.length} news item(s) with a self-hosted image:\n`);

    const recovered = [];
    const broken = [];

    for (const row of rows) {
      const filename = row.image.split('/uploads/').pop().split(/[?#]/)[0];
      const ext = filename.split('.').pop().toLowerCase();
      const mimeType = extToMime[ext] ?? 'application/octet-stream';
      const fetchUrl = `${API_BASE}/uploads/${filename}`;

      process.stdout.write(`  #${row.id} "${row.title}" — ${filename} ... `);

      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          console.log(`NOT FOUND (HTTP ${res.status})`);
          broken.push(row);
          continue;
        }
        const buffer = Buffer.from(await res.arrayBuffer());

        await client.query(
          `INSERT INTO cms_images (id, mime_type, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
          [filename, mimeType, buffer]
        );

        const canonicalUrl = `${API_BASE}/uploads/${filename}`;
        if (row.image !== canonicalUrl) {
          await client.query(`UPDATE news SET image = $1 WHERE id = $2`, [canonicalUrl, row.id]);
        }

        console.log(`OK (${(buffer.length / 1024).toFixed(0)} KB)`);
        recovered.push(row);
      } catch (err) {
        console.log(`ERROR (${err.message})`);
        broken.push(row);
      }
    }

    console.log(`\n─────────────────────────────────────────`);
    console.log(`Recovered and migrated: ${recovered.length}`);
    console.log(`Still broken (need manual re-upload via CMS): ${broken.length}`);
    if (broken.length > 0) {
      console.log('\nBroken items:');
      for (const row of broken) console.log(`  #${row.id} "${row.title}"`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
