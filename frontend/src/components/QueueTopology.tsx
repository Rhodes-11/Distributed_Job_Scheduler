import { motion } from 'framer-motion';
import { Cpu, Boxes, Skull, CheckCircle2 } from 'lucide-react';

// Animated system topology — queues → workers → outcomes.
// Flowing gradient edges + pulsing nodes = "jobs moving through the pipeline".
export const QueueTopology = ({ counts }: { counts: { queued: number; running: number; completed: number; failed: number; dead: number; workers: number } }) => {
  const c = counts || ({} as any);
  const nodes = {
    queues: { x: 80, y: 130, label: 'Queues', value: c.queued || 0, color: '#8B5CF6', icon: Boxes },
    running: { x: 330, y: 60, label: 'Running', value: c.running || 0, color: '#38BDF8', icon: Cpu },
    workers: { x: 330, y: 200, label: 'Workers', value: c.workers || 0, color: '#FF5A00', icon: Cpu },
    ok: { x: 600, y: 60, label: 'Completed', value: c.completed || 0, color: '#10B981', icon: CheckCircle2 },
    dlq: { x: 600, y: 200, label: 'DLQ', value: c.dead || 0, color: '#EF4444', icon: Skull },
  };
  const edges = [
    { from: 'queues', to: 'running', color: '#38BDF8' },
    { from: 'queues', to: 'workers', color: '#FF5A00' },
    { from: 'running', to: 'ok', color: '#10B981' },
    { from: 'workers', to: 'ok', color: '#10B981' },
    { from: 'workers', to: 'dlq', color: '#EF4444' },
  ];

  return (
    <div className="relative h-[280px]" data-testid="topology">
      <svg viewBox="0 0 700 260" className="absolute inset-0 h-full w-full">
        <defs>
          {edges.map((e, i) => (
            <linearGradient key={i} id={`edge-${i}`} gradientUnits="userSpaceOnUse"
              x1={(nodes as any)[e.from].x} y1={(nodes as any)[e.from].y}
              x2={(nodes as any)[e.to].x} y2={(nodes as any)[e.to].y}>
              <stop offset="0%" stopColor={e.color} stopOpacity="0" />
              <stop offset="45%" stopColor={e.color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={e.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const a = (nodes as any)[e.from], b = (nodes as any)[e.to];
          const mx = (a.x + b.x) / 2, my = a.y < b.y ? a.y - 30 : a.y + 30;
          const d = `M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
          return (
            <g key={i}>
              <path d={d} stroke="hsl(var(--border))" strokeWidth={1} fill="none" />
              <path d={d} stroke={`url(#edge-${i})`} strokeWidth={2} fill="none" className="stream-dash" />
            </g>
          );
        })}
      </svg>
      {Object.entries(nodes).map(([k, n]) => (
        <motion.div
          key={k}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background/70 backdrop-blur-xl px-3 py-2 min-w-[110px]"
          style={{ left: n.x, top: n.y, boxShadow: `0 0 0 1px ${n.color}30, 0 14px 40px -14px ${n.color}90` }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + Math.random() * 0.3 }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full animate-pulse-dot" style={{ background: n.color, boxShadow: `0 0 10px ${n.color}` }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{n.label}</span>
          </div>
          <div className="font-heading text-2xl font-medium tabular-nums" style={{ color: n.color }}>{n.value}</div>
        </motion.div>
      ))}
    </div>
  );
};
