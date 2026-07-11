import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, FolderKanban, ListChecks, Cpu, Boxes, LineChart, Skull, Terminal, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export const CommandPalette = ({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) => {
  const nav = useNavigate();
  const { toggle } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const go = (path: string) => { setOpen(false); nav(path); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()} data-testid="command-palette">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b border-border px-3">
            <span className="mr-2 text-muted-foreground">⌘</span>
            <Command.Input placeholder="Type a command or search…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="cmd-input" />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="p-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
            <Command.Group heading="Navigate">
              {[
                { i: LayoutDashboard, l: 'Dashboard', p: '/dashboard' },
                { i: FolderKanban, l: 'Projects', p: '/projects' },
                { i: Boxes, l: 'Queues', p: '/queues' },
                { i: ListChecks, l: 'Jobs', p: '/jobs' },
                { i: Cpu, l: 'Workers', p: '/workers' },
                { i: LineChart, l: 'Analytics', p: '/analytics' },
                { i: Terminal, l: 'Execution Logs', p: '/logs' },
                { i: Skull, l: 'Dead Letter', p: '/dlq' },
                { i: Settings, l: 'Settings', p: '/settings' },
              ].map((n) => (
                <Command.Item key={n.p} onSelect={() => go(n.p)} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary">
                  <n.i className="h-4 w-4" /> {n.l}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Preferences">
              <Command.Item onSelect={() => { toggle(); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary">
                <Sun className="h-4 w-4" /> Toggle theme
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
