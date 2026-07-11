import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const router = Router();

router.get('/', async (_req, res) => {
  let db = 'up';
  let redisStatus = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'down';
  }
  try {
    await redis.ping();
  } catch {
    redisStatus = 'down';
  }
  res.json({
    status: db === 'up' && redisStatus === 'up' ? 'healthy' : 'degraded',
    db,
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
