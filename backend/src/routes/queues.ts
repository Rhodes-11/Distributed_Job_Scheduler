import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

router.get('/', requireAuth, async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const where = projectId ? { projectId } : {};
  const queues = await prisma.queue.findMany({
    where,
    include: { project: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: 'desc' },
  });
  // add live stats
  const stats = await Promise.all(
    queues.map(async (q) => {
      const [pending, queued, running, completed, failed, dead] = await Promise.all([
        prisma.job.count({ where: { queueId: q.id, status: 'pending' } }),
        prisma.job.count({ where: { queueId: q.id, status: 'queued' } }),
        prisma.job.count({ where: { queueId: q.id, status: 'running' } }),
        prisma.job.count({ where: { queueId: q.id, status: 'completed' } }),
        prisma.job.count({ where: { queueId: q.id, status: 'failed' } }),
        prisma.job.count({ where: { queueId: q.id, status: 'dead' } }),
      ]);
      return { ...q, stats: { pending, queued, running, completed, failed, dead } };
    }),
  );
  res.json({ queues: stats });
});

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  concurrency: z.number().int().min(1).max(100).optional(),
  priority: z.number().int().optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  backoffType: z.enum(['fixed', 'exponential']).optional(),
  backoffDelayMs: z.number().int().min(100).optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const slug = slugify(body.name) + '-' + Date.now().toString(36).slice(-4);
    const queue = await prisma.queue.create({
      data: {
        projectId: body.projectId,
        name: body.name,
        slug,
        description: body.description,
        concurrency: body.concurrency ?? 5,
        priority: body.priority ?? 0,
        maxAttempts: body.maxAttempts ?? 3,
        backoffType: body.backoffType ?? 'exponential',
        backoffDelayMs: body.backoffDelayMs ?? 2000,
      },
    });
    res.status(201).json({ queue });
  } catch (err) {
    next(err);
  }
});

const patchSchema = createSchema.partial().omit({ projectId: true }).extend({
  isPaused: z.boolean().optional(),
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const queue = await prisma.queue.update({ where: { id: req.params.id }, data: body });
    res.json({ queue });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/pause', requireAuth, async (req, res) => {
  const queue = await prisma.queue.update({ where: { id: req.params.id }, data: { isPaused: true } });
  res.json({ queue });
});

router.post('/:id/resume', requireAuth, async (req, res) => {
  const queue = await prisma.queue.update({ where: { id: req.params.id }, data: { isPaused: false } });
  res.json({ queue });
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.queue.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: req.params.id },
      include: { project: true, scheduledJobs: true },
    });
    if (!queue) throw new AppError(404, 'NOT_FOUND', 'Queue not found');
    res.json({ queue });
  } catch (err) {
    next(err);
  }
});

export default router;
