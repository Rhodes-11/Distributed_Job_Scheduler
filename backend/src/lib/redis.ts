import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export const bullConnection = {
  connection: {
    host: new URL(redisUrl).hostname,
    port: Number(new URL(redisUrl).port || 6379),
    maxRetriesPerRequest: null,
  },
};

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[redis] error:', err.message);
});
