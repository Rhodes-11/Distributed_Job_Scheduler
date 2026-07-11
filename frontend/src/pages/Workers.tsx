import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Cpu, HardDrive, Activity, Zap } from 'lucide-react';
import { relTime } from '@/lib/utils';

export const WorkersPage = () => {
  const { data } = useQuery({ queryKey: ['workers'], queryFn: () => api.get('/workers').then((r) => r.data), refetchInterval: 3000 });
  const workers = data?.workers || [];
  return (
    <div className="space-y-6" data-testid="workers-page">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workers</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Compute Fleet</h1>
        <p className="text-sm text-muted-foreground mt-2">Live worker heartbeat, resource utilization and health.</p>
      </div>
      {workers.length === 0 ? (
        <Card className="p-10 text-center border-dashed"><Cpu className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><div className="font-heading text-lg font-medium">No workers registered yet</div></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((w: any) => (
            <Card key={w.id} data-testid={`worker-card-${w.id}`} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex h-2 w-2 rounded-full ${w.health === 'healthy' ? 'bg-emerald-500 animate-pulse-dot' : w.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{w.status}</span>
                  </div>
                  <div className="mt-1 font-heading text-base font-medium truncate">{w.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{w.hostname} · pid {w.pid}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Concurrency</div>
                  <div className="font-mono text-sm">{w.concurrency}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-border p-3">
                <div className="text-center"><Cpu className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-1" /><div className="font-mono text-sm">{w.latestHeartbeat?.cpuPct?.toFixed(0) || 0}%</div><div className="text-[10px] text-muted-foreground">cpu</div></div>
                <div className="text-center"><HardDrive className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-1" /><div className="font-mono text-sm">{w.latestHeartbeat?.memMb?.toFixed(0) || 0}</div><div className="text-[10px] text-muted-foreground">mb</div></div>
                <div className="text-center"><Activity className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-1" /><div className="font-mono text-sm">{w.latestHeartbeat?.activeJobs || 0}</div><div className="text-[10px] text-muted-foreground">active</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{w._count?.executions || 0} runs</span>
                <span>heartbeat {relTime(w.lastHeartbeatAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
