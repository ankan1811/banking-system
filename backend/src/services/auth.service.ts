import { SignJWT, jwtVerify } from 'jose';
import type { Request, Response } from 'express';

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
