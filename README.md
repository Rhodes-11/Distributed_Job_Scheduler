# PulseQueue Scheduler

**Enterprise Distributed Job Scheduling Platform**

A production-ready, realtime job scheduler with atomic claiming, worker heartbeats, exponential backoff, dead-letter queues, cron schedules, and a premium dashboard inspired by Linear · Vercel · Datadog · Grafana.

---

## Tech Stack

**Backend** — Node.js 20 · Express · TypeScript · Prisma ORM · PostgreSQL 15 · Redis · BullMQ · Socket.IO · Zod · JWT (access + refresh with rotation) · bcryptjs · Helmet · Rate-limit · Swagger

**Frontend** — React 19 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Recharts · TanStack Query · Socket.IO client · React Router v7 · lucide-react

**Fonts** — Outfit (headings) · Manrope (body) · JetBrains Mono (code)

---

## Architecture

```
              ┌────────────────────┐     REST /api    ┌────────────────────┐
              │   React + Vite     │◀─────────────────│  Express + TS      │
              │  (glass sidebar,   │    Socket.IO     │  helmet · JWT      │
              │   command palette) │◀────────────────▶│  Zod validation    │
              └────────────────────┘                  └────────┬───────────┘
                                                               │  Prisma
                                                               ▼
                                                     ┌──────────────────┐
                                                     │  PostgreSQL 15   │
                                                     │  15 normalized   │
                                                     │  tables + FKs    │
                                                     └──────────────────┘
                                                               ▲
                          ┌──────────────────┐  atomic claim   │
                          │  Worker (tsx)    │─────────────────┘
                          │  heartbeats 5s   │
                          │  optimistic lock │
                          │  exp. backoff    │
                          │  DLQ · scheduler │
                          └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │    Redis     │
                            │   (BullMQ)   │
                            └──────────────┘
```

### Concurrency Guarantees
- **Atomic claim**: `updateMany({id, version})` — only one worker wins per job (optimistic locking)
- **Lock TTL**: 60s per running job; expired locks are recovered by scheduler
- **Stale worker recovery**: workers missing 30s+ heartbeat are marked offline; their in-flight jobs are re-queued
- **Idempotency**: unique `idempotency_key` column prevents duplicate enqueues
- **Graceful shutdown**: worker waits up to 25s for active jobs before exit

### Retry & DLQ Flow
```
job.pending → running → (success) → completed
              │
              └─(fail)─→ attempt++ → retry with exponential backoff (2s, 4s, 8s…)
                          │
                          └─(attempts ≥ maxAttempts)─→ dead → DeadLetterQueue
```

---

## Data Model (Prisma)

15 normalized tables with FKs, cascade rules, and indexes:

`users · organizations · memberships · refresh_tokens · projects · queues · jobs · job_executions · job_logs · scheduled_jobs · workers · worker_heartbeats · dead_letter_queue · audit_logs`

Full schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

---

## API — REST + OpenAPI

Interactive Swagger UI: **`/api/docs`**

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Projects | `GET /projects` · `POST /projects` · `GET /projects/:id` · `DELETE /projects/:id` |
| Queues | `GET /queues` · `POST /queues` · `PATCH /queues/:id` · `POST /queues/:id/pause` · `POST /queues/:id/resume` · `DELETE /queues/:id` |
| Jobs | `GET /jobs` (paginated, filterable, searchable) · `POST /jobs` · `GET /jobs/:id` · `POST /jobs/:id/retry` · `POST /jobs/:id/cancel` · `DELETE /jobs/:id` |
| Workers | `GET /workers` · `GET /workers/:id` |
| Analytics | `GET /analytics/overview` · `GET /analytics/timeseries` · `GET /analytics/queue-distribution` · `GET /analytics/worker-utilization` |
| DLQ | `GET /dlq` · `POST /dlq/:id/requeue` · `DELETE /dlq/:id` |
| Health | `GET /health` |

Realtime channel: `Socket.IO` at `/api/socket.io` (events: `job:created`, `job:updated`).

---

## Running Locally

Use `/` to access the public PulseQueue landing page before signing in.

```bash
# PostgreSQL + Redis must be running on defaults (5432, 6379)
# Container already has them installed.

# Backend
cd backend && yarn install && yarn prisma db push && yarn dev &

# Worker (single or multi-process)
cd backend && yarn worker &

# Frontend
cd frontend && yarn install && yarn dev
```

Supervisor manages all four (backend · worker · frontend + mongo).

**Demo credentials** — `demo@pulsequeue.dev` / `demo1234`

---

## Features Implemented

- ✅ **Auth**: JWT access + refresh rotation, bcrypt hashing, httpOnly cookies, rate-limited endpoints, secure refresh token hash storage
- ✅ **Multi-tenancy**: Users → Organizations → Memberships (owner/admin/member) → Projects → Queues
- ✅ **Queues**: create/pause/resume/delete, concurrency, priority, retry policy (fixed / exponential), max attempts
- ✅ **Job types**: immediate · delayed · scheduled · recurring (cron) · batch
- ✅ **Worker engine**: atomic claiming with optimistic locking, heartbeats, resource metrics, graceful shutdown, stale recovery
- ✅ **Dead Letter Queue**: automatic on max attempts + requeue / purge UI
- ✅ **Analytics**: KPIs, throughput timeseries, latency histogram, queue distribution pie, worker utilization
- ✅ **Realtime**: Socket.IO push for job created/updated
- ✅ **UI**: 11 pages (Dashboard, Projects, Queues, Jobs, Job Details, Workers, Analytics, Logs, DLQ, Settings, Login/Register), dark + light modes, glass sidebar, command palette (⌘K), keyboard shortcuts (⌘1–⌘8), status badges, animated counters, log viewer, JSON payload viewer, retry history timeline
- ✅ **Docs**: Swagger UI at `/api/docs`
- ✅ **Security**: helmet, CORS, rate-limit, SQL injection safe (Prisma parameterized), XSS-safe (React), bcrypt password hashing
- ✅ **Seed data**: 3 demo projects × 3 queues each × 12 jobs each

## Future Scope

- Multi-node worker cluster with Redis-based leader election for the scheduler
- Web-hook triggers + external event sources
- Job dependencies / DAGs (fan-out, fan-in)
- Per-org RBAC granularity, API keys, and audit-log UI
- Metrics export to Prometheus / OpenTelemetry
