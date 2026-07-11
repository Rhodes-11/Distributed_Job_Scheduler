export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PulseQueue Scheduler API',
    version: '1.0.0',
    description:
      'Enterprise Distributed Job Scheduling Platform. Manage queues, jobs, workers, schedules and the dead-letter queue.',
  },
  servers: [{ url: '/api', description: 'PulseQueue API' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/auth/register': { post: { summary: 'Register new user', tags: ['Auth'] } },
    '/auth/login': { post: { summary: 'Login', tags: ['Auth'] } },
    '/auth/refresh': { post: { summary: 'Refresh access token', tags: ['Auth'] } },
    '/auth/logout': { post: { summary: 'Logout', tags: ['Auth'] } },
    '/auth/me': { get: { summary: 'Current user', tags: ['Auth'] } },
    '/projects': {
      get: { summary: 'List projects', tags: ['Projects'] },
      post: { summary: 'Create project', tags: ['Projects'] },
    },
    '/queues': {
      get: { summary: 'List queues', tags: ['Queues'] },
      post: { summary: 'Create queue', tags: ['Queues'] },
    },
    '/queues/{id}/pause': { post: { summary: 'Pause queue', tags: ['Queues'] } },
    '/queues/{id}/resume': { post: { summary: 'Resume queue', tags: ['Queues'] } },
    '/jobs': {
      get: { summary: 'List jobs (paginated, filterable)', tags: ['Jobs'] },
      post: { summary: 'Enqueue job', tags: ['Jobs'] },
    },
    '/jobs/{id}': { get: { summary: 'Job details', tags: ['Jobs'] } },
    '/jobs/{id}/retry': { post: { summary: 'Retry job', tags: ['Jobs'] } },
    '/jobs/{id}/cancel': { post: { summary: 'Cancel job', tags: ['Jobs'] } },
    '/workers': { get: { summary: 'List workers', tags: ['Workers'] } },
    '/analytics/overview': { get: { summary: 'KPI overview', tags: ['Analytics'] } },
    '/analytics/timeseries': { get: { summary: 'Timeseries', tags: ['Analytics'] } },
    '/dlq': { get: { summary: 'List DLQ entries', tags: ['DLQ'] } },
    '/dlq/{id}/requeue': { post: { summary: 'Requeue DLQ job', tags: ['DLQ'] } },
    '/health': { get: { summary: 'Health check', tags: ['Health'] } },
  },
};
