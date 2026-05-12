import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearCookieHeader } from '../_lib/auth';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ message: 'Logged out successfully' });
}
