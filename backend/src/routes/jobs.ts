import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import cronParser from 'cron-parser';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { getIO } from '../realtime/io';

const router = Router();

const parseJsonString = (value: string | null | undefined) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeJob = (job: any) => ({
  ...job,
  payload: parseJsonString(job.payload),
  result: parseJsonString(job.result),
});

const createSchema = z.object({
  queueId: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: z.enum(['immediate', 'delayed', 'scheduled', 'recurring', 'batch']).optional(),
  priority: z.number().int().optional(),
  payload: z.record(z.string(), z.any()).optional(),
  runAt: z.string().datetime().optional(),
  delayMs: z.number().int().min(0).optional(),
  cron: z.string().optional(),
  idempotencyKey: z.string().optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const queue = await prisma.queue.findUnique({ where: { id: body.queueId } });
    if (!queue) throw new AppError(404, 'QUEUE_NOT_FOUND', 'Queue not found');
    let runAt = new Date();
    if (body.runAt) runAt = new Date(body.runAt);
    else if (body.delayMs) runAt = new Date(Date.now() + body.delayMs);

    if (body.type === 'recurring') {
      if (!body.cron) throw new AppError(400, 'CRON_REQUIRED', 'Cron expression is required for recurring jobs');
      const interval = cronParser.parseExpression(body.cron);
      const next = interval.next().toDate();
      await prisma.scheduledJob.create({
        data: {
          queueId: body.queueId,
          name: body.name,
          cron: body.cron,
          payload: JSON.stringify(body.payload || {}),
          nextRunAt: next,
        },
      });
      res.status(201).json({ scheduled: true, nextRunAt: next });
      return;
    }

    const job = await prisma.job.create({
      data: {
        queueId: body.queueId,
        name: body.name,
        type: body.type ?? 'immediate',
        status: runAt > new Date() ? 'delayed' : 'pending',
        priority: body.priority ?? 0,
        payload: JSON.stringify(body.payload || {}),
        runAt,
        idempotencyKey: body.idempotencyKey,
        maxAttempts: body.maxAttempts ?? queue.maxAttempts,
      },
    });
    getIO()?.emit('job:created', { job: normalizeJob(job) });
    res.status(201).json({ job: normalizeJob(job) });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res) => {
  const {
    queueId,
    projectId,
    status,
    search,
    page = '1',
    limit = '20',
    sort = 'createdAt',
    order = 'desc',
  } = req.query as Record<string, string>;
  const where: Prisma.JobWhereInput = {};
  if (queueId) where.queueId = queueId;
  if (projectId) where.queue = { projectId };
  if (status) where.status = status as never;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { queue: { select: { id: true, name: true, project: { select: { name: true, color: true } } } } },
      orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.job.count({ where }),
  ]);
  res.json({ items: items.map(normalizeJob), page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        queue: { include: { project: true } },
        worker: true,
        executions: { orderBy: { attempt: 'asc' } },
        logs: { orderBy: { createdAt: 'asc' }, take: 500 },
      },
    });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job not found');
    res.json({ job: normalizeJob(job) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', requireAuth, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job not found');
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'pending',
        error: null,
        result: undefined,
        runAt: new Date(),
        startedAt: null,
        finishedAt: null,
        workerId: null,
        lockToken: null,
        lockedUntil: null,
        attempts: 0,
      },
    });
    await prisma.deadLetterQueue.deleteMany({ where: { jobId: job.id } });
    getIO()?.emit('job:updated', { job: updated });
    res.json({ job: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'cancelled', finishedAt: new Date() },
    });
    getIO()?.emit('job:updated', { job: normalizeJob(updated) });
    res.json({ job: normalizeJob(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
