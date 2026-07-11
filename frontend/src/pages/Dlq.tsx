import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, RefreshCw, Trash2 } from 'lucide-react';
import { relTime } from '@/lib/utils';

export const DlqPage = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['dlq'], queryFn: () => api.get('/dlq').then((r) => r.data), refetchInterval: 5000 });
  const requeue = useMutation({ mutationFn: (id: string) => api.post(`/dlq/${id}/requeue`), onSuccess: () => { toast.success('Requeued'); qc.invalidateQueries({ queryKey: ['dlq'] }); } });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/dlq/${id}`), onSuccess: () => { toast.success('Purged'); qc.invalidateQueries({ queryKey: ['dlq'] }); } });
  const items = data?.items || [];
  return (
    <div className="space-y-6" data-testid="dlq-page">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dead Letter</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">DLQ Inspector</h1>
        <p className="text-sm text-muted-foreground mt-2">Investigate and recover jobs that exceeded max attempts.</p>
      </div>
      {items.length === 0 ? (
        <Card className="p-10 text-center border-dashed"><Skull className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><div className="font-heading text-lg font-medium">The DLQ is clean</div><p className="text-sm text-muted-foreground mt-1">Nothing to recover — great job.</p></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((d: any) => (
            <Card key={d.id} data-testid={`dlq-card-${d.id}`} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">Dead</span>
                    <span className="text-xs text-muted-foreground">{d.job?.queue?.project?.name} · {d.job?.queue?.name}</span>
                  </div>
                  <div className="font-heading text-base font-medium">{d.job?.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Failed after {d.attempts} attempts · {relTime(d.createdAt)}</div>
                  <pre className="mt-2 rounded-md bg-[#0A0A0A] border border-border p-2 font-mono text-[11px] text-red-400 max-w-2xl truncate">{d.error}</pre>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => requeue.mutate(d.id)} data-testid={`dlq-requeue-${d.id}`}><RefreshCw className="h-4 w-4" /> Requeue</Button>
                  <Button variant="ghost" onClick={() => del.mutate(d.id)} data-testid={`dlq-delete-${d.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
