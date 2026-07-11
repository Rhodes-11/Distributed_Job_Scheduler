import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';
import { Activity, Zap, Skull, CheckCircle2, XCircle, Cpu, Boxes, Timer, Repeat2, Database, Server, Gauge, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/providers/SocketProvider';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { MagneticCard } from '@/components/MagneticCard';
import { ParticleField } from '@/components/ParticleField';
import { QueueTopology } from '@/components/QueueTopology';
import { cn, formatDuration } from '@/lib/utils';

const StatusDot = ({ up, label }: { up: boolean; label: string }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <span className={cn('inline-flex h-2 w-2 rounded-full', up ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-500')}
      style={{ boxShadow: up ? '0 0 10px #10B981' : '0 0 10px #EF4444' }} />
    {label}
  </div>
);

const KpiCard = ({ label, value, icon: Icon, hint, tint, suffix, glow }: any) => (
  <MagneticCard glow={glow || 'purple'} className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className="mt-2 font-heading text-3xl font-medium tracking-tight tabular-nums" style={{ color: tint }}>
          <AnimatedNumber value={value || 0} suffix={suffix || ''} />
        </div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border" style={{ background: `${tint}15`, color: tint, boxShadow: `0 0 24px -6px ${tint}80` }}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
    </div>
  </MagneticCard>
);

export const DashboardPage = () => {
  const socket = useSocket();
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.get('/analytics/overview').then((r) => r.data), refetchInterval: 4000 });
  const series = useQuery({ queryKey: ['ts'], queryFn: () => api.get('/analytics/timeseries?hours=24').then((r) => r.data), refetchInterval: 8000 });
  const [pulse, setPulse] = useState(0);
  useEffect(() => { if (!socket) return; const h = () => setPulse((p) => p + 1); socket.on('job:created', h); socket.on('job:updated', h); return () => { socket.off('job:created', h); socket.off('job:updated', h); }; }, [socket]);

  const k = overview.data?.kpis || {};
  const sys = overview.data?.system || {};
  const successRateData = [{ name: 'sr', value: k.successRate || 0, fill: '#8B5CF6' }];

  return (
    <div className="relative space-y-8" data-testid="dashboard-page">
      <div className="pointer-events-none fixed inset-0 mesh-bg" />

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-xl">
        <ParticleField />
        <div className="relative p-6 lg:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse-dot" /> Live · realtime · streaming
              </div>
              <h1 className="mt-3 font-heading text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-r from-white via-violet-200 to-sky-300 bg-clip-text text-transparent">
                Distributed Scheduler
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">A live topology of every queue, worker and job — atomically coordinated, retried with backoff, and streamed to you in realtime.</p>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-background/60 backdrop-blur px-4 py-3">
              <StatusDot up={sys.dbStatus === 'up'} label="Postgres" />
              <span className="h-4 w-px bg-border" />
              <StatusDot up={sys.redisStatus === 'up'} label="Redis" />
              <span className="h-4 w-px bg-border" />
              <div className="text-xs text-muted-foreground"><span className="font-mono text-primary">{pulse}</span> events</div>
            </div>
          </div>

          {/* TOPOLOGY */}
          <div className="mt-6 rounded-xl border border-border bg-background/40 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Topology</div>
                <div className="text-sm text-foreground/90">Jobs streaming through the pipeline</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> queued
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 ml-3" /> running
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-3" /> completed
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-3" /> failed
              </div>
            </div>
            <QueueTopology counts={{ queued: k.queued, running: k.running, completed: k.completed, failed: k.failed, dead: k.dead, workers: k.healthyWorkers }} />
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Jobs", value: k.totalToday, icon: Zap, tint: '#FF5A00', glow: 'amber', hint: 'Enqueued in last 24h' },
          { label: 'Running', value: k.running, icon: Activity, tint: '#38BDF8', glow: 'blue' },
          { label: 'Queued', value: k.queued, icon: Boxes, tint: '#8B5CF6', glow: 'purple' },
          { label: 'Completed', value: k.completed, icon: CheckCircle2, tint: '#10B981', glow: 'blue' },
          { label: 'Failed', value: k.failed, icon: XCircle, tint: '#EF4444', glow: 'purple' },
          { label: 'Dead Letter', value: k.dead, icon: Skull, tint: '#EF4444', glow: 'purple' },
          { label: 'Workers Online', value: k.healthyWorkers, icon: Cpu, tint: '#10B981', glow: 'blue', hint: `of ${k.workers || 0} total` },
          { label: 'Retries', value: k.retryCount, icon: Repeat2, tint: '#F59E0B', glow: 'amber' },
        ].map((c) => (
          <motion.div key={c.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <KpiCard {...c} />
          </motion.div>
        ))}
      </motion.div>

      {/* THROUGHPUT + SUCCESS DIAL */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MagneticCard glow="blue" className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Throughput</div>
              <div className="font-heading text-lg font-medium">Job flow · last 24 hours</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-500" /> Failed</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sky-400" /> Running</span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.data?.series || []} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.6} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.5} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gRun" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38BDF8" stopOpacity={0.5} /><stop offset="100%" stopColor="#38BDF8" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="ts" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => new Date(v).getHours() + 'h'} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="completed" stroke="#10B981" fill="url(#gComp)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="#EF4444" fill="url(#gFail)" strokeWidth={2} />
                <Area type="monotone" dataKey="running" stroke="#38BDF8" fill="url(#gRun)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MagneticCard>

        <MagneticCard glow="purple" className="p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Success Rate</div>
          <div className="font-heading text-lg font-medium">Reliability score</div>
          <div className="h-[220px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={successRateData} startAngle={90} endAngle={-270}>
                <defs>
                  <linearGradient id="srGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#38BDF8" /></linearGradient>
                </defs>
                <RadialBar dataKey="value" cornerRadius={20} fill="url(#srGrad)" background={{ fill: 'hsl(var(--border) / 0.3)' } as any} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-32 text-center pointer-events-none">
            <div className="font-heading text-5xl font-medium bg-gradient-to-r from-violet-300 to-sky-300 bg-clip-text text-transparent tabular-nums">
              <AnimatedNumber value={k.successRate || 0} suffix="%" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">jobs succeeded</div>
          </div>
          <div className="mt-24 grid grid-cols-3 gap-2 text-center text-xs">
            <div><div className="text-muted-foreground text-[10px] uppercase">Latency</div><div className="font-mono">{formatDuration(k.avgLatencyMs)}</div></div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Queues</div><div className="font-mono">{k.queues || 0}</div></div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Paused</div><div className="font-mono">{k.pausedQueues || 0}</div></div>
          </div>
        </MagneticCard>
      </div>

      {/* SYSTEM VITALS */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
        <MagneticCard glow="amber" className="p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> CPU</div>
          <div className="font-heading text-4xl mt-2 tabular-nums"><AnimatedNumber value={sys.cpuPct || 0} suffix="%" /></div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" initial={{ width: 0 }} animate={{ width: `${Math.min(100, sys.cpuPct || 0)}%` }} transition={{ duration: 1 }} /></div>
        </MagneticCard>
        <MagneticCard glow="blue" className="p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><Database className="h-3.5 w-3.5" /> Memory</div>
          <div className="font-heading text-4xl mt-2 tabular-nums"><AnimatedNumber value={sys.memMb || 0} suffix=" MB" /></div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((sys.memMb || 0) / 512) * 100)}%` }} transition={{ duration: 1 }} /></div>
        </MagneticCard>
        <MagneticCard glow="purple" className="p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><Timer className="h-3.5 w-3.5" /> Avg Latency</div>
          <div className="font-heading text-4xl mt-2 tabular-nums"><AnimatedNumber value={k.avgLatencyMs || 0} suffix="ms" /></div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDuration(k.avgLatencyMs)} per job</div>
        </MagneticCard>
      </div>
    </div>
  );
};
