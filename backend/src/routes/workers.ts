import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const workers = await prisma.worker.findMany({
    orderBy: { lastHeartbeatAt: 'desc' },
    include: {
      heartbeats: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { executions: true } },
    },
  });
  const now = Date.now();
  const enriched = workers.map((w) => ({
    ...w,
    health: now - w.lastHeartbeatAt.getTime() < 15_000 ? 'healthy' : 'stale',
    latestHeartbeat: w.heartbeats[0] || null,
  }));
  res.json({ workers: enriched });
});

router.get('/:id', requireAuth, async (req, res) => {
  const worker = await prisma.worker.findUnique({
    where: { id: req.params.id },
    include: {
      heartbeats: { orderBy: { createdAt: 'desc' }, take: 60 },
      jobs: { where: { status: 'running' }, take: 5 },
    },
  });
  res.json({ worker });
});

export default router;
