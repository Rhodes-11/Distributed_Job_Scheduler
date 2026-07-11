import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronLeft, RefreshCw, Ban, Cpu, Clock, Layers, ExternalLink } from 'lucide-react';
import { formatDuration, relTime } from '@/lib/utils';

export const JobDetailPage = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.get(`/jobs/${id}`).then((r) => r.data),
    refetchInterval: 2000,
    enabled: !!id,
  });
  const retry = useMutation({ mutationFn: () => api.post(`/jobs/${id}/retry`), onSuccess: () => { toast.success('Retry queued'); qc.invalidateQueries({ queryKey: ['job', id] }); } });
  const cancel = useMutation({ mutationFn: () => api.post(`/jobs/${id}/cancel`), onSuccess: () => { toast.success('Cancelled'); qc.invalidateQueries({ queryKey: ['job', id] }); } });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading job…</div>;
  const j = data.job;
  const duration = j.startedAt && j.finishedAt ? new Date(j.finishedAt).getTime() - new Date(j.startedAt).getTime() : null;

  return (
    <div className="space-y-6" data-testid="job-detail-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/jobs" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" /> Back to jobs</Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-3xl font-medium tracking-tight">{j.name}</h1>
            <StatusBadge status={j.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-2 font-mono">{j.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => retry.mutate()} data-testid="job-retry-btn"><RefreshCw className="h-4 w-4" /> Retry</Button>
          <Button variant="outline" onClick={() => cancel.mutate()} data-testid="job-cancel-btn"><Ban className="h-4 w-4" /> Cancel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 p-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payload</div>
          <pre className="bg-[#0A0A0A] text-zinc-300 rounded-md p-4 font-mono text-xs overflow-auto max-h-64 border border-border">{JSON.stringify(j.payload, null, 2)}</pre>
          {j.result && (<>
            <div className="mb-3 mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Result</div>
            <pre className="bg-[#0A0A0A] text-emerald-300 rounded-md p-4 font-mono text-xs overflow-auto max-h-40 border border-border">{JSON.stringify(j.result, null, 2)}</pre>
          </>)}
          {j.error && (<>
            <div className="mb-3 mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Error</div>
            <pre className="bg-[#0A0A0A] text-red-400 rounded-md p-4 font-mono text-xs border border-border whitespace-pre-wrap">{j.error}</pre>
          </>)}
          <div className="mb-3 mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Execution logs</div>
          <div className="bg-[#0A0A0A] rounded-md p-4 max-h-72 overflow-auto border border-border">
            {(j.logs || []).length === 0 ? <div className="text-xs text-muted-foreground">No logs yet…</div> : j.logs.map((l: any) => (
              <div key={l.id} className="font-mono text-[11px] leading-relaxed flex gap-2">
                <span className="text-zinc-500">{new Date(l.createdAt).toISOString().slice(11, 23)}</span>
                <span className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-400' : 'text-emerald-400'}>[{l.level}]</span>
                <span className="text-zinc-300">{l.message}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Metadata</div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>{j.type}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Priority</dt><dd className="font-mono">{j.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Attempts</dt><dd className="font-mono">{j.attempts}/{j.maxAttempts}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-mono">{formatDuration(duration)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Run at</dt><dd className="text-xs">{relTime(j.runAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Started</dt><dd className="text-xs">{relTime(j.startedAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Finished</dt><dd className="text-xs">{relTime(j.finishedAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Queue</dt><dd className="text-xs">{j.queue?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Worker</dt><dd className="text-xs font-mono">{j.worker?.name || '—'}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Retry history</div>
            {(j.executions || []).length === 0 ? (
              <div className="text-xs text-muted-foreground">No executions yet.</div>
            ) : (
              <ul className="space-y-2">
                {j.executions.map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                    <span className="flex items-center gap-2"><Layers className="h-3 w-3 text-muted-foreground" /> Attempt {e.attempt}</span>
                    <StatusBadge status={e.status} />
                    <span className="font-mono text-muted-foreground">{formatDuration(e.durationMs)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
