import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const [items, total] = await Promise.all([
    prisma.deadLetterQueue.findMany({
      include: {
        job: {
          include: {
            queue: { select: { id: true, name: true, project: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.deadLetterQueue.count(),
  ]);
  res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});

router.post('/:id/requeue', requireAuth, async (req, res) => {
  const dlq = await prisma.deadLetterQueue.findUnique({ where: { id: req.params.id } });
  if (!dlq) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  const job = await prisma.job.update({
    where: { id: dlq.jobId },
    data: {
      status: 'pending',
      attempts: 0,
      runAt: new Date(),
      error: null,
      startedAt: null,
      finishedAt: null,
    },
  });
  await prisma.deadLetterQueue.delete({ where: { id: dlq.id } });
  res.json({ job });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.deadLetterQueue.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
