import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

const COOKIE_NAME = 'iwosan_token';
const MAX_AGE = 7 * 24 * 60 * 60;

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: VercelRequest): TokenPayload | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[COOKIE_NAME]) return verifyToken(cookies[COOKIE_NAME]);
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return verifyToken(authHeader.slice(7));
  return null;
}

export function setCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Max-Age=${MAX_AGE}; Path=/; HttpOnly${secure}; SameSite=Strict`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map((c) => {
      const i = c.indexOf('=');
      return i > 0
        ? [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())]
        : [c.trim(), ''];
    })
  );
}
