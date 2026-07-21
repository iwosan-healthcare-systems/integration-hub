/**
 * Iwosan Integration Hub — Express API Server
 * Runs on AWS EC2 (Integration-Hub instance) at api.iwosaninnovationhub.com
 *
 * Local dev:  node server.js  (set PORT=3001 in .env.local)
 * Production: started via pm2 on the Integration-Hub EC2 instance
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createPublicKey } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Environment ───────────────────────────────────────────────────────────
// Load .env (production) or .env.local (local dev) if present
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
    pool = new Pool({
      ...poolConfig,
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

const isAdmin = (u) => u?.role === 'admin';
const isAdminOrManager = (u) => u?.role === 'admin' || u?.role === 'manager';
// CMS editor: admin, manager, OR any user explicitly granted CMS access
const isCmsEditor = (u) => u?.role === 'admin' || u?.role === 'manager' || u?.canEditCms === true;
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

// Middleware: decodes JWT then re-reads role + is_active from DB so stale tokens
// can't carry a promoted/deactivated state beyond what the DB says.
async function requireAuth(req, res, next) {
  const decoded = getAuthUser(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await db(
      'SELECT id, role, is_active, can_edit_cms FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows[0] || !rows[0].is_active)
      return res.status(403).json({ error: 'Account deactivated' });
    req.authUser = { ...decoded, role: rows[0].role, canEditCms: rows[0].can_edit_cms };
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
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
// Dual in-memory store: max 10 attempts per IP AND per email per 15-minute window.
// Email-based limit cannot be bypassed by rotating IPs.
const loginAttemptsIp = new Map();
const loginAttemptsEmail = new Map();

function rateLimitLogin(req, res, next) {
  const ip = req.ip || 'unknown';
  const email = String(req.body?.email || '').toLowerCase().trim();
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 10;

  const check = (map, key) => {
    let rec = map.get(key);
    if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + WINDOW_MS };
    rec.count++;
    map.set(key, rec);
    return rec;
  };

  const ipRec = check(loginAttemptsIp, ip);
  if (ipRec.count > MAX) {
    res.set('Retry-After', String(Math.ceil((ipRec.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  }

  if (email) {
    const emailRec = check(loginAttemptsEmail, email);
    if (emailRec.count > MAX) {
      res.set('Retry-After', String(Math.ceil((emailRec.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
    }
  }

  next();
}

// Purge expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, r] of loginAttemptsIp) if (now > r.resetAt) loginAttemptsIp.delete(k);
  for (const [k, r] of loginAttemptsEmail) if (now > r.resetAt) loginAttemptsEmail.delete(k);
}, 15 * 60 * 1000);

// ── App setup ─────────────────────────────────────────────────────────────
const app = express();

// Trust CPanel's reverse proxy (Passenger/Apache) so req.ip is the real client IP
app.set('trust proxy', 1);

// Remove the X-Powered-By: Express header
app.disable('x-powered-by');

// Security headers on all API responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://iwosaninnovationhub.com')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // Allow no-origin requests: Netlify's proxy forwards to Railway server-to-server
      // without an Origin header. Auth is enforced by httpOnly cookie, not CORS.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded images from the database at /uploads/*
// (not local disk — hosting platforms like Railway wipe local files on redeploy)
app.get('/uploads/:filename', async (req, res) => {
  try {
    const rows = await db('SELECT mime_type, data FROM cms_images WHERE id = $1', [req.params.filename]);
    if (rows.length === 0) return res.status(404).end();
    res.setHeader('Content-Type', rows[0].mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(rows[0].data);
  } catch (err) {
    console.error('Image fetch error:', err);
    return res.status(500).end();
  }
});

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
      'SELECT id, email, password_hash, name, role, is_first_login, is_active, auth_provider, can_edit_cms FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );
    const user = rows[0];
    const valid = user && (await bcrypt.compare(String(password), user.password_hash));
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.auth_provider === 'azure') {
      return res.status(403).json({ error: 'This account uses Microsoft sign-in. Please use the "Sign in with Microsoft" button.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    await db('UPDATE users SET last_sign_in_at = NOW() WHERE id = $1', [user.id]);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
        isActive: user.is_active,
        authProvider: user.auth_provider,
        canEditCms: user.can_edit_cms,
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
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
  },
  'iwosan-healthcare': {
    clientId: process.env.AZURE_HEALTHCARE_CLIENT_ID,
    tenantId: process.env.AZURE_HEALTHCARE_TENANT_ID,
  },
  'euracare': {
    clientId: process.env.AZURE_EURACARE_CLIENT_ID,
    tenantId: process.env.AZURE_EURACARE_TENANT_ID,
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
      'SELECT id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      rows = await db(
        `INSERT INTO users (email, name, password_hash, role, is_first_login, is_active, auth_provider)
         VALUES ($1, $2, $3, 'user', false, true, 'azure')
         RETURNING id, email, name, role, is_first_login, is_active, auth_provider`,
        [email, name, unusableHash]
      );
      console.log(`Azure [${orgId}]: auto-created user id=${rows[0].id}`);
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
    }

    await db('UPDATE users SET last_sign_in_at = NOW() WHERE id = $1', [user.id]);

    // 6. Issue our standard JWT session cookie
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
        isActive: user.is_active,
        authProvider: user.auth_provider,
        canEditCms: user.can_edit_cms,
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
      'SELECT id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms FROM users WHERE id = $1',
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
        authProvider: u.auth_provider,
        canEditCms: u.can_edit_cms,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/auth/change-password', requireAuth, async (req, res) => {
  const authUser = req.authUser;

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

// POST /api/admin/create-user  (admin + manager)
router.post('/admin/create-user', requireAuth, async (req, res) => {
  const authUser = req.authUser;
  if (!isAdminOrManager(authUser)) {
    return res.status(403).json({ error: 'Access required' });
  }

  const { email, name, role = 'user' } = req.body ?? {};
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }
  const validRoles = isAdmin(authUser) ? ['admin', 'user', 'manager'] : ['user', 'manager'];
  if (!validRoles.includes(String(role))) {
    return res.status(400).json({ error: isAdmin(authUser) ? 'Role must be: admin, user, or manager' : 'Managers can only create user or manager accounts' });
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
      `INSERT INTO users (email, name, password_hash, role, is_first_login, is_active)
       VALUES ($1, $2, $3, $4, true, true) RETURNING id, email`,
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

// POST /api/admin/users/:id/reset-password  (admin + manager)
router.post('/admin/users/:id/reset-password', requireAuth, async (req, res) => {
  const authUser = req.authUser;
  if (!isAdminOrManager(authUser)) {
    return res.status(403).json({ error: 'Access required' });
  }
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  try {
    const existing = await db('SELECT id, name, email, role, auth_provider FROM users WHERE id = $1', [userId]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
    if (!isAdmin(authUser) && existing[0].role === 'admin') {
      return res.status(403).json({ error: 'Managers cannot reset admin passwords' });
    }
    if (existing[0].auth_provider === 'azure') {
      return res.status(400).json({ error: 'This account uses Microsoft sign-in and does not have a password to reset.' });
    }

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

// GET /api/admin/users  (admin + manager)
router.get('/admin/users', requireAuth, async (req, res) => {
  const authUser = req.authUser;
  if (!isAdminOrManager(authUser)) {
    return res.status(403).json({ error: 'Access required' });
  }
  try {
    const rows = await db(
      `SELECT id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms, last_sign_in_at, created_at, updated_at
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
        authProvider: u.auth_provider,
        canEditCms: u.can_edit_cms,
        lastSignInAt: u.last_sign_in_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
    });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id  (admin + manager) — update name, role, or isActive
router.patch('/admin/users/:id', requireAuth, async (req, res) => {
  const authUser = req.authUser;
  if (!isAdminOrManager(authUser)) {
    return res.status(403).json({ error: 'Access required' });
  }
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId === authUser.userId) {
    return res.status(400).json({ error: 'Cannot modify your own account via the admin panel' });
  }

  const { name, role, isActive, canEditCms } = req.body ?? {};

  // Managers cannot touch admin accounts or promote anyone to admin
  if (!isAdmin(authUser)) {
    const target = await db('SELECT role FROM users WHERE id = $1', [userId]);
    if (target.length > 0 && target[0].role === 'admin') {
      return res.status(403).json({ error: 'Managers cannot modify admin accounts' });
    }
    if (role === 'admin') {
      return res.status(403).json({ error: 'Managers cannot assign the admin role' });
    }
  }
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
  if (canEditCms !== undefined) {
    if (!isAdmin(authUser)) {
      return res.status(403).json({ error: 'Only admins can change CMS access' });
    }
    setClauses.push(`can_edit_cms = $${idx++}`);
    params.push(Boolean(canEditCms));
  }
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  setClauses.push('updated_at = NOW()');
  params.push(userId);

  try {
    const rows = await db(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING id, email, name, role, is_first_login, is_active, can_edit_cms`,
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
        canEditCms: u.can_edit_cms,
      },
    });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id  (admin only)
router.delete('/admin/users/:id', requireAuth, async (req, res) => {
  const authUser = req.authUser;
  if (!isAdmin(authUser)) {
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

// ── AI Chat (Iwo assistant) ───────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are Iwo, the AI assistant for the Iwosan Integration Hub — a centralized digital platform for Iwosan Healthcare Systems Limited and its network of hospitals and healthcare platforms in Nigeria.

Your role is to help hub users find information about Iwosan Healthcare Systems, navigate the platform, and answer questions about services, leadership, history, and more. Always respond in a warm, professional tone that reflects Iwosan's values: empathetic, ethical, knowledge-driven, innovative, and accessible. Keep responses concise unless depth is needed.

━━━ ABOUT IWOSAN HEALTHCARE SYSTEMS ━━━

Full name: Iwosan Healthcare Systems Limited (rebranded from Iwosan Investments Limited in 2026)
Type: Healthcare holding company
Founded: 2019 (as Iwosan Investments Limited)
Co-founders: Fola Adeola (OFR, MNI) and Fola Laoye
Mission: Transform Nigeria into a global healthcare frontier by raising standards of healthcare delivery and management in line with global best practices, leveraging institutional partnerships, innovation, and investment.
Contact: +234 913 935 2779 | info@iwosanhealth.com | Lagos, Nigeria
Hub: iwosaninnovationhub.com
Network stats: 40+ years of combined excellence | 4 locations across Lagos | 1M+ patients served | 2,000+ healthcare staff

━━━ CORE VALUES (EKIA) ━━━

Empathetic — Understanding patients' needs and feelings; present at every step of recovery.
Ethical — Upholding the four pillars of medical ethics: Beneficence, Non-Maleficence, Autonomy, and Justice.
Knowledge-driven — Staying current with healthcare trends; continuous improvement to maintain excellence.
Innovative — Offering world-class services, adopting new technology, rewarding ingenuity.
Accessible — Friendly, welcoming, approachable, and reachable at all times.

━━━ SUBSIDIARIES ━━━

1. IWOSAN LAGOON HOSPITALS LIMITED
   Website: www.lagoonhospitals.com | Type: Premier multi-specialty hospital
   Specialty: Inpatient, outpatient, emergency, specialist care; Centre of Excellence for Cardiovascular Care
   Locations: Apapa, Ikeja, Victoria Island (Lagos)
   Key facts:
   - Founded 1986 in Apapa under Hygeia Group; acquired by Iwosan in 2021
   - First hospital in Sub-Saharan Africa to earn JCI Gold Seal of Approval (2011)
   - Achieved historic fifth consecutive JCI Gold Seal (November 2024)
   - Performed Nigeria's first open heart surgery (2014)
   - Launched 27-bed Centre of Excellence for Cardiovascular Care in Victoria Island (January 2024)
   - Over 111,000 outpatient consultations in 3 years at the Victoria Island branch
   - Partner of West African Stroke Initiative (WASI) for advanced neurointerventional treatments (April 2026)
   - Weekly health radio programme: "Your Health and You" on Classic FM 97.3, Tuesdays 5:30 PM

2. EURAPHARMA CARE SERVICES NIGERIA LIMITED (EURACARE)
   Website: www.euracarehealth.com | Type: Healthcare services and pharmaceutical care
   Specialty: Medical supply solutions, patient support, multi-specialist care
   Location: Victoria Island, Lagos
   Key facts: Acquired by Iwosan in March 2025

3. PAELON MEMORIAL HOSPITAL LIMITED
   Website: www.paelonmemorial.com | Type: Specialist hospital
   Specialty: Emergency care, maternal health, diagnostics, patient-centered clinical services
   Location: Lagos
   Key facts:
   - Acquired by Iwosan in November 2025
   - Focus areas: women's health, maternal care, emergency medicine
   - Active health education: HPV vaccination, cervical cancer prevention (Pap smear every 2–3 years)

4. IASO MEDIPARK LIMITED
   Website: www.iasomedipark.com | Type: Integrated multi-specialty medical campus
   Specialty: Hospital care, diagnostics, training, modern healthcare ecosystem
   Location: Ikoyi, Lagos
   Key facts:
   - 140-bed integrated multi-specialty campus
   - Groundbreaking by Governor Babajide Sanwo-Olu, December 2024
   - 20% of beds reserved for Lagos State's indigent population

━━━ SERVICES ACROSS THE NETWORK ━━━

Cardiology & Cardiovascular Care | Neurosurgery & Stroke Care | Oncology | Maternal & Child Health | Emergency Care | Diagnostics & Imaging | Telemedicine | Pharmaceutical Care | General & Specialist Outpatient Consultations | Medical Education & Training | Wellness Services

━━━ LEADERSHIP ━━━

Board of Directors:
- Fola Adeola, OFR, MNI — Co-Founder & Chairman
- Fola Laoye — Co-Founder & CEO
- Oladapo Oshinusi — Co-Founder & Board Member
- Prof. Nelson Oyesiku — Board Member
- Mrs Ibukun Awosika — Board Member
- Rotimi Akinde — Board Member
- Ademola Adeyemi-Bero — Board Member
- Otunba Bimbo Ashiru — Board Member

Management Team:
- Fola Laoye — Co-Founder & CEO
- Dr. Idowu Adebiyi — Group Head, Strategic Projects
- Isaiah Mukoro — Group Head, Finance
- Adetomi Olaobaju — Group Head, Legal, Risk & Compliance
- Dr. Oluborode Olawumi — Group Head, Quality & Sustainability
- Oluwafemi Oluwajimi — Group Head, HR & Culture

Medical Advisory Council:
- Prof. Nelson Oyesiku — Chairman | Dr. Ajibike Oyewumi — Member | Prof. Folasade Ogunsola — Member | Fola Laoye — Member | Dr. Kemi Babagbemi — Member

━━━ HISTORY & MILESTONES ━━━

1986 — Lagoon Hospitals founded in Apapa, Lagos (Hygeia Group)
2000 — Expanded to Ikeja
2002 — Opened Victoria Island (Idejo) branch
2011 — Opened Lagoon Specialists Suites (LSS); first JCI Gold Seal in Sub-Saharan Africa
2014 — Nigeria's first open heart surgery; JCI re-accreditation
2019 — Iwosan Investments Limited co-founded by Fola Laoye and Fola Adeola
2021 — Acquired Lagoon Hospitals; rebranded as Iwosan Lagoon Hospitals
2023 — Opened Iwosan Wellness Centre, Victoria Island
2024 — Launched 27-bed Cardiology Centre of Excellence; 5th consecutive JCI Gold Seal; IASO Medipark groundbreaking
2025 — Acquired Euracare (March); Acquired Paelon Memorial Hospital (November)
2026 — Rebranded as Iwosan Healthcare Systems Limited; expanded into Alaro City

━━━ THE IWOSAN INTEGRATION HUB ━━━

Centralized digital platform for the Iwosan network providing: unified space connecting all subsidiaries, tools and resources for healthcare staff, knowledge-sharing and collaboration, quick links to HR systems, IT support, subsidiary platforms, and news and updates from across the network.

━━━ RESPONSE GUIDELINES ━━━

- Be concise: 1–3 short paragraphs unless more detail is genuinely needed
- For specific medical questions or symptoms, advise consulting a qualified Iwosan healthcare professional
- For medical emergencies, direct immediately to the nearest Iwosan facility or emergency services
- If asked something outside this knowledge base, acknowledge honestly and direct to: info@iwosanhealth.com or +234 913 935 2779
- Never fabricate information, staff details, or medical advice
- You can suggest relevant hub pages: About, Our Platforms, Leadership, Resources, News`;

// POST /api/chat — streaming SSE endpoint for the Iwo AI assistant (Groq)
router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[chat] GROQ_API_KEY is not set');
    return res.status(503).json({ error: 'AI assistant is not configured on this server' });
  }

  const validMessages = messages
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.trim() }));

  if (validMessages.length === 0 || validMessages[validMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from the user' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    console.log('[chat] calling Groq for user:', req.authUser?.userId);

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          ...validMessages,
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[chat] Groq API error:', groqRes.status, errText);
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      return res.end();
    }

    console.log('[chat] Groq stream started');
    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          break;
        }
        try {
          const event = JSON.parse(data);
          const text = event.choices?.[0]?.delta?.content;
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch { /* skip malformed events */ }
      }
    }

    res.end();
  } catch (err) {
    console.error('Chat streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

// ── CMS helpers ───────────────────────────────────────────────────────────

function fmtDate(d) {
  // Format a JS Date or ISO string → "April 23, 2026"
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Reject any URL that is not http/https (prevents javascript: URI stored XSS)
function validateUrl(value) {
  return !value || /^https?:\/\//i.test(String(value));
}

// ── CMS: Image upload ─────────────────────────────────────────────────────

// POST /api/admin/cms/upload  — accepts { image: "data:<mime>;base64,<data>" }
router.post('/admin/cms/upload', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { image } = req.body ?? {};
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'image field is required' });

  const match = image.match(/^data:(image\/(jpeg|jpg|png|webp|gif));base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format. Supported: jpeg, png, webp, gif' });

  const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = mimeToExt[match[1]] ?? 'jpg';
  const base64Data = match[3];

  // Sanity-check size (~7.5 MB decoded limit)
  if (base64Data.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'Image too large. Max 7.5 MB.' });

  try {
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');
    await db('INSERT INTO cms_images (id, mime_type, data) VALUES ($1, $2, $3)', [filename, match[1], buffer]);
    return res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Failed to save image' });
  }
});

// ── CMS: News (public read, admin write) ──────────────────────────────────

// GET /api/news
router.get('/news', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, excerpt, content, date, category, featured, image, images, url, sort_order
       FROM news WHERE is_active = true ORDER BY date DESC`,
      []
    );
    return res.json({
      news: rows.map((r) => ({
        id: r.id,
        title: r.title,
        excerpt: r.excerpt,
        content: r.content,
        date: fmtDate(r.date),
        category: r.category,
        featured: r.featured,
        image: r.image,
        images: r.images ?? [],
        url: r.url,
        sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    console.error('GET /news error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/news
router.post('/admin/cms/news', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, excerpt = '', content = '', date, category, featured = false, image = '', images = [], url = '', sortOrder = 0 } = req.body ?? {};
  if (!title || !date || !category) return res.status(400).json({ error: 'title, date, and category are required' });
  if (!validateUrl(url)) return res.status(400).json({ error: 'url must be an http or https URL' });
  if (!Array.isArray(images) || !images.every((u) => typeof u === 'string')) return res.status(400).json({ error: 'images must be an array of strings' });
  try {
    const rows = await db(
      `INSERT INTO news (title, excerpt, content, date, category, featured, image, images, url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, excerpt, content, date, category, Boolean(featured), image, images, url, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      newsItem: { id: r.id, title: r.title, excerpt: r.excerpt, content: r.content, date: fmtDate(r.date), category: r.category, featured: r.featured, image: r.image, images: r.images ?? [], url: r.url, sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('POST /admin/cms/news error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/news/:id
router.patch('/admin/cms/news/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, excerpt, content, date, category, featured, image, images, url, sortOrder } = req.body ?? {};
  if (url !== undefined && !validateUrl(url)) return res.status(400).json({ error: 'url must be an http or https URL' });
  if (images !== undefined && (!Array.isArray(images) || !images.every((u) => typeof u === 'string'))) {
    return res.status(400).json({ error: 'images must be an array of strings' });
  }
  const set = []; const params = []; let i = 1;
  if (title !== undefined)     { set.push(`title=$${i++}`);       params.push(title); }
  if (excerpt !== undefined)   { set.push(`excerpt=$${i++}`);     params.push(excerpt); }
  if (content !== undefined)   { set.push(`content=$${i++}`);     params.push(content); }
  if (date !== undefined)      { set.push(`date=$${i++}`);        params.push(date); }
  if (category !== undefined)  { set.push(`category=$${i++}`);    params.push(category); }
  if (featured !== undefined)  { set.push(`featured=$${i++}`);    params.push(Boolean(featured)); }
  if (image !== undefined)     { set.push(`image=$${i++}`);       params.push(image); }
  if (images !== undefined)    { set.push(`images=$${i++}`);      params.push(images); }
  if (url !== undefined)       { set.push(`url=$${i++}`);         params.push(url); }
  if (sortOrder !== undefined) { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE news SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      newsItem: { id: r.id, title: r.title, excerpt: r.excerpt, content: r.content, date: fmtDate(r.date), category: r.category, featured: r.featured, image: r.image, images: r.images ?? [], url: r.url, sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('PATCH /admin/cms/news error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/news/:id
router.delete('/admin/cms/news/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE news SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/news error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CMS: Courses (public read, admin write) ───────────────────────────────

// GET /api/courses
router.get('/courses', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, description, category, level, duration, audience, modules, mandatory, course_url, sort_order
       FROM courses WHERE is_active = true ORDER BY sort_order ASC`,
      []
    );
    return res.json({
      courses: rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, category: r.category,
        level: r.level, duration: r.duration, audience: r.audience,
        modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    console.error('GET /courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/courses
router.post('/admin/cms/courses', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { id, title, description = '', category, level, duration, audience = '', modules = 1, mandatory = false, courseUrl = '', sortOrder = 0 } = req.body ?? {};
  if (!id || !title || !category || !level || !duration) return res.status(400).json({ error: 'id, title, category, level, and duration are required' });
  if (!validateUrl(courseUrl)) return res.status(400).json({ error: 'courseUrl must be an http or https URL' });
  try {
    const rows = await db(
      `INSERT INTO courses (id,title,description,category,level,duration,audience,modules,mandatory,course_url,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, title, description, category, level, duration, audience, Number(modules), Boolean(mandatory), courseUrl, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      course: { id: r.id, title: r.title, description: r.description, category: r.category, level: r.level, duration: r.duration, audience: r.audience, modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, sortOrder: r.sort_order },
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A course with this ID already exists' });
    console.error('POST /admin/cms/courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/courses/:id
router.patch('/admin/cms/courses/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const courseId = req.params.id;
  const { title, description, category, level, duration, audience, modules, mandatory, courseUrl, sortOrder } = req.body ?? {};
  if (courseUrl !== undefined && !validateUrl(courseUrl)) return res.status(400).json({ error: 'courseUrl must be an http or https URL' });
  const set = []; const params = []; let i = 1;
  if (title !== undefined)       { set.push(`title=$${i++}`);       params.push(title); }
  if (description !== undefined) { set.push(`description=$${i++}`); params.push(description); }
  if (category !== undefined)    { set.push(`category=$${i++}`);    params.push(category); }
  if (level !== undefined)       { set.push(`level=$${i++}`);       params.push(level); }
  if (duration !== undefined)    { set.push(`duration=$${i++}`);    params.push(duration); }
  if (audience !== undefined)    { set.push(`audience=$${i++}`);    params.push(audience); }
  if (modules !== undefined)     { set.push(`modules=$${i++}`);     params.push(Number(modules)); }
  if (mandatory !== undefined)   { set.push(`mandatory=$${i++}`);   params.push(Boolean(mandatory)); }
  if (courseUrl !== undefined)   { set.push(`course_url=$${i++}`);  params.push(courseUrl); }
  if (sortOrder !== undefined)   { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(courseId);
  try {
    const rows = await db(`UPDATE courses SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      course: { id: r.id, title: r.title, description: r.description, category: r.category, level: r.level, duration: r.duration, audience: r.audience, modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('PATCH /admin/cms/courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/courses/:id
router.delete('/admin/cms/courses/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const courseId = req.params.id;
  try {
    const rows = await db('UPDATE courses SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [courseId]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CMS: Learning Paths (public read, admin write) ────────────────────────

// GET /api/learning-paths
router.get('/learning-paths', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, description, audience, course_ids, total_duration, icon, sort_order
       FROM learning_paths WHERE is_active = true ORDER BY sort_order ASC`,
      []
    );
    return res.json({
      learningPaths: rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, audience: r.audience,
        courseIds: r.course_ids, totalDuration: r.total_duration, icon: r.icon, sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    console.error('GET /learning-paths error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/learning-paths
router.post('/admin/cms/learning-paths', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, description = '', audience = '', courseIds = [], totalDuration = '', icon = 'GraduationCap', sortOrder = 0 } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const rows = await db(
      `INSERT INTO learning_paths (title,description,audience,course_ids,total_duration,icon,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, audience, courseIds, totalDuration, icon, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      learningPath: { id: r.id, title: r.title, description: r.description, audience: r.audience, courseIds: r.course_ids, totalDuration: r.total_duration, icon: r.icon, sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('POST /admin/cms/learning-paths error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/learning-paths/:id
router.patch('/admin/cms/learning-paths/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, description, audience, courseIds, totalDuration, icon, sortOrder } = req.body ?? {};
  const set = []; const params = []; let i = 1;
  if (title !== undefined)         { set.push(`title=$${i++}`);          params.push(title); }
  if (description !== undefined)   { set.push(`description=$${i++}`);    params.push(description); }
  if (audience !== undefined)      { set.push(`audience=$${i++}`);       params.push(audience); }
  if (courseIds !== undefined)     { set.push(`course_ids=$${i++}`);     params.push(courseIds); }
  if (totalDuration !== undefined) { set.push(`total_duration=$${i++}`); params.push(totalDuration); }
  if (icon !== undefined)          { set.push(`icon=$${i++}`);           params.push(icon); }
  if (sortOrder !== undefined)     { set.push(`sort_order=$${i++}`);     params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE learning_paths SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      learningPath: { id: r.id, title: r.title, description: r.description, audience: r.audience, courseIds: r.course_ids, totalDuration: r.total_duration, icon: r.icon, sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('PATCH /admin/cms/learning-paths error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/learning-paths/:id
router.delete('/admin/cms/learning-paths/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE learning_paths SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/learning-paths error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CMS: Live Sessions (public read, admin write) ─────────────────────────

// GET /api/sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, session_date, session_time, format, venue, host, meeting_url
       FROM live_sessions WHERE is_active = true ORDER BY session_date ASC`,
      []
    );
    return res.json({
      sessions: rows.map((r) => ({
        id: r.id, title: r.title, date: fmtDate(r.session_date),
        time: r.session_time, format: r.format, venue: r.venue, host: r.host, meetingUrl: r.meeting_url,
      })),
    });
  } catch (err) {
    console.error('GET /sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/sessions
router.post('/admin/cms/sessions', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, date, time, format, venue = '', host = '', meetingUrl = '' } = req.body ?? {};
  if (!title || !date || !time || !format) return res.status(400).json({ error: 'title, date, time, and format are required' });
  const validFormats = ['Virtual', 'In-Person', 'Hybrid'];
  if (!validFormats.includes(format)) return res.status(400).json({ error: 'format must be Virtual, In-Person, or Hybrid' });
  if (!validateUrl(meetingUrl)) return res.status(400).json({ error: 'meetingUrl must be an http or https URL' });
  try {
    const rows = await db(
      `INSERT INTO live_sessions (title, session_date, session_time, format, venue, host, meeting_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, date, time, format, venue, host, meetingUrl]
    );
    const r = rows[0];
    return res.status(201).json({
      session: { id: r.id, title: r.title, date: fmtDate(r.session_date), time: r.session_time, format: r.format, venue: r.venue, host: r.host, meetingUrl: r.meeting_url },
    });
  } catch (err) {
    console.error('POST /admin/cms/sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/sessions/:id
router.patch('/admin/cms/sessions/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, date, time, format, venue, host, meetingUrl } = req.body ?? {};
  if (format !== undefined && !['Virtual','In-Person','Hybrid'].includes(format)) return res.status(400).json({ error: 'Invalid format' });
  if (meetingUrl !== undefined && !validateUrl(meetingUrl)) return res.status(400).json({ error: 'meetingUrl must be an http or https URL' });
  const set = []; const params = []; let i = 1;
  if (title !== undefined)      { set.push(`title=$${i++}`);        params.push(title); }
  if (date !== undefined)       { set.push(`session_date=$${i++}`); params.push(date); }
  if (time !== undefined)       { set.push(`session_time=$${i++}`); params.push(time); }
  if (format !== undefined)     { set.push(`format=$${i++}`);       params.push(format); }
  if (venue !== undefined)      { set.push(`venue=$${i++}`);        params.push(venue); }
  if (host !== undefined)       { set.push(`host=$${i++}`);         params.push(host); }
  if (meetingUrl !== undefined) { set.push(`meeting_url=$${i++}`);  params.push(meetingUrl); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE live_sessions SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      session: { id: r.id, title: r.title, date: fmtDate(r.session_date), time: r.session_time, format: r.format, venue: r.venue, host: r.host, meetingUrl: r.meeting_url },
    });
  } catch (err) {
    console.error('PATCH /admin/cms/sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/sessions/:id
router.delete('/admin/cms/sessions/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE live_sessions SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CMS: Picture Library (public read, admin write) ───────────────────────

// GET /api/picture-library
router.get('/picture-library', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, description, images, sort_order
       FROM picture_library WHERE is_active = true ORDER BY sort_order ASC, created_at DESC`,
      []
    );
    return res.json({
      pictures: rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, images: r.images ?? [], sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    console.error('GET /picture-library error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/picture-library
router.post('/admin/cms/picture-library', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, description = '', images = [], sortOrder = 0 } = req.body ?? {};
  if (!Array.isArray(images) || !images.every((u) => typeof u === 'string')) return res.status(400).json({ error: 'images must be an array of strings' });
  if (!title || images.length === 0) return res.status(400).json({ error: 'title and at least one image are required' });
  try {
    const rows = await db(
      `INSERT INTO picture_library (title, description, images, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, description, images, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      picture: { id: r.id, title: r.title, description: r.description, images: r.images ?? [], sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('POST /admin/cms/picture-library error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/picture-library/:id
router.patch('/admin/cms/picture-library/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, description, images, sortOrder } = req.body ?? {};
  if (images !== undefined && (!Array.isArray(images) || !images.every((u) => typeof u === 'string'))) {
    return res.status(400).json({ error: 'images must be an array of strings' });
  }
  const set = []; const params = []; let i = 1;
  if (title !== undefined)       { set.push(`title=$${i++}`);       params.push(title); }
  if (description !== undefined) { set.push(`description=$${i++}`); params.push(description); }
  if (images !== undefined)      { set.push(`images=$${i++}`);      params.push(images); }
  if (sortOrder !== undefined)   { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE picture_library SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      picture: { id: r.id, title: r.title, description: r.description, images: r.images ?? [], sortOrder: r.sort_order },
    });
  } catch (err) {
    console.error('PATCH /admin/cms/picture-library error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/picture-library/:id
router.delete('/admin/cms/picture-library/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE picture_library SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/picture-library error:', err);
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
