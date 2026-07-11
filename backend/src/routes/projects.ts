import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

router.get('/', requireAuth, async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user!.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      _count: { select: { queues: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  // enrich with job stats
  const enriched = await Promise.all(
    projects.map(async (p) => {
      const queues = await prisma.queue.findMany({ where: { projectId: p.id }, select: { id: true } });
      const queueIds = queues.map((q) => q.id);
      const [total, running, failed, completed] = await Promise.all([
        prisma.job.count({ where: { queueId: { in: queueIds } } }),
        prisma.job.count({ where: { queueId: { in: queueIds }, status: 'running' } }),
        prisma.job.count({ where: { queueId: { in: queueIds }, status: 'failed' } }),
        prisma.job.count({ where: { queueId: { in: queueIds }, status: 'completed' } }),
      ]);
      return { ...p, stats: { total, running, failed, completed } };
    }),
  );
  res.json({ projects: enriched });
});

const createSchema = z.object({
  organizationId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    let orgId = body.organizationId;
    if (!orgId) {
      const m = await prisma.membership.findFirst({ where: { userId: req.user!.id } });
      if (!m) throw new AppError(400, 'NO_ORG', 'No organization for user');
      orgId = m.organizationId;
    }
    const slug = slugify(body.name) + '-' + Date.now().toString(36).slice(-4);
    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: body.name,
        slug,
        description: body.description,
        color: body.color || '#FF5A00',
      },
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { queues: true, organization: true },
    });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
