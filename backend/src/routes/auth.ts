import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many attempts, try again later' },
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: maxAgeSec * 1000,
  path: '/',
});

const setAuthCookies = (
  res: import('express').Response,
  accessToken: string,
  refreshToken: string,
) => {
  const accessMax = Number(process.env.JWT_ACCESS_TTL_MIN || 15) * 60;
  const refreshMax = Number(process.env.JWT_REFRESH_TTL_DAYS || 7) * 24 * 60 * 60;
  res.cookie('access_token', accessToken, cookieOpts(accessMax));
  res.cookie('refresh_token', refreshToken, cookieOpts(refreshMax));
};

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const emailNorm = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: emailNorm, passwordHash, name, role: 'owner' },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
    // create default org + membership
    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Workspace`,
        slug: `${emailNorm.split('@')[0]}-${user.id.slice(0, 6)}`.replace(/[^a-z0-9-]/g, '-'),
      },
    });
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
    });
    const access = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const { token: refresh } = await issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setAuthCookies(res, access, refresh);
    res.status(201).json({ user, accessToken: access, refreshToken: refresh });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const emailNorm = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const access = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const { token: refresh } = await issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setAuthCookies(res, access, refresh);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken: access,
      refreshToken: refresh,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!token) throw new AppError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
    const { token: newRefresh, userId } = await rotateRefreshToken(token, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true },
    });
    if (!user) throw new AppError(401, 'USER_NOT_FOUND', 'User not found');
    const access = signAccessToken(user);
    setAuthCookies(res, access, newRefresh);
    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) await revokeRefreshToken(token);
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      memberships: {
        include: { organization: true },
      },
    },
  });
  res.json({ user });
});

export default router;
