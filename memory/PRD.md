# PulseQueue Scheduler — PRD

## Original Problem
Build a production-ready enterprise-grade Distributed Job Scheduler ("PulseQueue Scheduler") that looks like a modern SaaS product — not a student CRUD dashboard. Strict tech stack chosen by user: **Node.js + Express + TypeScript + PostgreSQL + Prisma + Redis + BullMQ + Socket.IO + JWT (access+refresh) + React 19 + Vite + Tailwind + shadcn/ui**. Full scope of pages, workers, queues, DLQ, analytics, realtime.

## Architecture Delivered
- **Backend** on port 8001 (`Express + TS`, Prisma, PostgreSQL 15, Redis, Socket.IO). 15 normalized tables. 40+ REST endpoints. Swagger at `/api/docs`.
- **Worker** as separate supervisor process (`tsx watch src/worker/index.ts`). Atomic claim with optimistic locking + version increment. Heartbeat every 5s. Stale worker recovery every 10s. Cron scheduler every 5s.
- **Frontend** on port 3000 (Vite + React 19 + TS). 11 pages, glass sidebar, ⌘K command palette, dark/light themes, Socket.IO client, TanStack Query.
- **Auth**: JWT access (15m) + refresh (7d, rotated, SHA-256 hashed in DB), bcryptjs, httpOnly cookies, rate-limited.

## User Personas
- **DevOps engineer / SRE** — monitors queues, workers, and system health in realtime.
- **Backend engineer** — enqueues jobs, inspects failures, retries dead-lettered jobs.
- **Team lead** — reviews analytics for throughput, latency, retry trends.

## Implemented (2026-02)
- Full auth (register, login, refresh rotation, logout, /me, rate limiting)
- Organizations + memberships (owner/admin/member)
- Projects CRUD + Queues CRUD (pause/resume, concurrency, priority, retry policy, backoff)
- Jobs (immediate, delayed, scheduled, recurring cron, batch) with idempotency key + optimistic locking
- Worker engine: atomic claim, heartbeat, resource metrics, graceful shutdown (SIGTERM), stale recovery
- Dead Letter Queue + requeue + purge
- Analytics API (overview KPIs, timeseries, queue distribution, worker utilization)
- Realtime via Socket.IO (`job:created`, `job:updated`)
- 11 UI pages, seed data (3 projects × 3 queues × 12 jobs each = 108 seeded jobs)
- Swagger / OpenAPI
- Helmet, CORS, rate-limit, Zod validation

## Backlog
- **P1**: Docker Compose + Dockerfile bundling (partially deferred — env has bare-metal services)
- **P1**: Vitest + Supertest unit/integration tests
- **P2**: DAG job dependencies, external webhooks, Prometheus export, ER diagram image, sequence diagram
- **P2**: Multi-worker leader election for scheduler
- **P2**: Per-org RBAC in UI, audit-log viewer page

## Next Tasks
- Add automated test suite (Vitest + Supertest)
- Author docker-compose.yml bundling Postgres + Redis + backend + worker + frontend
- Add ER diagram (SVG) to `docs/`
- Verify landing page route and homepage branding before push
