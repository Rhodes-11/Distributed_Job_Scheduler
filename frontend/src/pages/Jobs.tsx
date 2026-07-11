import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Search, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { formatDuration, relTime } from '@/lib/utils';

export const JobsPage = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data: queues } = useQuery({ queryKey: ['queues-simple'], queryFn: () => api.get('/queues').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, search, status],
    queryFn: () => api.get('/jobs', { params: { page, limit: 20, search: search || undefined, status: status === 'all' ? undefined : status } }).then((r) => r.data),
    refetchInterval: 3000,
  });
  const [open, setOpen] = useState(false);
  const [jobName, setJobName] = useState('');
  const [jobQueue, setJobQueue] = useState('');
  const [jobType, setJobType] = useState('immediate');
  const [payload, setPayload] = useState('{"orderId": 123}');
  const [delayMs, setDelayMs] = useState(0);
  const [cron, setCron] = useState('*/5 * * * *');

  const create = useMutation({
    mutationFn: () => {
      let parsed: any = {};
      try { parsed = JSON.parse(payload); } catch { throw new Error('Invalid JSON payload'); }
      return api.post('/jobs', { queueId: jobQueue, name: jobName, type: jobType, payload: parsed, delayMs: jobType === 'delayed' ? delayMs : undefined, cron: jobType === 'recurring' ? cron : undefined });
    },
    onSuccess: () => { toast.success('Job enqueued'); qc.invalidateQueries({ queryKey: ['jobs'] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message || e.response?.data?.message || 'Failed'),
  });

  const items = data?.items || [];

  return (
    <div className="space-y-6" data-testid="jobs-page">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Jobs</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">All Jobs</h1>
          <p className="text-sm text-muted-foreground mt-2">Immediate, delayed, scheduled, and recurring jobs.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-job-btn"><Plus className="h-4 w-4" /> Enqueue Job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enqueue a job</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={jobName} onChange={(e) => setJobName(e.target.value)} data-testid="job-name-input" placeholder="send-email" /></div>
              <div><Label>Queue</Label>
                <Select value={jobQueue} onValueChange={setJobQueue}>
                  <SelectTrigger data-testid="job-queue-select"><SelectValue placeholder="Select queue" /></SelectTrigger>
                  <SelectContent>{(queues?.queues || []).map((q: any) => (<SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="recurring">Recurring (cron)</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {jobType === 'delayed' && <div><Label>Delay (ms)</Label><Input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} /></div>}
              {jobType === 'recurring' && <div><Label>Cron</Label><Input value={cron} onChange={(e) => setCron(e.target.value)} /></div>}
              <div><Label>Payload (JSON)</Label><textarea className="w-full h-24 rounded-md border border-border bg-transparent p-2 font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} data-testid="job-payload-input" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!jobName || !jobQueue} data-testid="job-create-submit">Enqueue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search jobs by name…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="pl-9" data-testid="jobs-search-input" />
          </div>
          <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
            <SelectTrigger className="w-40" data-testid="jobs-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'delayed', 'dead'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 border-b border-border">
            <tr className="text-left">
              {['Name', 'Queue', 'Status', 'Attempts', 'Duration', 'Enqueued', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center"><ListChecks className="mx-auto h-8 w-8 text-muted-foreground mb-2" /><div className="text-sm text-muted-foreground">No jobs found</div></td></tr>
            ) : items.map((j: any) => {
              const dur = j.startedAt && j.finishedAt ? new Date(j.finishedAt).getTime() - new Date(j.startedAt).getTime() : null;
              return (
                <tr key={j.id} className="border-b border-border hover:bg-secondary/30 transition-colors" data-testid={`job-row-${j.id}`}>
                  <td className="px-4 py-2.5"><Link to={`/jobs/${j.id}`} className="font-medium hover:text-primary">{j.name}</Link></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{j.queue?.name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={j.status} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs">{j.attempts}/{j.maxAttempts}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{formatDuration(dur)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{relTime(j.createdAt)}</td>
                  <td className="px-4 py-2.5"><Link to={`/jobs/${j.id}`}><Button size="sm" variant="ghost">Details</Button></Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages} · {data.total} total</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
