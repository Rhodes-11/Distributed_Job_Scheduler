import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma';
import { hashPassword } from './lib/auth';
import { logger } from './lib/logger';

export const seedDatabase = async (): Promise<void> => {
  const email = (process.env.ADMIN_EMAIL || 'demo@pulsequeue.dev').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'demo1234';

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Demo Operator',
        role: 'owner',
        passwordHash: await hashPassword(password),
      },
    });
    logger.info(`seed: created demo user ${email} / ${password}`);
  }

  let org = await prisma.organization.findFirst({
    where: { memberships: { some: { userId: user.id } } },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Acme Systems', slug: 'acme-systems' },
    });
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
    });
  }

  const existingProjects = await prisma.project.count({ where: { organizationId: org.id } });
  if (existingProjects > 0) return;

  const projectsData = [
    { name: 'Notifications', color: '#FF5A00', description: 'Email, push, and SMS delivery pipeline.' },
    { name: 'Data Pipeline', color: '#3B82F6', description: 'ETL, batch ingestion and warehouse sync.' },
    { name: 'Media Processing', color: '#8B5CF6', description: 'Video transcoding & image optimization.' },
  ];
  const queueTemplates = [
    { name: 'high-priority', concurrency: 10, priority: 10 },
    { name: 'default', concurrency: 5, priority: 0 },
    { name: 'batch', concurrency: 2, priority: -5 },
  ];

  const now = Date.now();
  for (const pd of projectsData) {
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: pd.name,
        slug: pd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: pd.description,
        color: pd.color,
      },
    });
    for (const qt of queueTemplates) {
      const queue = await prisma.queue.create({
        data: {
          projectId: project.id,
          name: `${pd.name} · ${qt.name}`,
          slug: `${project.slug}-${qt.name}`,
          concurrency: qt.concurrency,
          priority: qt.priority,
          maxAttempts: 3,
          backoffType: 'exponential',
          backoffDelayMs: 2000,
        },
      });
      // create sample jobs
      const jobsData: Prisma.JobCreateManyInput[] = [];
      for (let i = 0; i < 12; i++) {
        const r = Math.random();
        const status =
          r < 0.45
            ? 'completed'
            : r < 0.6
              ? 'failed'
              : r < 0.7
                ? 'running'
                : r < 0.85
                  ? 'queued'
                  : 'pending';
        const startedAt =
          status === 'completed' || status === 'failed' || status === 'running'
            ? new Date(now - Math.random() * 6 * 60 * 60 * 1000)
            : null;
        const finishedAt =
          status === 'completed' || status === 'failed'
            ? new Date(
                (startedAt?.getTime() || now - 1000) + Math.round(500 + Math.random() * 30000),
              )
            : null;
        jobsData.push({
          queueId: queue.id,
          name: `${qt.name}-task-${i + 1}`,
          type: 'immediate',
          status,
          priority: Math.floor(Math.random() * 10),
          payload: JSON.stringify({ orderId: Math.floor(Math.random() * 1_000_000), attempt: i + 1 }),
          attempts: status === 'failed' ? 3 : 1,
          maxAttempts: 3,
          runAt: new Date(now - Math.random() * 12 * 60 * 60 * 1000),
          startedAt,
          finishedAt,
          error: status === 'failed' ? 'Simulated transient upstream error' : null,
        });
      }
      await prisma.job.createMany({ data: jobsData });
    }
  }

  logger.info(`seed: created demo projects + queues + jobs`);
};

// allow standalone run
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'seed failed');
      process.exit(1);
    });
}
