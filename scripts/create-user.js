/**
 * Create a new portal user with a generated temporary password.
 * Usage: node scripts/create-user.js --email <email> --name "<name>" [--role user|admin|manager]
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
} catch { /* use system env */ }

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const email = get('--email');
const name = get('--name');
const role = get('--role') || 'user';

if (!email || !name) {
  console.error('Usage: node scripts/create-user.js --email <email> --name "<Full Name>" [--role user|admin|manager]');
  process.exit(1);
}

const validRoles = ['admin', 'user', 'manager'];
if (!validRoles.includes(role)) {
  console.error(`Error: role must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
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
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      console.error(`Error: A user with email "${email}" already exists.`);
      process.exit(1);
    }

    const plainPwd = generatePassword();
    const hash = await bcrypt.hash(plainPwd, 12);

    await client.query(
      'INSERT INTO users (email, name, password_hash, role, is_first_login) VALUES ($1, $2, $3, $4, true)',
      [email.toLowerCase(), name, hash, role]
    );

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║         USER CREATED SUCCESSFULLY             ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║  Email:    ${email.padEnd(35)} ║`);
    console.log(`║  Name:     ${name.padEnd(35)} ║`);
    console.log(`║  Role:     ${role.padEnd(35)} ║`);
    console.log(`║  Password: ${plainPwd.padEnd(35)} ║`);
    console.log('╠═══════════════════════════════════════════════╣');
    console.log('║  Share this password securely. The user will  ║');
    console.log('║  be prompted to change it on first login.     ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
