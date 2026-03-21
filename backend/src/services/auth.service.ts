import { SignJWT, jwtVerify } from 'jose';
import type { Request, Response } from 'express';

// ─── User-info cookie helpers ─────────────────────────────────

const USER_INFO_COOKIE = 'user-info';

const COOKIE_OPTS = (res_is_production: boolean) => ({
  httpOnly: true,
  secure: res_is_production,
  sameSite: (res_is_production ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined,
});

export function setUserInfoCookie(
  res: Response,
  user: { id: string; firstName: string; lastName: string; email: string }
): void {
  const isProd = process.env.NODE_ENV === 'production';
  const payload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  };
  res.cookie(USER_INFO_COOKIE, JSON.stringify(payload), {
    ...COOKIE_OPTS(isProd),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearUserInfoCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(USER_INFO_COOKIE, COOKIE_OPTS(isProd));
}

const COOKIE_NAME = 'session-token';
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createSession(res: Response, userId: string, tokenVersion: number): Promise<void> {
  const token = await new SignJWT({ userId, tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

export async function verifySession(req: Request): Promise<{ userId: string; tokenVersion: number } | null> {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string | undefined;
    const tokenVersion = payload.tokenVersion as number | undefined;
    if (!userId || tokenVersion === undefined) return null;

    return { userId, tokenVersion };
  } catch {
    return null;
  }
}

export async function destroySession(res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}
