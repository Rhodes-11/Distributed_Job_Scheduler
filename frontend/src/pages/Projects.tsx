import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProjectsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data) });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const create = useMutation({
    mutationFn: () => api.post('/projects', { name, description: desc }),
    onSuccess: () => { toast.success('Project created'); qc.invalidateQueries({ queryKey: ['projects'] }); setOpen(false); setName(''); setDesc(''); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6" data-testid="projects-page">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Projects</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Your Projects</h1>
          <p className="text-sm text-muted-foreground mt-2">Group related queues and workers by domain.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-project-btn"><Plus className="h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="project-name-input" placeholder="e.g. Notifications" /></div>
              <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="project-desc-input" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!name || create.isPending} data-testid="project-create-submit">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-40 animate-pulse bg-muted/30" />)}
        </div>
      ) : (data?.projects?.length || 0) === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <div className="font-heading text-lg font-medium">No projects yet</div>
          <p className="text-sm text-muted-foreground mt-1">Create your first project to organize queues.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.map((p: any) => (
            <Link key={p.id} to={`/queues?projectId=${p.id}`} data-testid={`project-card-${p.id}`}>
              <Card className="card-hover p-5 h-full">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md border border-border" style={{ background: `${p.color}20`, color: p.color }}>
                      <div className="h-full w-full grid place-items-center"><FolderKanban className="h-4 w-4" /></div>
                    </div>
                    <div>
                      <div className="font-heading text-base font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p._count.queues} queues</div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.description || '—'}</p>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div><div className="font-mono text-sm">{p.stats.total}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Run</div><div className="font-mono text-sm text-blue-500">{p.stats.running}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Done</div><div className="font-mono text-sm text-emerald-500">{p.stats.completed}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fail</div><div className="font-mono text-sm text-red-500">{p.stats.failed}</div></div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
