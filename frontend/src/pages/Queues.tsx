import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pause, Play, Plus, Trash2, Boxes } from 'lucide-react';

export const QueuesPage = () => {
  const [params] = useSearchParams();
  const projectId = params.get('projectId') || undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['queues', projectId], queryFn: () => api.get('/queues', { params: { projectId } }).then((r) => r.data), refetchInterval: 5000 });
  const { data: projects } = useQuery({ queryKey: ['projects-list'], queryFn: () => api.get('/projects').then((r) => r.data) });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  const [concurrency, setConcurrency] = useState(5);
  const [priority, setPriority] = useState(0);

  const create = useMutation({
    mutationFn: () => api.post('/queues', { projectId: pid, name, concurrency, priority }),
    onSuccess: () => { toast.success('Queue created'); qc.invalidateQueries({ queryKey: ['queues'] }); setOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const pauseM = useMutation({ mutationFn: (id: string) => api.post(`/queues/${id}/pause`), onSuccess: () => qc.invalidateQueries({ queryKey: ['queues'] }) });
  const resumeM = useMutation({ mutationFn: (id: string) => api.post(`/queues/${id}/resume`), onSuccess: () => qc.invalidateQueries({ queryKey: ['queues'] }) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/queues/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['queues'] }); toast.success('Queue deleted'); } });

  const queues = data?.queues || [];

  return (
    <div className="space-y-6" data-testid="queues-page">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Queues</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Job Queues</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage concurrency, priority and retry policy per queue.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-queue-btn"><Plus className="h-4 w-4" /> New Queue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Queue</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Project</Label>
                <Select value={pid} onValueChange={setPid}>
                  <SelectTrigger data-testid="queue-project-select"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{(projects?.projects || []).map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="queue-name-input" placeholder="e.g. high-priority" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Concurrency</Label><Input type="number" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} min={1} max={100} /></div>
                <div><Label>Priority</Label><Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!name || !pid} data-testid="queue-create-submit">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {queues.length === 0 ? (
        <Card className="p-10 text-center border-dashed"><Boxes className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><div className="font-heading text-lg font-medium">No queues yet</div></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queues.map((q: any) => (
            <Card key={q.id} data-testid={`queue-card-${q.id}`} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: q.project?.color }} />
                    <div className="text-xs text-muted-foreground">{q.project?.name}</div>
                  </div>
                  <div className="mt-1 font-heading text-lg font-medium">{q.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>concurrency {q.concurrency}</span> · <span>priority {q.priority}</span> · <span>retries {q.maxAttempts}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {q.isPaused ? (
                    <Button size="icon" variant="ghost" onClick={() => resumeM.mutate(q.id)} data-testid={`resume-${q.id}`}><Play className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => pauseM.mutate(q.id)} data-testid={`pause-${q.id}`}><Pause className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(q.id)} data-testid={`delete-${q.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-1 rounded-md border border-border p-2 text-center">
                {[
                  { l: 'Pnd', v: q.stats.pending, c: 'text-zinc-400' },
                  { l: 'Qd', v: q.stats.queued, c: 'text-violet-500' },
                  { l: 'Run', v: q.stats.running, c: 'text-blue-500' },
                  { l: 'Ok', v: q.stats.completed, c: 'text-emerald-500' },
                  { l: 'Fail', v: q.stats.failed, c: 'text-red-500' },
                  { l: 'DLQ', v: q.stats.dead, c: 'text-red-600' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                    <div className={`font-mono text-sm ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
              {q.isPaused && <div className="mt-3 inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-500">Paused</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
