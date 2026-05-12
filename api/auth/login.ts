import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { query } from '../_lib/db';
import { generateToken, setCookieHeader } from '../_lib/auth';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_first_login: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const rows = await query<UserRow>(
      'SELECT id, email, password_hash, name, role, is_first_login FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );

    const user = rows[0];
    const valid = user && (await bcrypt.compare(String(password), user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.setHeader('Set-Cookie', setCookieHeader(token));

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
