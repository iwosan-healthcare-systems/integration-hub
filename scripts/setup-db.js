/**
 * Run once to create the database tables and initial admin user.
 * Usage: node scripts/setup-db.js
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) {
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
  console.log('✓ Loaded .env.local');
} catch {
  console.log('Note: .env.local not found — using system environment variables.');
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%!';
  const chars = upper + lower + digits + special;
  const bytes = randomBytes(16);
  let pwd =
    upper[bytes[0] % upper.length] +
    lower[bytes[1] % lower.length] +
    digits[bytes[2] % digits.length] +
    special[bytes[3] % special.length];
  for (let i = 4; i < 12; i++) pwd += chars[bytes[i] % chars.length];
  const arr = pwd.split('');
  const sb = randomBytes(arr.length);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = sb[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

async function main() {
  const client = await pool.connect();
  console.log('✓ Connected to PostgreSQL');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name          VARCHAR(255) NOT NULL,
        role          VARCHAR(50)  NOT NULL DEFAULT 'user',
        is_first_login BOOLEAN     NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ users table ready');

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`
    );
    console.log('✓ Email index ready');

    const existing = await client.query(
      `SELECT id FROM users WHERE email = 'admin@iwosaninnovationhub.com'`
    );

    if (existing.rows.length === 0) {
      const plainPwd = generatePassword();
      const hash = await bcrypt.hash(plainPwd, 12);
      await client.query(
        `INSERT INTO users (email, name, password_hash, role, is_first_login)
         VALUES ('admin@iwosaninnovationhub.com', 'Administrator', $1, 'admin', true)`,
        [hash]
      );

      console.log('\n╔═══════════════════════════════════════════════╗');
      console.log('║   INITIAL ADMIN CREDENTIALS  (save these!)   ║');
      console.log('╠═══════════════════════════════════════════════╣');
      console.log(`║  Email:    admin@iwosaninnovationhub.com       ║`);
      console.log(`║  Password: ${plainPwd.padEnd(35)} ║`);
      console.log('╠═══════════════════════════════════════════════╣');
      console.log('║  You will be prompted to change the password  ║');
      console.log('║  on first login.                              ║');
      console.log('╚═══════════════════════════════════════════════╝\n');
    } else {
      console.log('ℹ  Admin user already exists — skipped.');
    }

    console.log('✅ Database setup complete!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  console.error('   Make sure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are set in .env.local');
  process.exit(1);
});
