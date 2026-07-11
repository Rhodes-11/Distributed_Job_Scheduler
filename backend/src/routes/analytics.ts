import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/overview', requireAuth, async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalToday,
    queued,
    running,
    completed,
    failed,
    dead,
    workers,
    healthyWorkers,
    queues,
    pausedQueues,
    completedToday,
    failedToday,
  ] = await Promise.all([
    prisma.job.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.job.count({ where: { status: 'queued' } }),
    prisma.job.count({ where: { status: 'running' } }),
    prisma.job.count({ where: { status: 'completed' } }),
    prisma.job.count({ where: { status: 'failed' } }),
    prisma.job.count({ where: { status: 'dead' } }),
    prisma.worker.count(),
    prisma.worker.count({
      where: { lastHeartbeatAt: { gte: new Date(Date.now() - 15_000) } },
    }),
    prisma.queue.count(),
    prisma.queue.count({ where: { isPaused: true } }),
    prisma.job.count({ where: { status: 'completed', finishedAt: { gte: startOfDay } } }),
    prisma.job.count({ where: { status: 'failed', finishedAt: { gte: startOfDay } } }),
  ]);

  // avg latency (running -> completed) today
  const finished = await prisma.job.findMany({
    where: { status: 'completed', finishedAt: { gte: startOfDay }, startedAt: { not: null } },
    select: { startedAt: true, finishedAt: true },
    take: 500,
  });
  let avgLatencyMs = 0;
  if (finished.length > 0) {
    const total = finished.reduce(
      (acc, j) => acc + (j.finishedAt!.getTime() - j.startedAt!.getTime()),
      0,
    );
    avgLatencyMs = Math.round(total / finished.length);
  }

  const retryCount = await prisma.jobExecution.count({ where: { attempt: { gt: 1 } } });

  // redis / db status
  let redisStatus = 'up';
  try {
    await redis.ping();
  } catch {
    redisStatus = 'down';
  }
  let dbStatus = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'down';
  }

  const successRate =
    completedToday + failedToday === 0
      ? 100
      : Math.round((completedToday / (completedToday + failedToday)) * 100);

  res.json({
    kpis: {
      totalToday,
      queued,
      running,
      completed,
      failed,
      dead,
      workers,
      healthyWorkers,
      queues,
      pausedQueues,
      avgLatencyMs,
      retryCount,
      successRate,
    },
    system: {
      redisStatus,
      dbStatus,
      cpuPct: Math.round(process.cpuUsage().user / 1000 / 1000) % 100,
      memMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  });
});

router.get('/timeseries', requireAuth, async (req, res) => {
  const hours = Number((req.query.hours as string) || 24);
  const buckets = 24;
  const now = new Date();
  const bucketMs = (hours * 60 * 60 * 1000) / buckets;
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const jobs = await prisma.job.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, status: true, startedAt: true, finishedAt: true },
  });

  const series: {
    ts: string;
    completed: number;
    failed: number;
    running: number;
    total: number;
    avgLatency: number;
  }[] = [];

  for (let i = 0; i < buckets; i++) {
    const bStart = new Date(start.getTime() + i * bucketMs);
    const bEnd = new Date(bStart.getTime() + bucketMs);
    const inBucket = jobs.filter((j) => j.createdAt >= bStart && j.createdAt < bEnd);
    const completed = inBucket.filter((j) => j.status === 'completed').length;
    const failed = inBucket.filter((j) => j.status === 'failed' || j.status === 'dead').length;
    const running = inBucket.filter((j) => j.status === 'running').length;
    const withDur = inBucket.filter((j) => j.startedAt && j.finishedAt);
    const avgLatency =
      withDur.length === 0
        ? 0
        : Math.round(
            withDur.reduce((acc, j) => acc + (j.finishedAt!.getTime() - j.startedAt!.getTime()), 0) /
              withDur.length,
          );
    series.push({
      ts: bStart.toISOString(),
      completed,
      failed,
      running,
      total: inBucket.length,
      avgLatency,
    });
  }
  res.json({ series });
});

router.get('/queue-distribution', requireAuth, async (_req, res) => {
  const queues = await prisma.queue.findMany({ select: { id: true, name: true } });
  const data = await Promise.all(
    queues.map(async (q) => {
      const count = await prisma.job.count({ where: { queueId: q.id } });
      return { name: q.name, value: count };
    }),
  );
  res.json({ data });
});

router.get('/worker-utilization', requireAuth, async (_req, res) => {
  const workers = await prisma.worker.findMany({
    include: {
      heartbeats: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  const data = workers.map((w) => ({
    name: w.name,
    cpu: w.heartbeats[0]?.cpuPct || 0,
    mem: w.heartbeats[0]?.memMb || 0,
    active: w.heartbeats[0]?.activeJobs || 0,
  }));
  res.json({ data });
});

export default router;
