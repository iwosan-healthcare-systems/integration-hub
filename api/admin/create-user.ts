import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAuthUser } from '../_lib/auth';
import { query } from '../_lib/db';

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%!';
  const pool = upper + lower + digits + special;
  const bytes = randomBytes(16);
  let pwd =
    upper[bytes[0] % upper.length] +
    lower[bytes[1] % lower.length] +
    digits[bytes[2] % digits.length] +
    special[bytes[3] % special.length];
  for (let i = 4; i < 12; i++) pwd += pool[bytes[i] % pool.length];
  // Secure shuffle using crypto bytes
  const arr = pwd.split('');
  const shuffleBytes = randomBytes(arr.length);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      String(email).toLowerCase().trim(),
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const plainPassword = generatePassword();
    const hash = await bcrypt.hash(plainPassword, 12);

    const rows = await query<{ id: number; email: string }>(
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
}
