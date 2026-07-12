-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "avatar_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#FF5A00',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "backoff_type" TEXT NOT NULL DEFAULT 'exponential',
    "backoff_delay_ms" INTEGER NOT NULL DEFAULT 2000,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "queues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'immediate',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "run_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    "worker_id" TEXT,
    "parent_job_id" TEXT,
    "idempotency_key" TEXT,
    "lock_token" TEXT,
    "locked_until" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "jobs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL,
    "finished_at" DATETIME,
    "duration_ms" INTEGER,
    "result" TEXT,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_executions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_executions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "payload" TEXT NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" DATETIME,
    "next_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scheduled_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "current_job_id" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" DATETIME,
    "meta" TEXT
);

-- CreateTable
CREATE TABLE "worker_heartbeats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worker_id" TEXT NOT NULL,
    "cpu_pct" REAL NOT NULL,
    "mem_mb" REAL NOT NULL,
    "active_jobs" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worker_heartbeats_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dead_letter_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dead_letter_queue_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "projects"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "queues_is_paused_idx" ON "queues"("is_paused");

-- CreateIndex
CREATE UNIQUE INDEX "queues_project_id_slug_key" ON "queues"("project_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_queue_id_status_idx" ON "jobs"("queue_id", "status");

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "jobs_worker_id_idx" ON "jobs"("worker_id");

-- CreateIndex
CREATE INDEX "job_executions_job_id_idx" ON "job_executions"("job_id");

-- CreateIndex
CREATE INDEX "job_executions_worker_id_idx" ON "job_executions"("worker_id");

-- CreateIndex
CREATE INDEX "job_logs_job_id_created_at_idx" ON "job_logs"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "scheduled_jobs_next_run_at_is_active_idx" ON "scheduled_jobs"("next_run_at", "is_active");

-- CreateIndex
CREATE INDEX "workers_status_idx" ON "workers"("status");

-- CreateIndex
CREATE INDEX "worker_heartbeats_worker_id_created_at_idx" ON "worker_heartbeats"("worker_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_queue_job_id_key" ON "dead_letter_queue"("job_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
