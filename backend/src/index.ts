import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/error';
import { initIO } from './realtime/io';
import { swaggerSpec } from './lib/swagger';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import queueRoutes from './routes/queues';
import jobRoutes from './routes/jobs';
import workerRoutes from './routes/workers';
import analyticsRoutes from './routes/analytics';
import dlqRoutes from './routes/dlq';
import healthRoutes from './routes/health';

import { seedDatabase } from './seed';

const PORT = Number(process.env.PORT || 8001);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// generic rate limit for API
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dlq', dlqRoutes);
app.use('/api/health', healthRoutes);

// 404
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
});

app.use(errorHandler);

const server = http.createServer(app);
initIO(server, true);

server.listen(PORT, HOST, async () => {
  logger.info(`PulseQueue API listening on http://${HOST}:${PORT}`);
  try {
    await seedDatabase();
  } catch (err) {
    logger.error({ err }, 'seed failed');
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
