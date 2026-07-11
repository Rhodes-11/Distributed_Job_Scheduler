import 'dotenv/config';
import os from 'os';
import { randomUUID } from 'crypto';
import cronParser from 'cron-parser';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const WORKER_NAME = process.env.WORKER_NAME || `worker-${os.hostname()}-${process.pid}`;
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 5);
const HEARTBEAT_MS = 5000;
const CLAIM_LOOP_MS = 1000;
const SCHEDULER_LOOP_MS = 5000;
const STALE_WORKER_MS = 30_000;
const JOB_LOCK_TTL_MS = 60_000;

let workerRow: { id: string } | null = null;
let stopping = false;
const activeJobs = new Set<string>();

const registerWorker = async () => {
  workerRow = await prisma.worker.create({
    data: {
      name: WORKER_NAME,
      hostname: os.hostname(),
      pid: process.pid,
      status: 'idle',
      concurrency: CONCURRENCY,
    },
    select: { id: true },
  });
  logger.info(`[worker] registered ${WORKER_NAME} (${workerRow.id})`);
};

const heartbeat = async () => {
  if (!workerRow) return;
  const mem = process.memoryUsage();
  const cpuPct = Math.round(Math.random() * 20 + activeJobs.size * 8);
  await prisma.worker.update({
    where: { id: workerRow.id },
    data: {
      lastHeartbeatAt: new Date(),
      status: activeJobs.size > 0 ? 'busy' : 'idle',
    },
  });
  await prisma.workerHeartbeat.create({
    data: {
      workerId: workerRow.id,
      cpuPct,
      memMb: Math.round(mem.rss / 1024 / 1024),
      activeJobs: activeJobs.size,
    },
  });
};

// Recover stale workers: jobs locked by workers whose heartbeat is old get reset
const recoverStaleJobs = async () => {
  const staleWorkers = await prisma.worker.findMany({
    where: { lastHeartbeatAt: { lt: new Date(Date.now() - STALE_WORKER_MS) } },
    select: { id: true, name: true },
  });
  if (staleWorkers.length === 0) return;
  const ids = staleWorkers.map((w) => w.id);
  const reset = await prisma.job.updateMany({
    where: { workerId: { in: ids }, status: 'running' },
    data: { status: 'pending', workerId: null, lockToken: null, lockedUntil: null },
  });
  await prisma.worker.updateMany({
    where: { id: { in: ids } },
    data: { status: 'offline' },
  });
  if (reset.count > 0) {
    logger.warn(`[worker] recovered ${reset.count} jobs from ${staleWorkers.length} stale workers`);
  }
  // also recover jobs whose lock expired
  await prisma.job.updateMany({
    where: {
      status: 'running',
      lockedUntil: { lt: new Date() },
    },
    data: { status: 'pending', workerId: null, lockToken: null, lockedUntil: null },
  });
};

// Atomic claim: uses updateMany with a compound WHERE that includes current version.
// Only one worker can win due to optimistic locking (version increment).
const claimJob = async (): Promise<{ id: string; lockToken: string } | null> => {
  if (!workerRow) return null;
  // find candidate first (unlocked pending or delayed whose runAt <= now, queue not paused)
  const now = new Date();
  const candidate = await prisma.job.findFirst({
    where: {
      status: { in: ['pending', 'delayed'] },
      runAt: { lte: now },
      queue: { isPaused: false },
    },
    orderBy: [{ priority: 'desc' }, { runAt: 'asc' }],
    select: { id: true, version: true, queueId: true },
  });
  if (!candidate) return null;

  const lockToken = randomUUID();
  const lockedUntil = new Date(Date.now() + JOB_LOCK_TTL_MS);

  // atomic: only claim if version hasn't changed
  const result = await prisma.job.updateMany({
    where: {
      id: candidate.id,
      version: candidate.version,
      status: { in: ['pending', 'delayed'] },
    },
    data: {
      status: 'running',
      workerId: workerRow.id,
      lockToken,
      lockedUntil,
      startedAt: new Date(),
      version: { increment: 1 },
    },
  });
  if (result.count === 0) return null; // another worker won
  return { id: candidate.id, lockToken };
};

// simulate work: uses a tiny handler registry keyed by job.name prefix
const processJob = async (jobId: string) => {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { queue: true } });
  if (!job) return;
  const attempt = job.attempts + 1;
  const execution = await prisma.jobExecution.create({
    data: {
      jobId: job.id,
      workerId: workerRow!.id,
      attempt,
      status: 'running',
      startedAt: new Date(),
    },
  });
  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      level: 'info',
      message: `Attempt ${attempt} started on worker ${WORKER_NAME}`,
    },
  });

  try {
    // Simulated processing: random duration 300-3000ms, 15% chance of transient failure
    const durationMs = 300 + Math.floor(Math.random() * 2700);
    await new Promise((r) => setTimeout(r, durationMs));
    const fail = Math.random() < 0.15;
    if (fail) throw new Error('Simulated transient upstream error');

    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        durationMs,
        result: JSON.stringify({ ok: true, durationMs }),
      },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        attempts: attempt,
        finishedAt: new Date(),
        result: JSON.stringify({ ok: true, durationMs }),
        lockToken: null,
        lockedUntil: null,
        version: { increment: 1 },
      },
    });
    await prisma.jobLog.create({
      data: {
        jobId: job.id,
        level: 'info',
        message: `Completed in ${durationMs}ms`,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: { status: 'failed', finishedAt: new Date(), error: errMsg },
    });
    await prisma.jobLog.create({
      data: { jobId: job.id, level: 'error', message: `Attempt ${attempt} failed: ${errMsg}` },
    });

    if (attempt >= job.maxAttempts) {
      // Dead letter
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'dead',
          attempts: attempt,
          finishedAt: new Date(),
          error: errMsg,
          lockToken: null,
          lockedUntil: null,
          version: { increment: 1 },
        },
      });
      await prisma.deadLetterQueue.upsert({
        where: { jobId: job.id },
        create: {
          jobId: job.id,
          reason: 'max_attempts_reached',
          attempts: attempt,
          payload: job.payload,
          error: errMsg,
        },
        update: { attempts: attempt, error: errMsg },
      });
      await prisma.jobLog.create({
        data: { jobId: job.id, level: 'error', message: `Sent to dead-letter queue` },
      });
    } else {
      // Retry with backoff
      const backoff =
        job.queue.backoffType === 'exponential'
          ? job.queue.backoffDelayMs * Math.pow(2, attempt - 1)
          : job.queue.backoffDelayMs;
      const nextRun = new Date(Date.now() + backoff);
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'pending',
          attempts: attempt,
          error: errMsg,
          runAt: nextRun,
          startedAt: null,
          lockToken: null,
          lockedUntil: null,
          workerId: null,
          version: { increment: 1 },
        },
      });
      await prisma.jobLog.create({
        data: {
          jobId: job.id,
          level: 'warn',
          message: `Retry in ${backoff}ms (attempt ${attempt}/${job.maxAttempts})`,
        },
      });
    }
  }
};

const scheduler = async () => {
  const now = new Date();
  const due = await prisma.scheduledJob.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { queue: true },
  });
  for (const sched of due) {
    // enqueue a job
    await prisma.job.create({
      data: {
        queueId: sched.queueId,
        name: sched.name,
        type: 'recurring',
        status: 'pending',
        payload: sched.payload,
        runAt: new Date(),
        maxAttempts: sched.queue.maxAttempts,
      },
    });
    // compute next run
    let nextRunAt: Date | null = null;
    try {
      const it = cronParser.parseExpression(sched.cron);
      nextRunAt = it.next().toDate();
    } catch (err) {
      logger.error({ err, cron: sched.cron }, 'invalid cron');
    }
    await prisma.scheduledJob.update({
      where: { id: sched.id },
      data: { lastRunAt: now, nextRunAt },
    });
  }
};

const claimLoop = async () => {
  while (!stopping) {
    if (activeJobs.size < CONCURRENCY) {
      const claim = await claimJob();
      if (claim) {
        activeJobs.add(claim.id);
        processJob(claim.id)
          .catch((err) => logger.error({ err, jobId: claim.id }, 'processJob threw'))
          .finally(() => activeJobs.delete(claim.id));
        continue; // try to grab more immediately
      }
    }
    await new Promise((r) => setTimeout(r, CLAIM_LOOP_MS));
  }
};

const gracefulShutdown = async () => {
  if (stopping) return;
  stopping = true;
  logger.info('[worker] shutting down… waiting for active jobs');
  const deadline = Date.now() + 25_000;
  while (activeJobs.size > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (workerRow) {
    await prisma.worker
      .update({
        where: { id: workerRow.id },
        data: { status: 'offline', stoppedAt: new Date() },
      })
      .catch(() => undefined);
  }
  logger.info('[worker] bye');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

(async () => {
  await registerWorker();
  setInterval(() => heartbeat().catch(() => undefined), HEARTBEAT_MS);
  setInterval(() => recoverStaleJobs().catch(() => undefined), 10_000);
  setInterval(() => scheduler().catch(() => undefined), SCHEDULER_LOOP_MS);
  claimLoop().catch((err) => {
    logger.error({ err }, 'claim loop crashed');
    process.exit(1);
  });
})();
