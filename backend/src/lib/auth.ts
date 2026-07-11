import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';

process.env.JWT_ACCESS_SECRET ||= 'default_access_secret';
process.env.JWT_REFRESH_SECRET ||= 'default_refresh_secret';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL_MIN = Number(process.env.JWT_ACCESS_TTL_MIN || 15);
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 7);

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10);

export const verifyPassword = async (plain: string, hashed: string): Promise<boolean> =>
  bcrypt.compare(plain, hashed);

export const signAccessToken = (user: { id: string; email: string; role: string }): string =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' } satisfies AccessTokenPayload,
    ACCESS_SECRET,
    { expiresIn: `${ACCESS_TTL_MIN}m` },
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const p = jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
  if (p.type !== 'access') throw new Error('Invalid token type');
  return p;
};

export const issueRefreshToken = async (
  userId: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
): Promise<{ token: string; expiresAt: Date }> => {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = jwt.sign(
    { sub: userId, jti, type: 'refresh' } satisfies RefreshTokenPayload,
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_TTL_DAYS}d` },
  );
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });
  return { token, expiresAt };
};

export const rotateRefreshToken = async (
  oldToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
): Promise<{ token: string; expiresAt: Date; userId: string }> => {
  const payload = jwt.verify(oldToken, REFRESH_SECRET) as RefreshTokenPayload;
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  const tokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Refresh token invalid or expired');
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  const fresh = await issueRefreshToken(payload.sub, meta);
  return { ...fresh, userId: payload.sub };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllRefreshTokensForUser = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
