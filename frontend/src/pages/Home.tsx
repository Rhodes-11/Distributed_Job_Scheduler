import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Cpu, Activity, Boxes, ShieldCheck, Sparkles } from 'lucide-react';

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/60 via-transparent to-[#020617]/80" />
        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <header className="flex items-center justify-between border-b border-white/10 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-white text-lg font-bold">PQ</div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">PulseQueue</p>
                <p className="text-xs text-white/40">Distributed job scheduling</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-white/80 transition hover:text-white">
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link to="/register">Start free</Link>
              </Button>
            </div>
          </header>

          <main className="grid gap-16 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <section className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
                Enterprise job scheduling
              </div>
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  The scheduler your <span className="text-red-500">production workloads</span> deserve.
                </h1>
                <p className="max-w-xl text-base leading-8 text-white/70 sm:text-lg">
                  PulseQueue is a distributed job scheduling platform built for engineers who care about durability, observability, and blast radius. Ship background work with atomic claiming, cron schedules, retries, and a dead-letter queue in a UI that treats operators like adults.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/register">Get started</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/login" className="inline-flex items-center gap-2">Log in as admin <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-2xl shadow-black/20">
                <div className="font-medium text-white">Demo credentials</div>
                <div className="font-mono mt-2">demo@pulsequeue.dev · demo1234</div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Boxes, title: 'Priority Queues', description: 'Multi-tenant queues with concurrency, priority weights, pause/resume, and retry policies.' },
                { icon: Cpu, title: 'Distributed Workers', description: 'Atomic claiming, heartbeat monitoring, and automatic recovery of crashed nodes.' },
                { icon: Activity, title: 'Realtime Telemetry', description: 'WebSocket-powered dashboards for queue depth, latency, worker health, and throughput.' },
                { icon: ShieldCheck, title: 'Auth & Multi-tenant', description: 'JWT with refresh tokens, organization scoping, and hardened session controls.' },
                { icon: Sparkles, title: 'Retries & DLQ', description: 'Exponential backoff, capped attempts, and first-class dead-letter queues for post-mortems.' },
                { icon: ArrowRight, title: 'Cron & Delayed Jobs', description: 'Recurring schedules, one-shot delayed jobs, and idempotency guarantees.' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 transition hover:border-white/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-red-400">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/70">{feature.description}</p>
                </div>
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
