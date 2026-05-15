/**
 * Iwosan Innovation Hub — Express API Server
 * Runs on CPanel Node.js App at api.iwosaninnovationhub.com
 *
 * Local dev:  node server.js  (set PORT=3001 in .env.local)
 * Production: started automatically by CPanel Phusion Passenger
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createPublicKey } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Environment ───────────────────────────────────────────────────────────
// Load .env (CPanel) or .env.local (local dev) if present
for (const name of ['.env', '.env.local']) {
  try {
    const content = readFileSync(resolve(__dirname, name), 'utf-8');
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
  } catch { /* file not found — skip */ }
}

// ── Database ──────────────────────────────────────────────────────────────
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('Idle DB client error:', err);
      pool = null;
    });
  }
  return pool;
}

async function db(text, params) {
  const client = await getPool().connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    client.release();
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────
const COOKIE_NAME = 'iwosan_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

function getAuthUser(req) {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);
  return token ? verifyToken(token) : null;
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  // Shared across iwosaninnovationhub.com and api.iwosaninnovationhub.com
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOpts, maxAge: COOKIE_MAX_AGE_MS });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOpts);
}

// ── Password generator ────────────────────────────────────────────────────
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

// ── Rate limiter (login brute-force protection) ───────────────────────────
// In-memory store: max 10 attempts per IP per 15-minute window
const loginAttempts = new Map();

function rateLimitLogin(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 10;

  let record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }
  record.count++;
  loginAttempts.set(ip, record);

  if (record.count > MAX) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.',
    });
  }
  next();
}

// Purge expired rate-limit entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts) {
    if (now > record.resetAt) loginAttempts.delete(ip);
  }
}, 15 * 60 * 1000);

// ── App setup ─────────────────────────────────────────────────────────────
const app = express();

// Trust CPanel's reverse proxy (Passenger/Apache) so req.ip is the real client IP
app.set('trust proxy', 1);

// Remove the X-Powered-By: Express header
app.disable('x-powered-by');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://iwosaninnovationhub.com')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true, // Required for cross-origin cookies
  })
);

app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────
// All routes are prefixed with /api to match the frontend authService paths:
//   https://api.iwosaninnovationhub.com/api/auth/login
//   https://api.iwosaninnovationhub.com/api/auth/me  ... etc.

const router = express.Router();

// POST /api/auth/login
router.post('/auth/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const rows = await db(
      'SELECT id, email, password_hash, name, role, is_first_login, is_active FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );
    const user = rows[0];
    const valid = user && (await bcrypt.compare(String(password), user.password_hash));
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Azure AD org registry — keyed by the orgId the frontend sends
const AZURE_ORGS = {
  'iwosan-lagoon': {
    clientId: process.env.AZURE_ORG1_CLIENT_ID,
    tenantId: process.env.AZURE_ORG1_TENANT_ID,
  },
  'eurapharma': {
    clientId: process.env.AZURE_ORG2_CLIENT_ID,
    tenantId: process.env.AZURE_ORG2_TENANT_ID,
  },
  'iwosan-healthcare': {
    clientId: process.env.AZURE_ORG3_CLIENT_ID,
    tenantId: process.env.AZURE_ORG3_TENANT_ID,
  },
};

// POST /api/auth/azure  — validate Microsoft ID token and issue session
router.post('/auth/azure', async (req, res) => {
  const { idToken, orgId } = req.body ?? {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'ID token is required' });
  }
  if (!orgId || !(orgId in AZURE_ORGS)) {
    return res.status(400).json({ error: 'Unknown organisation' });
  }

  const { clientId, tenantId } = AZURE_ORGS[orgId];
  if (!clientId || !tenantId) {
    console.error(`Azure: org "${orgId}" is missing CLIENT_ID or TENANT_ID env vars`);
    return res.status(500).json({ error: 'Organisation is not configured for Microsoft sign-in' });
  }

  try {
    // 1. Decode the token header to get the signing key ID
    const parts = idToken.split('.');
    if (parts.length !== 3) return res.status(401).json({ error: 'Invalid token format' });
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));

    // 2. Fetch Microsoft's public signing keys for this tenant
    const jwksRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
    );
    if (!jwksRes.ok) throw new Error('Failed to fetch Microsoft signing keys');
    const { keys } = await jwksRes.json();
    const jwk = keys.find((k) => k.kid === header.kid && k.use === 'sig');
    if (!jwk) return res.status(401).json({ error: 'Token signing key not recognized' });

    // 3. Convert JWK → Node KeyObject and verify signature + standard claims
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    });

    // 4. Extract identity — preferred_username is the UPN (email) in Azure AD tokens
    const email = (payload.preferred_username || payload.email || '').toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    if (!email) return res.status(401).json({ error: 'Could not read email from Microsoft token' });

    // 5. Find or auto-create the user
    let rows = await db(
      'SELECT id, email, name, role, is_first_login, is_active FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      rows = await db(
        `INSERT INTO users (email, name, password_hash, role, is_first_login, is_active)
         VALUES ($1, $2, $3, 'user', false, true)
         RETURNING id, email, name, role, is_first_login, is_active`,
        [email, name, unusableHash]
      );
      console.log(`Azure [${orgId}]: auto-created user ${email}`);
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
    }

    // 6. Issue our standard JWT session cookie
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Microsoft token is invalid or expired. Please sign in again.' });
    }
    console.error(`Azure login error [${orgId}]:`, err);
    return res.status(500).json({ error: 'Microsoft sign-in failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/auth/me', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await db(
      'SELECT id, email, name, role, is_first_login, is_active FROM users WHERE id = $1',
      [authUser.userId]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'User not found' });
    if (!u.is_active) return res.status(403).json({ error: 'Account deactivated' });
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isFirstLogin: u.is_first_login,
        isActive: u.is_active,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/auth/change-password', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { newPassword, confirmPassword } = req.body ?? {};
  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation are required' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const hash = await bcrypt.hash(String(newPassword), 12);
    await db(
      'UPDATE users SET password_hash = $1, is_first_login = false, updated_at = NOW() WHERE id = $2',
      [hash, authUser.userId]
    );
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/create-user  (admin only)
router.post('/admin/create-user', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, name, role = 'user' } = req.body ?? {};
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }
  const validRoles = ['admin', 'user', 'manager'];
  if (!validRoles.includes(String(role))) {
    return res.status(400).json({ error: 'Role must be: admin, user, or manager' });
  }

  try {
    const existing = await db('SELECT id FROM users WHERE email = $1', [
      String(email).toLowerCase().trim(),
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const plainPassword = generatePassword();
    const hash = await bcrypt.hash(plainPassword, 12);

    const rows = await db(
      `INSERT INTO users (email, name, password_hash, role, is_first_login)
       VALUES ($1, $2, $3, $4, true) RETURNING id, email`,
      [String(email).toLowerCase().trim(), String(name).trim(), hash, String(role)]
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: { id: rows[0].id, email: rows[0].email, name: String(name).trim(), role: String(role) },
      temporaryPassword: plainPassword,
      note: 'Share this password securely. It will not be shown again.',
    });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/reset-password  (admin only)
router.post('/admin/users/:id/reset-password', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  try {
    const existing = await db('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    const plainPassword = generatePassword();
    const hash = await bcrypt.hash(plainPassword, 12);
    await db(
      'UPDATE users SET password_hash = $1, is_first_login = true, updated_at = NOW() WHERE id = $2',
      [hash, userId]
    );

    return res.json({
      message: 'Password reset successfully',
      temporaryPassword: plainPassword,
      note: 'Share this password securely. The user will be prompted to change it on next login.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users  (admin only)
router.get('/admin/users', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const rows = await db(
      `SELECT id, email, name, role, is_first_login, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC`,
      []
    );
    return res.json({
      users: rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isFirstLogin: u.is_first_login,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
    });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id  (admin only) — update name, role, or isActive
router.patch('/admin/users/:id', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId === authUser.userId) {
    return res.status(400).json({ error: 'Cannot modify your own account via the admin panel' });
  }

  const { name, role, isActive } = req.body ?? {};
  const setClauses = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    params.push(String(name).trim());
  }
  if (role !== undefined) {
    const validRoles = ['admin', 'user', 'manager'];
    if (!validRoles.includes(String(role))) {
      return res.status(400).json({ error: 'Role must be: admin, user, or manager' });
    }
    setClauses.push(`role = $${idx++}`);
    params.push(String(role));
  }
  if (isActive !== undefined) {
    setClauses.push(`is_active = $${idx++}`);
    params.push(Boolean(isActive));
  }
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  setClauses.push('updated_at = NOW()');
  params.push(userId);

  try {
    const rows = await db(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING id, email, name, role, is_first_login, is_active`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isFirstLogin: u.is_first_login,
        isActive: u.is_active,
      },
    });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id  (admin only)
router.delete('/admin/users/:id', async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId === authUser.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const rows = await db('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /health  — ping to confirm the server is alive
router.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api', router);

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Iwosan API server running on port ${PORT}`);
  console.log(`  NODE_ENV      : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DB_HOST       : ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  COOKIE_DOMAIN : ${process.env.COOKIE_DOMAIN || '(none — local)'}`);
  console.log(`  Allowed origins: ${allowedOrigins.join(', ')}`);
});
