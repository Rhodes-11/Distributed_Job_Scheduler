import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Terminal } from 'lucide-react';
import { relTime } from '@/lib/utils';

export const LogsPage = () => {
  const { data } = useQuery({ queryKey: ['jobs-logs'], queryFn: () => api.get('/jobs?limit=50').then((r) => r.data), refetchInterval: 2500 });
  const items = data?.items || [];
  return (
    <div className="space-y-6" data-testid="logs-page">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Execution Logs</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Live Execution Feed</h1>
        <p className="text-sm text-muted-foreground mt-2">Realtime stream of recent job executions across queues.</p>
      </div>
      <Card className="overflow-hidden bg-[#0A0A0A] border-border">
        <div className="border-b border-border/50 bg-black/40 px-4 py-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[11px] text-zinc-400">pulsequeue://logs — tailing</span>
          <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
          {items.map((j: any) => (
            <div key={j.id} className="flex items-center gap-3 py-1 hover:bg-white/5 rounded px-2">
              <span className="text-zinc-500">{new Date(j.createdAt).toISOString().slice(11, 19)}</span>
              <StatusBadge status={j.status} />
              <span className="text-zinc-300 truncate">{j.queue?.name} → {j.name}</span>
              <span className="ml-auto text-zinc-500">{relTime(j.createdAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
