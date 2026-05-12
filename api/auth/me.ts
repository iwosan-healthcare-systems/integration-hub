import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthUser } from '../_lib/auth';
import { query } from '../_lib/db';

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  is_first_login: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const rows = await query<UserRow>(
      'SELECT id, email, name, role, is_first_login FROM users WHERE id = $1',
      [authUser.userId]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];
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
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
