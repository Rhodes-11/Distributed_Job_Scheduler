import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const map: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'queued' | 'secondary'; label: string; dot: string }> = {
  pending: { variant: 'secondary', label: 'Pending', dot: 'bg-zinc-400' },
  queued: { variant: 'queued', label: 'Queued', dot: 'bg-violet-500' },
  running: { variant: 'info', label: 'Running', dot: 'bg-blue-500 animate-pulse-dot' },
  completed: { variant: 'success', label: 'Completed', dot: 'bg-emerald-500' },
  failed: { variant: 'destructive', label: 'Failed', dot: 'bg-red-500' },
  cancelled: { variant: 'secondary', label: 'Cancelled', dot: 'bg-zinc-500' },
  delayed: { variant: 'warning', label: 'Delayed', dot: 'bg-amber-500' },
  dead: { variant: 'destructive', label: 'Dead', dot: 'bg-red-600' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const s = map[status] || map.pending;
  return (
    <Badge variant={s.variant} className="gap-1.5 font-medium">
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </Badge>
  );
};
