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
import JSZip from 'jszip';
import { randomBytes, createPublicKey } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// ── S3 (Video Library) ───────────────────────────────────────────────────
// Video files live in S3, not the DB — see AWS_REGION/S3_BUCKET/
// S3_VIDEO_PREFIX env vars. The `videos` table only holds metadata + the
// S3 key; playback and upload both go through short-lived presigned URLs
// (the bucket blocks all public access).
let s3Client = null;
function getS3() {
  if (!s3Client) s3Client = new S3Client({ region: process.env.AWS_REGION });
  return s3Client;
}
const S3_BUCKET = process.env.S3_BUCKET;
const S3_VIDEO_PREFIX = process.env.S3_VIDEO_PREFIX || 'videos/';
const ALLOWED_VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

function mapVideoRow(r) {
  return {
    id: r.id, albumId: r.album_id, title: r.title, description: r.description, thumbnail: r.thumbnail,
    duration: r.duration, fileSize: Number(r.file_size), sortOrder: r.sort_order,
  };
}

function mapAlbumRow(r, videos = []) {
  return { id: r.id, title: r.title, description: r.description, sortOrder: r.sort_order, videos };
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
      'SELECT id, role, is_active, can_edit_cms, entity FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows[0] || !rows[0].is_active)
      return res.status(403).json({ error: 'Account deactivated' });
    req.authUser = { ...decoded, role: rows[0].role, canEditCms: rows[0].can_edit_cms, entity: rows[0].entity };
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

app.use(express.json({ limit: '30mb' }));
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
      'SELECT id, email, password_hash, name, role, is_first_login, is_active, auth_provider, can_edit_cms, entity FROM users WHERE email = $1',
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
        entity: user.entity,
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

// Real organisations a user can belong to. The 3 with Azure SSO reuse their
// AZURE_ORGS key as the entity value, so a user's entity is set directly from
// the org they authenticate through. Paelon Memorial has no Azure app
// registration yet, so its users are local accounts with entity assigned
// manually.
const ENTITIES = {
  'iwosan-lagoon': 'Lagoon Hospitals',
  'euracare': 'Euracare',
  'paelon-memorial': 'Paelon Memorial',
  'iwosan-healthcare': 'Iwosan Healthcare Systems',
};
const GENERAL_ENTITY = 'general';
const CONTENT_ENTITIES = {
  [GENERAL_ENTITY]: 'General',
  ...ENTITIES,
};
const IWOSAN_HEALTHCARE_ENTITY = 'iwosan-healthcare';
const IWOSAN_HEALTHCARE_EMAIL_DOMAIN = '@iwosanhealth.com';

function hasIwosanHealthcareEmail(user) {
  const email = String(user?.email ?? '').toLowerCase().trim();
  return email.endsWith(IWOSAN_HEALTHCARE_EMAIL_DOMAIN);
}

function canSeeAllContent(user) {
  return isCmsEditor(user) || hasIwosanHealthcareEmail(user);
}

function getContentVisibilityEntity(user) {
  if (hasIwosanHealthcareEmail(user)) return IWOSAN_HEALTHCARE_ENTITY;
  return user?.entity ?? null;
}

// The root seed admin is a super-admin account, not tied to any one
// subsidiary — it must never carry an entity value, regardless of what's
// passed to the create/update user routes.
const ENTITY_EXEMPT_EMAILS = new Set(['admin@iwosaninnovationhub.com']);

// In-memory cache of Microsoft's public signing keys, per tenant. Without
// this, every single Azure login made a live network call to Microsoft's
// discovery endpoint on the hot path — any transient blip there (slow DNS,
// a cold outbound connection right after a deploy, etc.) failed the whole
// login. Keys rotate rarely, so a long TTL is safe, and a stale cache is
// still served if a refresh fails rather than failing the login outright.
const JWKS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const jwksCache = new Map(); // tenantId -> { keys, fetchedAt }

async function getMicrosoftSigningKeys(tenantId) {
  const cached = jwksCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL_MS) return cached.keys;

  try {
    const jwksRes = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
    if (!jwksRes.ok) throw new Error(`Microsoft signing keys request failed (${jwksRes.status})`);
    const { keys } = await jwksRes.json();
    jwksCache.set(tenantId, { keys, fetchedAt: Date.now() });
    return keys;
  } catch (err) {
    if (cached) return cached.keys; // serve stale keys rather than fail the login
    throw err;
  }
}

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

    // 2. Fetch (or reuse cached) Microsoft public signing keys for this tenant
    let keys = await getMicrosoftSigningKeys(tenantId);
    let jwk = keys.find((k) => k.kid === header.kid && k.use === 'sig');
    if (!jwk) {
      // Not found — could be a genuine key rotation. Force one fresh fetch
      // before giving up, rather than failing on a stale cache alone.
      jwksCache.delete(tenantId);
      keys = await getMicrosoftSigningKeys(tenantId);
      jwk = keys.find((k) => k.kid === header.kid && k.use === 'sig');
    }
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
        `INSERT INTO users (email, name, password_hash, role, is_first_login, is_active, auth_provider, entity)
         VALUES ($1, $2, $3, 'user', false, true, 'azure', $4)
         RETURNING id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms, entity`,
        [email, name, unusableHash, orgId]
      );
      console.log(`Azure [${orgId}]: auto-created user id=${rows[0].id}`);
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
    }

    // Keep entity in sync with whichever org they're signing in through —
    // self-heals accounts created before entity scoping existed.
    await db('UPDATE users SET last_sign_in_at = NOW(), entity = $2 WHERE id = $1', [user.id, orgId]);

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
        entity: orgId,
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
      'SELECT id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms, entity FROM users WHERE id = $1',
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
        entity: u.entity,
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

  const { email, name, role = 'user', entity: rawEntity = null } = req.body ?? {};
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }
  const validRoles = isAdmin(authUser) ? ['admin', 'user', 'manager'] : ['user', 'manager'];
  if (!validRoles.includes(String(role))) {
    return res.status(400).json({ error: isAdmin(authUser) ? 'Role must be: admin, user, or manager' : 'Managers can only create user or manager accounts' });
  }
  const entity = ENTITY_EXEMPT_EMAILS.has(String(email).toLowerCase().trim()) ? null : rawEntity;
  if (entity !== null && !(entity in ENTITIES)) {
    return res.status(400).json({ error: 'Invalid entity' });
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
      `INSERT INTO users (email, name, password_hash, role, is_first_login, is_active, entity)
       VALUES ($1, $2, $3, $4, true, true, $5) RETURNING id, email`,
      [String(email).toLowerCase().trim(), String(name).trim(), hash, String(role), entity]
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: { id: rows[0].id, email: rows[0].email, name: String(name).trim(), role: String(role), entity },
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
      `SELECT id, email, name, role, is_first_login, is_active, auth_provider, can_edit_cms, entity, last_sign_in_at, created_at, updated_at
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
        entity: u.entity,
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

  const { name, role, isActive, canEditCms, entity } = req.body ?? {};

  const targetRows = await db('SELECT email, role FROM users WHERE id = $1', [userId]);
  const targetEmail = targetRows[0]?.email;

  // Managers cannot touch admin accounts or promote anyone to admin
  if (!isAdmin(authUser)) {
    if (targetRows.length > 0 && targetRows[0].role === 'admin') {
      return res.status(403).json({ error: 'Managers cannot modify admin accounts' });
    }
    if (role === 'admin') {
      return res.status(403).json({ error: 'Managers cannot assign the admin role' });
    }
  }
  if (entity !== undefined && entity !== null && targetEmail && ENTITY_EXEMPT_EMAILS.has(targetEmail)) {
    return res.status(400).json({ error: 'This account is not tied to any entity' });
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
  if (entity !== undefined) {
    if (entity !== null && !(entity in ENTITIES)) {
      return res.status(400).json({ error: 'Invalid entity' });
    }
    setClauses.push(`entity = $${idx++}`);
    params.push(entity);
  }
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  setClauses.push('updated_at = NOW()');
  params.push(userId);

  try {
    const rows = await db(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING id, email, name, role, is_first_login, is_active, can_edit_cms, entity`,
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
        entity: u.entity,
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

// ── AI Chat (Ivy assistant) ───────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are Ivy, the AI assistant for the Iwosan Integration Hub — a centralized digital platform for Iwosan Healthcare Systems Limited and its network of hospitals and healthcare platforms in Nigeria.

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

━━━ IT SUPPORT & PORTAL ACCESS (per subsidiary) ━━━

Iwosan Lagoon Hospitals — IT support: itsupport@lagoonhospitals.com (Mon–Fri, 8am–6pm) | Webmail: mail.lagoonhospitals.com | HR Portal: hrportal.lagoonhospitals.com | EMR: available, ask IT support for the internal link
Eurapharma Care Services (Euracare) — IT support: itsupport@euracarehealth.com (Mon–Fri, 8am–6pm) | Mail: Outlook 365 (outlook.office365.com/mail) | HR Portal: not available | EMR: available, ask IT support for the internal link
Paelon Memorial Hospital — IT support: itsupport@paelonmemorial.com (Mon–Fri, 8am–6pm) | Webmail: webmail.paelonmemorial.com | HR Portal: not available | EMR: paelon.instanta.app
IASO Medipark — IT support: itsupport@iasomedipark.com (Mon–Fri, 8am–6pm) | Mail: Outlook 365 (outlook.office365.com/mail) | HR Portal: not available | EMR: not yet available

For exact/internal-network EMR links, direct users to their subsidiary's IT support rather than guessing — those can change and are network-restricted.

━━━ RESOURCES & KNOWLEDGE ━━━

SOPs, process guidance, and subsidiary-specific procedure files are hosted in a shared SharePoint folder, linked directly from the Resources & Knowledge page on the hub.

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

Centralized digital platform for the Iwosan network. Pages available to hub users:
- Home — overview and latest highlights
- About Iwosan — mission, core values, milestones
- Subsidiaries — directory of the five network platforms, with per-subsidiary detail pages
- News & Updates — announcements and articles from across the network
- Leadership — board of directors, management team, medical advisory council
- Resources & Knowledge — policies, SOPs, and reference documents
- Learning Centre — courses, learning paths, and live/virtual training sessions
- Picture Library — photo galleries from events and facilities across the network
- Video Library — training and event videos, organized into albums or standalone; News articles and Courses can also carry their own uploaded video

Staff with the right permissions can also manage this content directly through an admin/CMS panel (news, courses, learning paths, sessions, picture library, video library).

━━━ RESPONSE GUIDELINES ━━━

- Be concise: 1–3 short paragraphs unless more detail is genuinely needed
- For specific medical questions or symptoms, advise consulting a qualified Iwosan healthcare professional
- For medical emergencies, direct immediately to the nearest Iwosan facility or emergency services
- If asked something outside this knowledge base, acknowledge honestly and direct to: info@iwosanhealth.com or +234 913 935 2779
- Never fabricate information, staff details, or medical advice
- A "CURRENT HUB CONTENT" section may be appended below with live news, courses, and sessions pulled fresh from the database — when present, treat it as authoritative and current over anything you might otherwise assume; if it's absent or doesn't cover what's asked, say you don't have that specific detail rather than guessing
- When pointing someone to a hub page, write it as a markdown link using ONLY these exact paths — never invent a path: [Home](/), [About Iwosan](/about), [Subsidiaries](/subsidiaries), [News & Updates](/news), [Leadership](/leadership), [Resources & Knowledge](/resources), [Learning Centre](/learning), [Picture Library](/picture-library), [Video Library](/videos)`;

// Fresh news/courses/sessions/library content, rebuilt from the DB and
// appended to Ivy's system prompt on each chat request — this is what lets
// her answer accurately about actual site content without anyone having to
// hand-edit CHAT_SYSTEM_PROMPT every time an article or course is added.
// Cached briefly (keyed by session-visibility scope) so a back-and-forth
// conversation doesn't re-query the DB on every single message.
const contentDigestCache = new Map();
const CONTENT_DIGEST_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getLiveContentDigest(authUser) {
  const seesAllSessions = canSeeAllContent(authUser);
  const visibilityEntity = getContentVisibilityEntity(authUser);
  const cacheKey = seesAllSessions ? '__all__' : (visibilityEntity ?? '__general__');
  const cached = contentDigestCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.text;

  try {
    const [news, courses, sessions, videoAlbums, videoCountRows, pictures] = await Promise.all([
      db(`SELECT title, excerpt, date, category FROM news WHERE is_active = true ORDER BY date DESC LIMIT 5`, []),
      db(`SELECT title, category, level, duration, mandatory FROM courses WHERE is_active = true ORDER BY sort_order ASC`, []),
      db(
        seesAllSessions
          ? `SELECT title, session_date, session_time, format, venue FROM live_sessions
             WHERE is_active = true AND session_date >= CURRENT_DATE ORDER BY session_date ASC LIMIT 8`
          : `SELECT title, session_date, session_time, format, venue FROM live_sessions
             WHERE is_active = true AND session_date >= CURRENT_DATE AND ($1 = ANY(entities) OR $2 = ANY(entities))
             ORDER BY session_date ASC LIMIT 8`,
        seesAllSessions ? [] : [visibilityEntity, GENERAL_ENTITY]
      ),
      db(`SELECT title FROM video_albums WHERE is_active = true ORDER BY sort_order ASC LIMIT 10`, []),
      db(`SELECT COUNT(*)::int AS count FROM videos WHERE is_active = true`, []),
      db(`SELECT title FROM picture_library WHERE is_active = true ORDER BY sort_order ASC LIMIT 10`, []),
    ]);

    const lines = [
      '━━━ CURRENT HUB CONTENT (live — pulled just now, treat as authoritative) ━━━',
      '',
      `Recent News${news.length ? ` (${news.length} most recent):` : ':'}`,
      ...(news.length
        ? news.map((n) => `- "${n.title}" (${n.category}, ${fmtDate(n.date)}) — ${n.excerpt}`)
        : ['- No published articles yet.']),
      '',
      `Courses${courses.length ? ` (${courses.length} total):` : ':'}`,
      ...(courses.length
        ? courses.map((c) => `- ${c.title} — ${c.category}, ${c.level}, ${c.duration}${c.mandatory ? ', MANDATORY' : ''}`)
        : ['- No courses published yet.']),
      '',
      `Upcoming Live Sessions${sessions.length ? ` (${sessions.length} shown):` : ':'}`,
      ...(sessions.length
        ? sessions.map((s) => `- ${s.title} — ${fmtDate(s.session_date)} ${s.session_time}, ${s.format}${s.venue ? `, ${s.venue}` : ''}`)
        : ['- None scheduled right now.']),
      '',
      `Video Library: ${videoCountRows[0]?.count ?? 0} video(s) across ${videoAlbums.length} album(s)${videoAlbums.length ? ' — ' + videoAlbums.map((a) => a.title).join(', ') : ''}.`,
      `Picture Library: ${pictures.length} album(s)${pictures.length ? ' — ' + pictures.map((p) => p.title).join(', ') : ''}.`,
    ];

    const text = lines.join('\n');
    contentDigestCache.set(cacheKey, { text, expiresAt: Date.now() + CONTENT_DIGEST_TTL_MS });
    return text;
  } catch (err) {
    console.error('[chat] Failed to build live content digest:', err);
    return cached?.text ?? '';
  }
}

// POST /api/chat — streaming SSE endpoint for the Ivy AI assistant (Groq)
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

    const liveDigest = await getLiveContentDigest(req.authUser);
    const systemContent = liveDigest ? `${CHAT_SYSTEM_PROMPT}\n\n${liveDigest}` : CHAT_SYSTEM_PROMPT;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: systemContent },
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

// ── AI Assist (CMS title/description generation, same Groq key as Ivy) ─────
// One generic endpoint used by an "AI assist" button across the CMS forms —
// keyed by contentType.field so prompt phrasing/length can be tuned per
// field without a separate route for each content type.
const AI_ASSIST_FIELDS = {
  'news.title':               { label: 'a news article title', maxWords: 12 },
  'news.excerpt':              { label: 'a short news article excerpt/summary', maxWords: 40 },
  'news.content':               { label: 'a full news article body, written as 3-4 short paragraphs separated by blank lines', maxWords: 250 },
  'course.title':               { label: 'a staff training course title', maxWords: 10 },
  'course.description':         { label: 'a staff training course description', maxWords: 45 },
  'video.title':                 { label: 'a video title', maxWords: 10 },
  'video.description':           { label: 'a video description', maxWords: 40 },
  'video-album.title':           { label: 'a video album title', maxWords: 10 },
  'video-album.description':     { label: 'a video album description', maxWords: 40 },
  'picture-album.title':         { label: 'a photo album title', maxWords: 10 },
  'picture-album.description':   { label: 'a photo album description', maxWords: 40 },
};

const AI_ASSIST_SYSTEM_PROMPT = `You are a concise, professional copywriter for the Iwosan Integration Hub, a centralized digital platform for Iwosan Healthcare Systems Limited and its network of hospitals. Write in a warm, professional tone reflecting Iwosan's values: empathetic, ethical, knowledge-driven, innovative, accessible. Never invent specific facts, statistics, dates, or names that weren't given in the context — stay general if specifics aren't provided. Output plain text only: no markdown, no headers, no surrounding quotation marks, no preamble or explanation — just the requested text itself.`;

// POST /api/admin/cms/ai-assist
router.post('/admin/cms/ai-assist', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });

  const { contentType, field, mode = 'generate', existingText = '', context = {} } = req.body ?? {};
  const config = AI_ASSIST_FIELDS[`${contentType}.${field}`];
  if (!config) return res.status(400).json({ error: 'Unsupported field' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[ai-assist] GROQ_API_KEY is not set');
    return res.status(503).json({ error: 'AI assistant is not configured on this server' });
  }

  const contextLines = Object.entries(context)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join('\n');

  const instruction = mode === 'rewrite' && typeof existingText === 'string' && existingText.trim()
    ? `Rewrite the following ${config.label} to be clearer and more polished, keeping the same meaning and roughly the same length (max ${config.maxWords} words). Return ONLY the rewritten text.\n\nOriginal:\n${existingText.trim()}`
    : `Write ${config.label} (max ${config.maxWords} words). Return ONLY the text itself.`;

  const userPrompt = contextLines ? `Context:\n${contextLines}\n\n${instruction}` : instruction;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 600,
        messages: [
          { role: 'system', content: AI_ASSIST_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[ai-assist] Groq API error:', groqRes.status, errText);
      return res.status(502).json({ error: 'AI service error' });
    }
    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) return res.status(502).json({ error: 'AI returned an empty response' });
    return res.json({ text });
  } catch (err) {
    console.error('[ai-assist] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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

const FORM_QUESTION_TYPES = new Set(['choice', 'text', 'rating', 'date', 'ranking', 'likert', 'nps', 'section']);
const MAX_LINKED_FORMS_PER_SESSION = 2;

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter(Boolean);
}

function validateEntitiesList(entities) {
  return Array.isArray(entities) && entities.length > 0 && entities.every((e) => e in CONTENT_ENTITIES);
}

function hasDuplicateStrings(values) {
  return new Set(values).size !== values.length;
}

function normalizeFormQuestions(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: 'At least one question is required' };
  }
  if (input.length > 100) return { error: 'An assessment can have at most 100 questions' };

  const ids = new Set();
  const questions = [];
  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index] ?? {};
    const type = String(raw.type ?? '');
    const title = String(raw.title ?? '').trim();
    const id = String(raw.id || `q-${index + 1}-${randomBytes(3).toString('hex')}`)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!FORM_QUESTION_TYPES.has(type)) return { error: `Question ${index + 1} has an invalid type` };
    if (!title) return { error: `Question ${index + 1} needs question text` };
    if (!id || ids.has(id)) return { error: `Question ${index + 1} has a duplicate or invalid ID` };
    ids.add(id);

    const question = { id, type, title, required: type === 'section' ? false : Boolean(raw.required) };
    if (type === 'choice') {
      const options = cleanStringList(raw.options);
      if (options.length < 2) return { error: `Question ${index + 1} needs at least two options` };
      if (hasDuplicateStrings(options)) return { error: `Question ${index + 1} has duplicate options` };
      question.options = options;
      question.allowMultiple = Boolean(raw.allowMultiple);
    } else if (type === 'text') {
      question.longAnswer = Boolean(raw.longAnswer);
    } else if (type === 'rating') {
      const max = Number(raw.max) || 5;
      if (!Number.isInteger(max) || max < 2 || max > 10) return { error: `Question ${index + 1} rating must be between 2 and 10` };
      question.max = max;
    } else if (type === 'ranking') {
      const options = cleanStringList(raw.options);
      if (options.length < 2) return { error: `Question ${index + 1} needs at least two ranking options` };
      if (hasDuplicateStrings(options)) return { error: `Question ${index + 1} has duplicate ranking options` };
      question.options = options;
    } else if (type === 'likert') {
      const rows = cleanStringList(raw.rows);
      const options = cleanStringList(raw.options);
      if (rows.length < 1) return { error: `Question ${index + 1} needs at least one statement` };
      if (options.length < 2) return { error: `Question ${index + 1} needs at least two scale options` };
      if (hasDuplicateStrings(rows)) return { error: `Question ${index + 1} has duplicate statements` };
      if (hasDuplicateStrings(options)) return { error: `Question ${index + 1} has duplicate scale options` };
      question.rows = rows;
      question.options = options;
    }
    questions.push(question);
  }

  return { questions };
}

function parseFormDate(value, label) {
  if (!value) return { error: `${label} is required` };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `${label} must be a valid date/time` };
  return { date };
}

function isExpiredForm(row) {
  return new Date(row.expires_at).getTime() < Date.now();
}

function isUpcomingForm(row) {
  return new Date(row.starts_at).getTime() > Date.now();
}

function userCanSeeForm(user, row) {
  if (!Array.isArray(row.entities)) return false;
  if (canSeeAllContent(user)) return true;
  const visibilityEntity = getContentVisibilityEntity(user);
  return row.entities.includes(GENERAL_ENTITY) || (!!visibilityEntity && row.entities.includes(visibilityEntity));
}

async function normalizeLiveSessionId(value, { excludeFormId = null } = {}) {
  if (value === undefined || value === null || value === '') return { liveSessionId: null };
  const liveSessionId = Number(value);
  if (!Number.isInteger(liveSessionId) || liveSessionId <= 0) {
    return { error: 'liveSessionId must be a valid live session' };
  }

  const sessionRows = await db('SELECT id FROM live_sessions WHERE id = $1 AND is_active = true', [liveSessionId]);
  if (!sessionRows[0]) return { error: 'Selected live session was not found' };

  const params = [liveSessionId];
  let countQuery = 'SELECT COUNT(*)::int AS count FROM cms_forms WHERE live_session_id = $1 AND is_active = true';
  if (excludeFormId !== null) {
    params.push(excludeFormId);
    countQuery += ` AND id <> $${params.length}`;
  }
  const countRows = await db(countQuery, params);
  if (Number(countRows[0]?.count ?? 0) >= MAX_LINKED_FORMS_PER_SESSION) {
    return { error: 'A live session can have at most two linked forms' };
  }

  return { liveSessionId };
}

function mapFormRow(r, { includeQuestions = false } = {}) {
  const questions = r.questions ?? [];
  const questionCount = Array.isArray(questions) ? questions.filter((q) => q.type !== 'section').length : 0;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ...(includeQuestions ? { questions, questionCount } : { questionCount }),
    entities: r.entities ?? [],
    liveSessionId: r.live_session_id ?? null,
    startsAt: new Date(r.starts_at).toISOString(),
    expiresAt: new Date(r.expires_at).toISOString(),
    hideWhenExpired: r.hide_when_expired,
    isAttendance: Boolean(r.is_attendance),
    expired: isExpiredForm(r),
    upcoming: isUpcomingForm(r),
    sortOrder: r.sort_order,
    responseCount: Number(r.response_count ?? 0),
    hasSubmitted: Boolean(r.has_submitted),
  };
}

function mapSessionRow(r, assessmentFormsBySession = new Map()) {
  const assessmentForms = assessmentFormsBySession.get(r.id) ?? [];
  return {
    id: r.id,
    title: r.title,
    date: fmtDate(r.session_date),
    time: r.session_time,
    format: r.format,
    venue: r.venue,
    host: r.host,
    meetingUrl: r.meeting_url,
    entities: r.entities,
    image: r.image,
    assessmentForms,
    assessmentForm: assessmentForms[0] ?? null,
  };
}

async function getAssessmentFormsBySession(sessionIds, user) {
  const map = new Map();
  if (!sessionIds.length) return map;
  const seesAll = canSeeAllContent(user);
  const visibilityEntity = getContentVisibilityEntity(user);

  const rows = await db(
    seesAll
      ? `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
            f.hide_when_expired, f.is_attendance, f.sort_order,
            EXISTS (
              SELECT 1 FROM cms_form_responses r
              WHERE r.form_id = f.id AND r.user_id = $2
            ) AS has_submitted
     FROM cms_forms f
     WHERE f.is_active = true
       AND f.live_session_id = ANY($1::int[])
     ORDER BY f.live_session_id ASC, f.sort_order ASC, f.created_at DESC`
      : `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
            f.hide_when_expired, f.is_attendance, f.sort_order,
            EXISTS (
              SELECT 1 FROM cms_form_responses r
              WHERE r.form_id = f.id AND r.user_id = $2
            ) AS has_submitted
     FROM cms_forms f
     WHERE f.is_active = true
       AND f.live_session_id = ANY($1::int[])
       AND ($3 = ANY(f.entities) OR $4 = ANY(f.entities))
     ORDER BY f.live_session_id ASC, f.sort_order ASC, f.created_at DESC`,
    seesAll ? [sessionIds, user.userId] : [sessionIds, user.userId, visibilityEntity, GENERAL_ENTITY]
  );

  for (const row of rows) {
    const forms = map.get(row.live_session_id) ?? [];
    forms.push(mapFormRow(row));
    map.set(row.live_session_id, forms);
  }
  return map;
}

function validateFormAnswers(questions, rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    return { error: 'Answers must be an object' };
  }

  const answers = {};
  for (const q of questions) {
    if (q.type === 'section') continue;
    const value = rawAnswers[q.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (q.type === 'likert' && typeof value === 'object' && Object.keys(value).length === 0);

    if (isEmpty) {
      if (q.required) return { error: `"${q.title}" is required` };
      continue;
    }

    if (q.type === 'choice') {
      if (q.allowMultiple) {
        if (!Array.isArray(value)) return { error: `"${q.title}" must contain selected options` };
        const cleaned = value.map((v) => String(v));
        if (!cleaned.every((v) => q.options.includes(v))) return { error: `"${q.title}" contains an invalid option` };
        answers[q.id] = cleaned;
      } else {
        const selected = String(value);
        if (!q.options.includes(selected)) return { error: `"${q.title}" contains an invalid option` };
        answers[q.id] = selected;
      }
    } else if (q.type === 'text') {
      if (typeof value !== 'string') return { error: `"${q.title}" must be text` };
      if (q.required && !value.trim()) return { error: `"${q.title}" is required` };
      answers[q.id] = value.trim();
    } else if (q.type === 'rating') {
      const rating = Number(value);
      if (!Number.isInteger(rating) || rating < 1 || rating > q.max) return { error: `"${q.title}" must be a valid rating` };
      answers[q.id] = rating;
    } else if (q.type === 'date') {
      const date = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: `"${q.title}" must be a valid date` };
      answers[q.id] = date;
    } else if (q.type === 'ranking') {
      if (!Array.isArray(value)) return { error: `"${q.title}" must be a ranked list` };
      const ranked = value.map((v) => String(v));
      if (new Set(ranked).size !== ranked.length || !ranked.every((v) => q.options.includes(v))) {
        return { error: `"${q.title}" contains invalid ranking options` };
      }
      if (q.required && ranked.length !== q.options.length) return { error: `"${q.title}" must rank every option` };
      answers[q.id] = ranked;
    } else if (q.type === 'likert') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: `"${q.title}" must contain scale answers` };
      const answer = {};
      for (const row of q.rows) {
        const selected = value[row];
        if (!selected) {
          if (q.required) return { error: `"${q.title}" must answer every statement` };
          continue;
        }
        if (!q.options.includes(String(selected))) return { error: `"${q.title}" contains an invalid scale answer` };
        answer[row] = String(selected);
      }
      answers[q.id] = answer;
    } else if (q.type === 'nps') {
      const score = Number(value);
      if (!Number.isInteger(score) || score < 0 || score > 10) return { error: `"${q.title}" must be between 0 and 10` };
      answers[q.id] = score;
    }
  }

  return { answers };
}

function formatAnswerForExport(question, answers) {
  const value = answers?.[question.id];
  if (value === undefined || value === null) return '';
  if (question.type === 'choice') return Array.isArray(value) ? value.join('; ') : String(value);
  if (question.type === 'ranking') return Array.isArray(value) ? value.join(' > ') : String(value);
  if (question.type === 'likert' && typeof value === 'object') {
    return Object.entries(value).map(([row, selected]) => `${row}: ${selected}`).join('; ');
  }
  return String(value);
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function excelColumnName(index) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

async function buildXlsxBuffer(rows) {
  const zip = new JSZip();
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const cellRef = `${excelColumnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Responses" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  zip.folder('xl')?.folder('worksheets')?.file('sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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

  // Sanity-check size (~20 MB decoded limit — the client compresses/resizes
  // before upload, this is just headroom for files that don't shrink much,
  // e.g. GIFs, which are uploaded uncompressed to preserve animation)
  if (base64Data.length > 27 * 1024 * 1024) return res.status(400).json({ error: 'Image too large. Max 20 MB.' });

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

// -- CMS: Forms (public read/submit, admin write) --------------------------

// GET /api/forms - Learning Centre cards for the current user's organisation
router.get('/forms', requireAuth, async (req, res) => {
  try {
    const seesAll = canSeeAllContent(req.authUser);
    const visibilityEntity = getContentVisibilityEntity(req.authUser);
    const rows = await db(
      seesAll
        ? `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
              f.hide_when_expired, f.is_attendance, f.sort_order,
              EXISTS (
                SELECT 1 FROM cms_form_responses r
                WHERE r.form_id = f.id AND r.user_id = $1
              ) AS has_submitted
       FROM cms_forms f
       WHERE f.is_active = true
         AND f.live_session_id IS NULL
         AND (f.expires_at >= NOW() OR f.hide_when_expired = false)
       ORDER BY f.sort_order ASC, f.created_at DESC`
        : `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
              f.hide_when_expired, f.is_attendance, f.sort_order,
              EXISTS (
                SELECT 1 FROM cms_form_responses r
                WHERE r.form_id = f.id AND r.user_id = $2
              ) AS has_submitted
       FROM cms_forms f
       WHERE f.is_active = true
         AND ($1 = ANY(f.entities) OR $3 = ANY(f.entities))
         AND f.live_session_id IS NULL
         AND (f.expires_at >= NOW() OR f.hide_when_expired = false)
       ORDER BY f.sort_order ASC, f.created_at DESC`,
      seesAll ? [req.authUser.userId] : [visibilityEntity, req.authUser.userId, GENERAL_ENTITY]
    );
    return res.json({ forms: rows.map((r) => mapFormRow(r)) });
  } catch (err) {
    console.error('GET /forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/forms/:id - a single form page, guarded by organisation visibility
router.get('/forms/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db(
      `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
              f.hide_when_expired, f.is_attendance, f.sort_order,
              EXISTS (
                SELECT 1 FROM cms_form_responses r
                WHERE r.form_id = f.id AND r.user_id = $2
              ) AS has_submitted
       FROM cms_forms f
       WHERE f.id = $1 AND f.is_active = true`,
      [id, req.authUser.userId]
    );
    const form = rows[0];
    if (!form || !userCanSeeForm(req.authUser, form)) return res.status(404).json({ error: 'Not found' });
    if (isExpiredForm(form) && form.hide_when_expired && !form.live_session_id) return res.status(404).json({ error: 'Not found' });
    return res.json({ form: mapFormRow(form, { includeQuestions: true }) });
  } catch (err) {
    console.error('GET /forms/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/forms/:id/responses - one submission per user, while the form is open
router.post('/forms/:id/responses', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const formRows = await db('SELECT * FROM cms_forms WHERE id = $1 AND is_active = true', [id]);
    const form = formRows[0];
    if (!form || !userCanSeeForm(req.authUser, form)) return res.status(404).json({ error: 'Not found' });
    const formLabel = form.is_attendance ? 'attendance form' : 'assessment';
    if (isUpcomingForm(form)) return res.status(400).json({ error: `This ${formLabel} is not open yet` });
    if (isExpiredForm(form)) return res.status(400).json({ error: `This ${formLabel} has expired` });

    const existingRows = await db(
      'SELECT id FROM cms_form_responses WHERE form_id = $1 AND user_id = $2',
      [id, req.authUser.userId]
    );
    if (existingRows[0]) {
      return res.status(409).json({ error: form.is_attendance ? 'You have already marked attendance' : 'You have already submitted this assessment' });
    }

    const questions = form.questions ?? [];
    const checked = validateFormAnswers(questions, req.body?.answers);
    if (checked.error) return res.status(400).json({ error: checked.error });

    const userRows = await db('SELECT email, name, entity FROM users WHERE id = $1', [req.authUser.userId]);
    const user = userRows[0] ?? {};
    await db(
      `INSERT INTO cms_form_responses (form_id, user_id, user_email, user_name, user_entity, answers)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        req.authUser.userId,
        user.email || req.authUser.email,
        user.name || '',
        user.entity || getContentVisibilityEntity(req.authUser),
        JSON.stringify(checked.answers),
      ]
    );
    return res.status(201).json({ message: form.is_attendance ? 'Attendance marked successfully' : 'Submitted successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You have already submitted this form' });
    console.error('POST /forms/:id/responses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/cms/forms
router.get('/admin/cms/forms', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  try {
    const rows = await db(
      `SELECT f.id, f.title, f.description, f.questions, f.entities, f.live_session_id, f.starts_at, f.expires_at,
              f.hide_when_expired, f.is_attendance, f.sort_order, COUNT(r.id)::int AS response_count
       FROM cms_forms f
       LEFT JOIN cms_form_responses r ON r.form_id = f.id
       WHERE f.is_active = true
       GROUP BY f.id
       ORDER BY f.sort_order ASC, f.created_at DESC`,
      []
    );
    return res.json({ forms: rows.map((r) => mapFormRow(r, { includeQuestions: true })) });
  } catch (err) {
    console.error('GET /admin/cms/forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/forms
router.post('/admin/cms/forms', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const {
    title,
    description = '',
    questions,
    entities,
    startsAt,
    expiresAt,
    hideWhenExpired = false,
    isAttendance = false,
    liveSessionId = null,
    sortOrder = 0,
  } = req.body ?? {};

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!validateEntitiesList(entities)) return res.status(400).json({ error: 'At least one valid visibility option is required' });
  const normalized = normalizeFormQuestions(questions);
  if (normalized.error) return res.status(400).json({ error: normalized.error });
  const start = parseFormDate(startsAt, 'startsAt');
  if (start.error) return res.status(400).json({ error: start.error });
  const expiry = parseFormDate(expiresAt, 'expiresAt');
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  if (expiry.date <= start.date) return res.status(400).json({ error: 'expiresAt must be after startsAt' });

  try {
    const linkedSession = await normalizeLiveSessionId(liveSessionId);
    if (linkedSession.error) return res.status(400).json({ error: linkedSession.error });

    const rows = await db(
      `INSERT INTO cms_forms (title, description, questions, entities, live_session_id, starts_at, expires_at, hide_when_expired, is_attendance, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        String(title).trim(),
        String(description ?? ''),
        JSON.stringify(normalized.questions),
        entities,
        linkedSession.liveSessionId,
        start.date.toISOString(),
        expiry.date.toISOString(),
        Boolean(hideWhenExpired),
        Boolean(isAttendance),
        Number(sortOrder) || 0,
      ]
    );
    return res.status(201).json({ form: mapFormRow(rows[0], { includeQuestions: true }) });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'cms_forms_one_active_per_session_idx') {
      return res.status(409).json({ error: 'Run database migrations to allow two linked forms per session' });
    }
    console.error('POST /admin/cms/forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/forms/:id
router.patch('/admin/cms/forms/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, description, questions, entities, startsAt, expiresAt, hideWhenExpired, isAttendance, liveSessionId, sortOrder } = req.body ?? {};

  try {
    const existingRows = await db('SELECT * FROM cms_forms WHERE id = $1 AND is_active = true', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let normalized = null;
    if (questions !== undefined) {
      normalized = normalizeFormQuestions(questions);
      if (normalized.error) return res.status(400).json({ error: normalized.error });
    }
    if (entities !== undefined && !validateEntitiesList(entities)) {
      return res.status(400).json({ error: 'At least one valid visibility option is required' });
    }

    let nextStart = new Date(existing.starts_at);
    let nextExpiry = new Date(existing.expires_at);
    if (startsAt !== undefined) {
      const parsed = parseFormDate(startsAt, 'startsAt');
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      nextStart = parsed.date;
    }
    if (expiresAt !== undefined) {
      const parsed = parseFormDate(expiresAt, 'expiresAt');
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      nextExpiry = parsed.date;
    }
    if (nextExpiry <= nextStart) return res.status(400).json({ error: 'expiresAt must be after startsAt' });

    let linkedSession = null;
    if (liveSessionId !== undefined) {
      linkedSession = await normalizeLiveSessionId(liveSessionId, { excludeFormId: id });
      if (linkedSession.error) return res.status(400).json({ error: linkedSession.error });
    }

    const set = [];
    const params = [];
    let i = 1;
    if (title !== undefined)           { set.push(`title=$${i++}`);             params.push(String(title).trim()); }
    if (description !== undefined)     { set.push(`description=$${i++}`);       params.push(String(description ?? '')); }
    if (normalized)                    { set.push(`questions=$${i++}`);         params.push(JSON.stringify(normalized.questions)); }
    if (entities !== undefined)        { set.push(`entities=$${i++}`);          params.push(entities); }
    if (startsAt !== undefined)        { set.push(`starts_at=$${i++}`);         params.push(nextStart.toISOString()); }
    if (expiresAt !== undefined)       { set.push(`expires_at=$${i++}`);        params.push(nextExpiry.toISOString()); }
    if (hideWhenExpired !== undefined) { set.push(`hide_when_expired=$${i++}`); params.push(Boolean(hideWhenExpired)); }
    if (isAttendance !== undefined)    { set.push(`is_attendance=$${i++}`);     params.push(Boolean(isAttendance)); }
    if (linkedSession)                 { set.push(`live_session_id=$${i++}`);   params.push(linkedSession.liveSessionId); }
    if (sortOrder !== undefined)       { set.push(`sort_order=$${i++}`);        params.push(Number(sortOrder) || 0); }
    if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    set.push('updated_at=NOW()');
    params.push(id);

    const rows = await db(`UPDATE cms_forms SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    return res.json({ form: mapFormRow(rows[0], { includeQuestions: true }) });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'cms_forms_one_active_per_session_idx') {
      return res.status(409).json({ error: 'Run database migrations to allow two linked forms per session' });
    }
    console.error('PATCH /admin/cms/forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/forms/:id
router.delete('/admin/cms/forms/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE cms_forms SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/cms/forms/:id/responses/export
router.get('/admin/cms/forms/:id/responses/export', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const formRows = await db('SELECT * FROM cms_forms WHERE id = $1 AND is_active = true', [id]);
    const form = formRows[0];
    if (!form) return res.status(404).json({ error: 'Not found' });
    const responses = await db(
      `SELECT user_email, user_name, user_entity, answers, submitted_at
       FROM cms_form_responses
       WHERE form_id = $1
       ORDER BY submitted_at DESC`,
      [id]
    );

    const questions = (form.questions ?? []).filter((q) => q.type !== 'section');
    const headers = ['Submitted At', 'Email', 'Name', 'Organisation', ...questions.map((q, i) => q.title || `Question ${i + 1}`)];
    const worksheetRows = [
      headers,
      ...responses.map((row) => {
        const base = [
          new Date(row.submitted_at).toISOString(),
          row.user_email,
          row.user_name,
          CONTENT_ENTITIES[row.user_entity] ?? row.user_entity ?? '',
        ];
        const answerValues = questions.map((q) => formatAnswerForExport(q, row.answers ?? {}));
        return [...base, ...answerValues];
      }),
    ];

    const buffer = await buildXlsxBuffer(worksheetRows);
    const filename = `${String(form.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'assessment'}-responses.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('GET /admin/cms/forms/:id/responses/export error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CMS: News (public read, admin write) ──────────────────────────────────

// GET /api/news
router.get('/news', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, title, excerpt, content, date, category, featured, image, images, video, url, sort_order
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
        video: r.video,
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
  const { title, excerpt = '', content = '', date, category, featured = false, image = '', images = [], video = '', url = '', sortOrder = 0 } = req.body ?? {};
  if (!title || !date || !category) return res.status(400).json({ error: 'title, date, and category are required' });
  if (!validateUrl(url)) return res.status(400).json({ error: 'url must be an http or https URL' });
  if (!Array.isArray(images) || !images.every((u) => typeof u === 'string')) return res.status(400).json({ error: 'images must be an array of strings' });
  if (video && !video.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
  try {
    const rows = await db(
      `INSERT INTO news (title, excerpt, content, date, category, featured, image, images, video, url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, excerpt, content, date, category, Boolean(featured), image, images, video, url, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      newsItem: { id: r.id, title: r.title, excerpt: r.excerpt, content: r.content, date: fmtDate(r.date), category: r.category, featured: r.featured, image: r.image, images: r.images ?? [], video: r.video, url: r.url, sortOrder: r.sort_order },
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
  const { title, excerpt, content, date, category, featured, image, images, video, url, sortOrder } = req.body ?? {};
  if (url !== undefined && !validateUrl(url)) return res.status(400).json({ error: 'url must be an http or https URL' });
  if (images !== undefined && (!Array.isArray(images) || !images.every((u) => typeof u === 'string'))) {
    return res.status(400).json({ error: 'images must be an array of strings' });
  }
  if (video && !video.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
  const set = []; const params = []; let i = 1;
  if (title !== undefined)     { set.push(`title=$${i++}`);       params.push(title); }
  if (excerpt !== undefined)   { set.push(`excerpt=$${i++}`);     params.push(excerpt); }
  if (content !== undefined)   { set.push(`content=$${i++}`);     params.push(content); }
  if (date !== undefined)      { set.push(`date=$${i++}`);        params.push(date); }
  if (category !== undefined)  { set.push(`category=$${i++}`);    params.push(category); }
  if (featured !== undefined)  { set.push(`featured=$${i++}`);    params.push(Boolean(featured)); }
  if (image !== undefined)     { set.push(`image=$${i++}`);       params.push(image); }
  if (images !== undefined)    { set.push(`images=$${i++}`);      params.push(images); }
  if (video !== undefined)     { set.push(`video=$${i++}`);       params.push(video); }
  if (url !== undefined)       { set.push(`url=$${i++}`);         params.push(url); }
  if (sortOrder !== undefined) { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE news SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      newsItem: { id: r.id, title: r.title, excerpt: r.excerpt, content: r.content, date: fmtDate(r.date), category: r.category, featured: r.featured, image: r.image, images: r.images ?? [], video: r.video, url: r.url, sortOrder: r.sort_order },
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
      `SELECT id, title, description, category, level, duration, audience, modules, mandatory, course_url, video, sort_order
       FROM courses WHERE is_active = true ORDER BY sort_order ASC`,
      []
    );
    return res.json({
      courses: rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, category: r.category,
        level: r.level, duration: r.duration, audience: r.audience,
        modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, video: r.video, sortOrder: r.sort_order,
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
  const { id, title, description = '', category, level, duration, audience = '', modules = 1, mandatory = false, courseUrl = '', video = '', sortOrder = 0 } = req.body ?? {};
  if (!id || !title || !category || !level || !duration) return res.status(400).json({ error: 'id, title, category, level, and duration are required' });
  if (!validateUrl(courseUrl)) return res.status(400).json({ error: 'courseUrl must be an http or https URL' });
  if (video && !video.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
  try {
    const rows = await db(
      `INSERT INTO courses (id,title,description,category,level,duration,audience,modules,mandatory,course_url,video,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, title, description, category, level, duration, audience, Number(modules), Boolean(mandatory), courseUrl, video, Number(sortOrder)]
    );
    const r = rows[0];
    return res.status(201).json({
      course: { id: r.id, title: r.title, description: r.description, category: r.category, level: r.level, duration: r.duration, audience: r.audience, modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, video: r.video, sortOrder: r.sort_order },
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
  const { title, description, category, level, duration, audience, modules, mandatory, courseUrl, video, sortOrder } = req.body ?? {};
  if (courseUrl !== undefined && !validateUrl(courseUrl)) return res.status(400).json({ error: 'courseUrl must be an http or https URL' });
  if (video && !video.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
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
  if (video !== undefined)       { set.push(`video=$${i++}`);       params.push(video); }
  if (sortOrder !== undefined)   { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder)); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(courseId);
  try {
    const rows = await db(`UPDATE courses SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      course: { id: r.id, title: r.title, description: r.description, category: r.category, level: r.level, duration: r.duration, audience: r.audience, modules: r.modules, mandatory: r.mandatory, courseUrl: r.course_url, video: r.video, sortOrder: r.sort_order },
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
// CMS editors see every entity's sessions (they manage content for the
// whole group). Everyone else only sees their own entity's sessions plus
// the separate general visibility marker.
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const seesAll = canSeeAllContent(req.authUser);
    const visibilityEntity = getContentVisibilityEntity(req.authUser);
    const rows = await db(
      seesAll
        ? `SELECT id, title, session_date, session_time, format, venue, host, meeting_url, entities, image
           FROM live_sessions WHERE is_active = true ORDER BY session_date ASC`
        : `SELECT id, title, session_date, session_time, format, venue, host, meeting_url, entities, image
           FROM live_sessions WHERE is_active = true AND ($1 = ANY(entities) OR $2 = ANY(entities)) ORDER BY session_date ASC`,
      seesAll ? [] : [visibilityEntity, GENERAL_ENTITY]
    );
    const assessmentFormsBySession = await getAssessmentFormsBySession(rows.map((r) => r.id), req.authUser);
    return res.json({
      sessions: rows.map((r) => mapSessionRow(r, assessmentFormsBySession)),
    });
  } catch (err) {
    console.error('GET /sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/cms/sessions
router.get('/admin/cms/sessions', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  try {
    const rows = await db(
      `SELECT id, title, session_date, session_time, format, venue, host, meeting_url, entities, image
       FROM live_sessions WHERE is_active = true ORDER BY session_date ASC`,
      []
    );
    return res.json({ sessions: rows.map((r) => mapSessionRow(r)) });
  } catch (err) {
    console.error('GET /admin/cms/sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/sessions
router.post('/admin/cms/sessions', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, date, time, format, venue = '', host = '', meetingUrl = '', entities, image = '' } = req.body ?? {};
  if (!title || !date || !time || !format) return res.status(400).json({ error: 'title, date, time, and format are required' });
  const validFormats = ['Virtual', 'In-Person', 'Hybrid'];
  if (!validFormats.includes(format)) return res.status(400).json({ error: 'format must be Virtual, In-Person, or Hybrid' });
  if (!validateUrl(meetingUrl)) return res.status(400).json({ error: 'meetingUrl must be an http or https URL' });
  if (!Array.isArray(entities) || entities.length === 0 || !entities.every((e) => e in CONTENT_ENTITIES)) {
    return res.status(400).json({ error: 'At least one valid visibility option is required' });
  }
  try {
    const rows = await db(
      `INSERT INTO live_sessions (title, session_date, session_time, format, venue, host, meeting_url, entities, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, date, time, format, venue, host, meetingUrl, entities, image]
    );
    const r = rows[0];
    return res.status(201).json({
      session: mapSessionRow(r),
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
  const { title, date, time, format, venue, host, meetingUrl, entities, image } = req.body ?? {};
  if (format !== undefined && !['Virtual','In-Person','Hybrid'].includes(format)) return res.status(400).json({ error: 'Invalid format' });
  if (meetingUrl !== undefined && !validateUrl(meetingUrl)) return res.status(400).json({ error: 'meetingUrl must be an http or https URL' });
  if (entities !== undefined && (!Array.isArray(entities) || entities.length === 0 || !entities.every((e) => e in CONTENT_ENTITIES))) {
    return res.status(400).json({ error: 'At least one valid visibility option is required' });
  }
  const set = []; const params = []; let i = 1;
  if (title !== undefined)      { set.push(`title=$${i++}`);        params.push(title); }
  if (date !== undefined)       { set.push(`session_date=$${i++}`); params.push(date); }
  if (time !== undefined)       { set.push(`session_time=$${i++}`); params.push(time); }
  if (format !== undefined)     { set.push(`format=$${i++}`);       params.push(format); }
  if (venue !== undefined)      { set.push(`venue=$${i++}`);        params.push(venue); }
  if (host !== undefined)       { set.push(`host=$${i++}`);         params.push(host); }
  if (meetingUrl !== undefined) { set.push(`meeting_url=$${i++}`);  params.push(meetingUrl); }
  if (entities !== undefined)   { set.push(`entities=$${i++}`);     params.push(entities); }
  if (image !== undefined)      { set.push(`image=$${i++}`);        params.push(image); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push(`updated_at=NOW()`); params.push(id);
  try {
    const rows = await db(`UPDATE live_sessions SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    return res.json({
      session: mapSessionRow(r),
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

// ── CMS: Video Library (public read, admin write) ──────────────────────────
// No entity scoping — every logged-in user sees every video. A video may
// optionally belong to an album (like Picture Library); one with no album
// is a standalone upload.

async function hardDeleteS3Key(key) {
  if (!S3_BUCKET || !key) return;
  try {
    await getS3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (s3Err) {
    console.error('Failed to remove S3 object', key, s3Err);
  }
}

// GET /api/video-albums — every active album with its active videos nested
router.get('/video-albums', requireAuth, async (req, res) => {
  try {
    const albums = await db(
      `SELECT id, title, description, sort_order FROM video_albums
       WHERE is_active = true ORDER BY sort_order ASC, created_at DESC`,
      []
    );
    const videos = await db(
      `SELECT id, album_id, title, description, thumbnail, duration, file_size, sort_order
       FROM videos WHERE is_active = true AND album_id IS NOT NULL
       ORDER BY sort_order ASC, created_at DESC`,
      []
    );
    const byAlbum = new Map();
    for (const v of videos) {
      const list = byAlbum.get(v.album_id) ?? [];
      list.push(mapVideoRow(v));
      byAlbum.set(v.album_id, list);
    }
    return res.json({ albums: albums.map((a) => mapAlbumRow(a, byAlbum.get(a.id) ?? [])) });
  } catch (err) {
    console.error('GET /video-albums error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/videos — standalone videos only (no album)
router.get('/videos', requireAuth, async (req, res) => {
  try {
    const rows = await db(
      `SELECT id, album_id, title, description, thumbnail, duration, file_size, sort_order
       FROM videos WHERE is_active = true AND album_id IS NULL
       ORDER BY sort_order ASC, created_at DESC`,
      []
    );
    return res.json({ videos: rows.map(mapVideoRow) });
  } catch (err) {
    console.error('GET /videos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/videos/:id/play  — short-lived signed URL, minted on demand
router.get('/videos/:id/play', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  if (!S3_BUCKET) return res.status(500).json({ error: 'Video storage is not configured' });
  try {
    const rows = await db('SELECT s3_key FROM videos WHERE id=$1 AND is_active = true', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: rows[0].s3_key });
    const url = await getSignedUrl(getS3(), command, { expiresIn: 60 * 60 * 4 }); // 4 hours
    return res.json({ url });
  } catch (err) {
    console.error('GET /videos/:id/play error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/video-play-url?key=… — same signed-URL mint as above, but for
// videos that live inline on another record (News article, Course) rather
// than as a `videos` row, so there's no id to look up.
router.get('/video-play-url', requireAuth, async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (!key || !key.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
  if (!S3_BUCKET) return res.status(500).json({ error: 'Video storage is not configured' });
  try {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(getS3(), command, { expiresIn: 60 * 60 * 4 }); // 4 hours
    return res.json({ url });
  } catch (err) {
    console.error('GET /video-play-url error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/videos/upload-url — mint a presigned PUT so the
// browser uploads straight to S3 (the file never touches this server).
// Reused for News/Courses inline video uploads too, not just Video Library.
router.post('/admin/cms/videos/upload-url', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { contentType, fileSize } = req.body ?? {};
  const ext = ALLOWED_VIDEO_TYPES[contentType];
  if (!ext) return res.status(400).json({ error: 'Unsupported video format. Use MP4, WebM, or MOV.' });
  if (!Number.isFinite(fileSize) || fileSize <= 0) return res.status(400).json({ error: 'fileSize is required' });
  if (fileSize > MAX_VIDEO_BYTES) return res.status(400).json({ error: 'Video too large. Max 500 MB.' });
  if (!S3_BUCKET) return res.status(500).json({ error: 'Video storage is not configured' });
  try {
    const key = `${S3_VIDEO_PREFIX}${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 900 }); // 15 min
    return res.json({ uploadUrl, key });
  } catch (err) {
    console.error('POST /admin/cms/videos/upload-url error:', err);
    return res.status(500).json({ error: 'Could not prepare upload' });
  }
});

// POST /api/admin/cms/video-albums
router.post('/admin/cms/video-albums', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { title, description = '', sortOrder = 0 } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const rows = await db(
      `INSERT INTO video_albums (title, description, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [title, description, Number(sortOrder) || 0]
    );
    return res.status(201).json({ album: mapAlbumRow(rows[0], []) });
  } catch (err) {
    console.error('POST /admin/cms/video-albums error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/video-albums/:id
router.patch('/admin/cms/video-albums/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, description, sortOrder } = req.body ?? {};
  const set = []; const params = []; let i = 1;
  if (title !== undefined)       { set.push(`title=$${i++}`);       params.push(title); }
  if (description !== undefined) { set.push(`description=$${i++}`); params.push(description); }
  if (sortOrder !== undefined)   { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder) || 0); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push('updated_at=NOW()'); params.push(id);
  try {
    const rows = await db(`UPDATE video_albums SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ album: mapAlbumRow(rows[0], []) });
  } catch (err) {
    console.error('PATCH /admin/cms/video-albums error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/video-albums/:id — soft-deletes the album and every
// video inside it (hard-deleting their S3 objects), same policy as a
// standalone video delete below.
router.delete('/admin/cms/video-albums/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const albumRows = await db('UPDATE video_albums SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING id', [id]);
    if (!albumRows[0]) return res.status(404).json({ error: 'Not found' });
    const videoRows = await db('UPDATE videos SET is_active = false, updated_at = NOW() WHERE album_id=$1 AND is_active = true RETURNING s3_key', [id]);
    for (const v of videoRows) await hardDeleteS3Key(v.s3_key);
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/video-albums error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cms/videos — called after the browser finishes the S3 PUT
router.post('/admin/cms/videos', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const { albumId = null, title, description = '', key, thumbnail = '', duration = '', fileSize = 0, sortOrder = 0 } = req.body ?? {};
  if (!title || !key) return res.status(400).json({ error: 'title and key are required' });
  if (!key.startsWith(S3_VIDEO_PREFIX)) return res.status(400).json({ error: 'Invalid video key' });
  try {
    const rows = await db(
      `INSERT INTO videos (album_id, title, description, s3_key, thumbnail, duration, file_size, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [albumId ? Number(albumId) : null, title, description, key, thumbnail, duration, Number(fileSize) || 0, Number(sortOrder) || 0]
    );
    return res.status(201).json({ video: mapVideoRow(rows[0]) });
  } catch (err) {
    console.error('POST /admin/cms/videos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/cms/videos/:id — metadata only; to replace the file
// itself, delete and re-add
router.patch('/admin/cms/videos/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { albumId, title, description, thumbnail, duration, sortOrder } = req.body ?? {};
  const set = []; const params = []; let i = 1;
  if (albumId !== undefined)     { set.push(`album_id=$${i++}`);    params.push(albumId ? Number(albumId) : null); }
  if (title !== undefined)       { set.push(`title=$${i++}`);       params.push(title); }
  if (description !== undefined) { set.push(`description=$${i++}`); params.push(description); }
  if (thumbnail !== undefined)   { set.push(`thumbnail=$${i++}`);   params.push(thumbnail); }
  if (duration !== undefined)    { set.push(`duration=$${i++}`);    params.push(duration); }
  if (sortOrder !== undefined)   { set.push(`sort_order=$${i++}`);  params.push(Number(sortOrder) || 0); }
  if (set.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  set.push('updated_at=NOW()'); params.push(id);
  try {
    const rows = await db(`UPDATE videos SET ${set.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ video: mapVideoRow(rows[0]) });
  } catch (err) {
    console.error('PATCH /admin/cms/videos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/cms/videos/:id — soft-deletes the row (consistent with
// the rest of the CMS) but hard-deletes the S3 object, since unlike a few
// KB of image bytes, an orphaned video is real ongoing storage cost.
router.delete('/admin/cms/videos/:id', requireAuth, async (req, res) => {
  if (!isCmsEditor(req.authUser)) return res.status(403).json({ error: 'Access required' });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const rows = await db('UPDATE videos SET is_active = false, updated_at = NOW() WHERE id=$1 AND is_active = true RETURNING s3_key', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await hardDeleteS3Key(rows[0].s3_key);
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/cms/videos error:', err);
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
